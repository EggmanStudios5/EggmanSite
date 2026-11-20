using Microsoft.EntityFrameworkCore;

namespace Eggman.IoT.Bridge.Data;

public sealed class TelemetryRecordEntity
{
    public long Id { get; set; }
    public string DeviceId { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public double TemperatureCelsius { get; set; }
    public double HumidityPercent { get; set; }
    public int FanPwmPercent { get; set; }
    public DateTimeOffset ObservedAtUtc { get; set; }
}

public sealed class RfidBadgePolicyEntity
{
    public long Id { get; set; }
    public string DoorId { get; set; } = string.Empty;
    public string TokenHashSha256 { get; set; } = string.Empty;
    public bool Active { get; set; } = true;
}

public sealed class RfidAccessLogEntity
{
    public long Id { get; set; }
    public string NodeId { get; set; } = string.Empty;
    public string DoorId { get; set; } = string.Empty;
    public string TokenHashSha256 { get; set; } = string.Empty;
    public bool Granted { get; set; }
    public DateTimeOffset OccurredAtUtc { get; set; }
}

public sealed class IoTBridgeDbContext(DbContextOptions<IoTBridgeDbContext> options) : DbContext(options)
{
    public DbSet<TelemetryRecordEntity> TelemetryRecords => Set<TelemetryRecordEntity>();
    public DbSet<RfidBadgePolicyEntity> RfidBadgePolicies => Set<RfidBadgePolicyEntity>();
    public DbSet<RfidAccessLogEntity> RfidAccessLogs => Set<RfidAccessLogEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<TelemetryRecordEntity>(entity =>
        {
            entity.ToTable("iot_telemetry_records");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.DeviceId).HasMaxLength(64).IsRequired();
            entity.Property(e => e.Location).HasMaxLength(120).IsRequired();
        });

        modelBuilder.Entity<RfidBadgePolicyEntity>(entity =>
        {
            entity.ToTable("rfid_badge_policies");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.DoorId, e.TokenHashSha256 }).IsUnique();
            entity.Property(e => e.DoorId).HasMaxLength(64).IsRequired();
            entity.Property(e => e.TokenHashSha256).HasMaxLength(64).IsRequired();
        });

        modelBuilder.Entity<RfidAccessLogEntity>(entity =>
        {
            entity.ToTable("rfid_access_logs");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.NodeId).HasMaxLength(64).IsRequired();
            entity.Property(e => e.DoorId).HasMaxLength(64).IsRequired();
            entity.Property(e => e.TokenHashSha256).HasMaxLength(64).IsRequired();
        });
    }
}
