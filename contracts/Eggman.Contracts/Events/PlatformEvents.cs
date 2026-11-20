using System.ComponentModel.DataAnnotations;

namespace Eggman.Contracts.Events;

public sealed record IoTTelemetryEvent(
    [property: Required, StringLength(64, MinimumLength = 2)] string DeviceId,
    [property: Required, StringLength(120, MinimumLength = 2)] string Location,
    [property: Range(-40.0, 125.0)] double TemperatureCelsius,
    [property: Range(0.0, 100.0)] double HumidityPercent,
    [property: Range(0, 100)] int FanPwmPercent,
    DateTimeOffset ObservedAtUtc);

public sealed record RackThermalAlert(
    [property: Required, StringLength(64, MinimumLength = 2)] string DeviceId,
    [property: Range(-40.0, 125.0)] double TemperatureCelsius,
    [property: Range(-40.0, 125.0)] double ThresholdCelsius,
    [property: Required, RegularExpression("^(WARN|CRITICAL)$")] string Severity,
    DateTimeOffset TriggeredAtUtc);

public sealed record RfidAccessEvent(
    [property: Required, StringLength(64, MinimumLength = 2)] string NodeId,
    [property: Required, StringLength(64, MinimumLength = 2)] string DoorId,
    [property: Required, RegularExpression("^[a-fA-F0-9]{64}$")] string TokenHashSha256,
    bool Granted,
    DateTimeOffset OccurredAtUtc);

public sealed record ReleasePublishedEvent(
    [property: Required, StringLength(160, MinimumLength = 3)] string ArtifactId,
    [property: Required, RegularExpression("^(ipa|firmware|games)$")] string Channel,
    [property: Required, StringLength(32, MinimumLength = 1)] string Version,
    [property: Required, RegularExpression("^[a-fA-F0-9]{64}$")] string Sha256,
    DateTimeOffset PublishedAtUtc);

public sealed record SecurityAuditEvent(
    [property: Required, StringLength(64, MinimumLength = 2)] string SourceService,
    [property: Required, StringLength(64, MinimumLength = 2)] string EventType,
    [property: Required, StringLength(128, MinimumLength = 1)] string ActorId,
    [property: Required, StringLength(64, MinimumLength = 1)] string Outcome,
    DateTimeOffset OccurredAtUtc);
