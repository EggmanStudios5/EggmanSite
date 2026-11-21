using Microsoft.EntityFrameworkCore;

namespace Eggman.ReleaseHub.Data;

public sealed class ReleaseArtifactEntity
{
    public long Id { get; set; }
    public string Kind { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Platform { get; set; } = "Cross-Platform";
    public string Version { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string Sha256 { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTimeOffset ReleasedAtUtc { get; set; }
}

public sealed class UploadSessionEntity
{
    public Guid Id { get; set; }
    public string AppSlug { get; set; } = string.Empty;
    public string Kind { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public long TotalSizeBytes { get; set; }
    public int TotalChunks { get; set; }
    public string ExpectedSha256 { get; set; } = string.Empty;
    public string Status { get; set; } = "InProgress";
    public string CreatedBySub { get; set; } = string.Empty;
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset ExpiresAtUtc { get; set; }
    public DateTimeOffset? CompletedAtUtc { get; set; }
    public List<UploadChunkEntity> Chunks { get; set; } = [];
}

public sealed class UploadChunkEntity
{
    public long Id { get; set; }
    public Guid UploadSessionId { get; set; }
    public int ChunkIndex { get; set; }
    public long SizeBytes { get; set; }
    public string Sha256 { get; set; } = string.Empty;
    public DateTimeOffset ReceivedAtUtc { get; set; }
}

public sealed class ReleaseHubDbContext(DbContextOptions<ReleaseHubDbContext> options) : DbContext(options)
{
    public DbSet<ReleaseArtifactEntity> ReleaseArtifacts => Set<ReleaseArtifactEntity>();
    public DbSet<UploadSessionEntity> UploadSessions => Set<UploadSessionEntity>();
    public DbSet<UploadChunkEntity> UploadChunks => Set<UploadChunkEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ReleaseArtifactEntity>(entity =>
        {
            entity.ToTable("release_artifacts");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.Kind, e.FileName }).IsUnique();
            entity.Property(e => e.Kind).HasMaxLength(16).IsRequired();
            entity.Property(e => e.Slug).HasMaxLength(64).IsRequired();
            entity.Property(e => e.Platform).HasMaxLength(32).IsRequired().HasDefaultValue("Cross-Platform");
            entity.Property(e => e.Version).HasMaxLength(32).IsRequired();
            entity.Property(e => e.FileName).HasMaxLength(128).IsRequired();
            entity.Property(e => e.Sha256).HasMaxLength(64).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(500).IsRequired();
        });

        modelBuilder.Entity<UploadSessionEntity>(entity =>
        {
            entity.ToTable("upload_sessions");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.Status, e.ExpiresAtUtc });
            entity.Property(e => e.AppSlug).HasMaxLength(64).IsRequired();
            entity.Property(e => e.Kind).HasMaxLength(16).IsRequired();
            entity.Property(e => e.Platform).HasMaxLength(32).IsRequired();
            entity.Property(e => e.Version).HasMaxLength(32).IsRequired();
            entity.Property(e => e.FileName).HasMaxLength(128).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(500).IsRequired();
            entity.Property(e => e.ExpectedSha256).HasMaxLength(64).IsRequired();
            entity.Property(e => e.Status).HasMaxLength(16).IsRequired();
            entity.Property(e => e.CreatedBySub).HasMaxLength(128).IsRequired();
            entity.HasMany(e => e.Chunks)
                .WithOne()
                .HasForeignKey(c => c.UploadSessionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UploadChunkEntity>(entity =>
        {
            entity.ToTable("upload_chunks");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.UploadSessionId, e.ChunkIndex }).IsUnique();
            entity.Property(e => e.Sha256).HasMaxLength(64).IsRequired();
        });
    }
}
