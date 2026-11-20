using Microsoft.EntityFrameworkCore;

namespace Eggman.ReleaseHub.Data;

public sealed class ReleaseArtifactEntity
{
    public long Id { get; set; }
    public string Kind { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string Sha256 { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTimeOffset ReleasedAtUtc { get; set; }
}

public sealed class ReleaseHubDbContext(DbContextOptions<ReleaseHubDbContext> options) : DbContext(options)
{
    public DbSet<ReleaseArtifactEntity> ReleaseArtifacts => Set<ReleaseArtifactEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ReleaseArtifactEntity>(entity =>
        {
            entity.ToTable("release_artifacts");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.Kind, e.FileName }).IsUnique();
            entity.Property(e => e.Kind).HasMaxLength(16).IsRequired();
            entity.Property(e => e.Slug).HasMaxLength(64).IsRequired();
            entity.Property(e => e.Version).HasMaxLength(32).IsRequired();
            entity.Property(e => e.FileName).HasMaxLength(128).IsRequired();
            entity.Property(e => e.Sha256).HasMaxLength(64).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(500).IsRequired();
        });
    }
}
