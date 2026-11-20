using System.ComponentModel.DataAnnotations;

namespace Eggman.Contracts.IoT;

public sealed record SensorReadingDto(
    [property: Required, RegularExpression("^[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}$")] string DeviceId,
    [property: Required, StringLength(120, MinimumLength = 2)] string Location,
    [property: Range(-40.0, 125.0)] double TemperatureCelsius,
    [property: Range(0.0, 100.0)] double HumidityPercent,
    [property: Range(0, 100)] int FanPwmPercent,
    DateTimeOffset ObservedAtUtc);

public sealed record RackAirflowCommand(
    [property: Required, RegularExpression("^[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}$")] string DeviceId,
    [property: Range(0, 100)] int TargetFanPwmPercent,
    [property: Required, StringLength(200, MinimumLength = 2)] string Reason,
    DateTimeOffset IssuedAtUtc);

public sealed record DeviceHeartbeatDto(
    [property: Required, RegularExpression("^[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}$")] string DeviceId,
    [property: Required, StringLength(32, MinimumLength = 1)] string FirmwareVersion,
    [property: Range(0, long.MaxValue)] long UptimeSeconds,
    DateTimeOffset SeenAtUtc);

public sealed record RfidVerifyRequest(
    [property: Required, RegularExpression("^[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}$")] string NodeId,
    [property: Required, RegularExpression("^[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}$")] string DoorId,
    [property: Required, RegularExpression("^[a-fA-F0-9]{64}$")] string CardUidHashSha256,
    DateTimeOffset ScannedAtUtc);

public sealed record RfidVerifyResponse(
    bool Granted,
    int UnlockDurationMs,
    string Reason);
