using System.Collections.Concurrent;
using Eggman.Contracts.Events;
using Eggman.Contracts.IoT;
using Eggman.IoT.Bridge.Data;
using Eggman.ServiceDefaults.Messaging;
using Microsoft.EntityFrameworkCore;

namespace Eggman.IoT.Bridge.Services;

public sealed class IoTTelemetryService
{
    private readonly TlsRabbitMqPublisher _publisher;
    private readonly IDbContextFactory<IoTBridgeDbContext> _dbFactory;
    private readonly double _thermalThreshold;
    private readonly ConcurrentDictionary<string, SensorReadingDto> _latestReadings = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<string, int> _targetPwmByDevice = new(StringComparer.Ordinal);

    public IoTTelemetryService(
        TlsRabbitMqPublisher publisher,
        IDbContextFactory<IoTBridgeDbContext> dbFactory,
        IConfiguration config)
    {
        _publisher = publisher;
        _dbFactory = dbFactory;
        _thermalThreshold = double.TryParse(config["IoT:ThermalAlertThresholdCelsius"], out var t) ? t : 42.0;
    }

    public async Task IngestTelemetryAsync(SensorReadingDto reading, CancellationToken ct)
    {
        _latestReadings[reading.DeviceId] = reading;

        await using (var db = await _dbFactory.CreateDbContextAsync(ct))
        {
            db.TelemetryRecords.Add(new TelemetryRecordEntity
            {
                DeviceId = reading.DeviceId,
                Location = reading.Location,
                TemperatureCelsius = reading.TemperatureCelsius,
                HumidityPercent = reading.HumidityPercent,
                FanPwmPercent = reading.FanPwmPercent,
                ObservedAtUtc = reading.ObservedAtUtc
            });
            await db.SaveChangesAsync(ct);
        }

        var telemetryEvent = new IoTTelemetryEvent(
            reading.DeviceId,
            reading.Location,
            reading.TemperatureCelsius,
            reading.HumidityPercent,
            reading.FanPwmPercent,
            reading.ObservedAtUtc);

        await _publisher.PublishAsync(
            exchange: "eggman.iot.events",
            routingKey: $"iot.telemetry.{reading.DeviceId}",
            payload: telemetryEvent,
            vaultSecretPath: "secret/data/private/iot-bridge/rabbitmq",
            ct: ct);

        if (reading.TemperatureCelsius >= _thermalThreshold)
        {
            var alert = new RackThermalAlert(
                reading.DeviceId,
                reading.TemperatureCelsius,
                _thermalThreshold,
                "CRITICAL",
                DateTimeOffset.UtcNow);

            await _publisher.PublishAsync(
                exchange: "eggman.iot.events",
                routingKey: "iot.alert.thermal",
                payload: alert,
                vaultSecretPath: "secret/data/private/iot-bridge/rabbitmq",
                ct: ct);
        }
    }

    public async Task<RfidVerifyResponse> VerifyRfidAsync(RfidVerifyRequest req, CancellationToken ct)
    {
        var normalizedHash = req.CardUidHashSha256.ToLowerInvariant();
        bool granted;

        await using (var db = await _dbFactory.CreateDbContextAsync(ct))
        {
            granted = await db.RfidBadgePolicies
                .AsNoTracking()
                .AnyAsync(p => p.DoorId == req.DoorId && p.TokenHashSha256 == normalizedHash && p.Active, ct);

            db.RfidAccessLogs.Add(new RfidAccessLogEntity
            {
                NodeId = req.NodeId,
                DoorId = req.DoorId,
                TokenHashSha256 = normalizedHash,
                Granted = granted,
                OccurredAtUtc = DateTimeOffset.UtcNow
            });
            await db.SaveChangesAsync(ct);
        }

        await _publisher.PublishAsync(
            exchange: "eggman.iot.events",
            routingKey: "iot.rfid.access",
            payload: new RfidAccessEvent(req.NodeId, req.DoorId, normalizedHash, granted, DateTimeOffset.UtcNow),
            vaultSecretPath: "secret/data/private/iot-bridge/rabbitmq",
            ct: ct);

        return granted
            ? new RfidVerifyResponse(true, 3000, "Authorized")
            : new RfidVerifyResponse(false, 0, "Denied");
    }

    public async Task SetRackAirflowAsync(RackAirflowCommand cmd, CancellationToken ct)
    {
        var clampedPwm = Math.Clamp(cmd.TargetFanPwmPercent, 0, 100);
        var sanitized = cmd with { TargetFanPwmPercent = clampedPwm };
        _targetPwmByDevice[sanitized.DeviceId] = clampedPwm;

        await _publisher.PublishAsync(
            exchange: "eggman.iot.commands",
            routingKey: $"iot.command.airflow.{sanitized.DeviceId}",
            payload: sanitized,
            vaultSecretPath: "secret/data/private/iot-bridge/rabbitmq",
            ct: ct);
    }

    public IReadOnlyDictionary<string, SensorReadingDto> GetLatestReadings() => _latestReadings;
}
