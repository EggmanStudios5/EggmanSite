using System.Collections.Concurrent;
using System.Security.Cryptography;
using Eggman.Contracts.Events;
using Eggman.Contracts.Releases;
using Eggman.ReleaseHub.Data;
using Eggman.ServiceDefaults.Messaging;
using Microsoft.EntityFrameworkCore;

namespace Eggman.ReleaseHub.Services;

public sealed record ChunkedUploadOpResult(int StatusCode, object Payload);

public sealed class ChunkedUploadService
{
    private const int StreamBufferSize = 81920;

    private readonly IDbContextFactory<ReleaseHubDbContext> _dbFactory;
    private readonly ArtifactCatalogService _catalog;
    private readonly TlsRabbitMqPublisher _publisher;
    private readonly ILogger<ChunkedUploadService> _logger;
    private readonly IConfiguration _config;
    private readonly string _stagingRoot;
    private readonly ConcurrentDictionary<Guid, SemaphoreSlim> _sessionLocks = new();

    public ChunkedUploadService(
        IConfiguration config,
        IDbContextFactory<ReleaseHubDbContext> dbFactory,
        ArtifactCatalogService catalog,
        TlsRabbitMqPublisher publisher,
        ILogger<ChunkedUploadService> logger)
    {
        _config = config;
        _dbFactory = dbFactory;
        _catalog = catalog;
        _publisher = publisher;
        _logger = logger;

        var storageRoot = Path.GetFullPath(config["ReleaseHub:StorageRoot"] ?? "/var/lib/eggman/releases");
        _stagingRoot = Path.GetFullPath(config["ReleaseHub:StagingRoot"] ?? Path.Combine(storageRoot, ".staging"));
    }

    public long MaxChunkBytes => _config.GetValue<long?>("Security:MaxChunkBodyBytes") ?? 55L * 1024 * 1024;
    public TimeSpan SessionMaxAge => TimeSpan.FromHours(_config.GetValue<double?>("ReleaseHub:UploadSessionMaxAgeHours") ?? 2.0);
    public string StagingRoot => _stagingRoot;

    public async Task<ChunkedUploadOpResult> InitSessionAsync(
        InitChunkedUploadRequest req,
        string actorSub,
        CancellationToken ct)
    {
        var (kind, canonicalPlatform) = MapPlatformToKind(req.Platform);
        if (_catalog.ResolveArtifactPath(kind, req.FileName) is null)
        {
            return new ChunkedUploadOpResult(
                StatusCodes.Status400BadRequest,
                new { error = "Invalid release kind or unsafe filename." });
        }

        var now = DateTimeOffset.UtcNow;
        var sessionId = Guid.NewGuid();
        var sessionDir = ResolveSessionDirectory(sessionId);
        Directory.CreateDirectory(sessionDir);

        var description = string.IsNullOrWhiteSpace(req.Description)
            ? $"Verified {canonicalPlatform} release for {req.AppSlug} {req.Version}"
            : req.Description.Trim();

        var entity = new UploadSessionEntity
        {
            Id = sessionId,
            AppSlug = req.AppSlug,
            Kind = kind,
            Platform = canonicalPlatform,
            Version = req.Version,
            FileName = req.FileName,
            Description = description,
            TotalSizeBytes = req.TotalSizeBytes,
            TotalChunks = req.TotalChunks,
            ExpectedSha256 = req.ExpectedSha256.ToLowerInvariant(),
            Status = "InProgress",
            CreatedBySub = string.IsNullOrWhiteSpace(actorSub) ? "unknown" : actorSub,
            CreatedAtUtc = now,
            ExpiresAtUtc = now.Add(SessionMaxAge)
        };

        await using var db = await _dbFactory.CreateDbContextAsync(ct);
        db.UploadSessions.Add(entity);
        await db.SaveChangesAsync(ct);

        return new ChunkedUploadOpResult(
            StatusCodes.Status201Created,
            new InitChunkedUploadResponse(entity.Id, MaxChunkBytes, entity.TotalChunks, entity.ExpiresAtUtc));
    }

    public async Task<ChunkedUploadOpResult> StoreChunkAsync(
        Guid uploadId,
        int chunkIndex,
        Stream bodyStream,
        string actorSub,
        CancellationToken ct)
    {
        await using (var dbCheck = await _dbFactory.CreateDbContextAsync(ct))
        {
            var session = await dbCheck.UploadSessions
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == uploadId, ct);

            var preCheckError = ValidateSessionWritable(session, chunkIndex, actorSub, DateTimeOffset.UtcNow);
            if (preCheckError is not null)
            {
                return preCheckError;
            }
        }

        var sessionDir = ResolveSessionDirectory(uploadId);
        Directory.CreateDirectory(sessionDir);

        var tempPath = Path.Combine(sessionDir, $"chunk-{chunkIndex:D6}.{Guid.NewGuid():N}.tmp");
        var partPath = Path.Combine(sessionDir, $"chunk-{chunkIndex:D6}.part");
        long written = 0;
        string chunkSha256;

        try
        {
            var maxChunk = MaxChunkBytes;
            var buffer = new byte[StreamBufferSize];
            using var hasher = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);

            await using (var fs = new FileStream(
                tempPath,
                FileMode.CreateNew,
                FileAccess.Write,
                FileShare.None,
                StreamBufferSize,
                useAsync: true))
            {
                int read;
                while ((read = await bodyStream.ReadAsync(buffer, ct)) > 0)
                {
                    written += read;
                    if (written > maxChunk)
                    {
                        return new ChunkedUploadOpResult(
                            StatusCodes.Status413PayloadTooLarge,
                            new { error = $"Chunk exceeds maximum allowed size ({maxChunk} bytes)." });
                    }

                    await fs.WriteAsync(buffer.AsMemory(0, read), ct);
                    hasher.AppendData(buffer, 0, read);
                }
                await fs.FlushAsync(ct);
            }

            if (written == 0)
            {
                return new ChunkedUploadOpResult(
                    StatusCodes.Status400BadRequest,
                    new { error = "Chunk payload must not be empty." });
            }

            chunkSha256 = Convert.ToHexStringLower(hasher.GetHashAndReset());

            var sessionLock = _sessionLocks.GetOrAdd(uploadId, _ => new SemaphoreSlim(1, 1));
            await sessionLock.WaitAsync(ct);
            try
            {
                await using var db = await _dbFactory.CreateDbContextAsync(ct);
                var session = await db.UploadSessions
                    .Include(s => s.Chunks)
                    .FirstOrDefaultAsync(s => s.Id == uploadId, ct);

                var postCheckError = ValidateSessionWritable(session, chunkIndex, actorSub, DateTimeOffset.UtcNow);
                if (postCheckError is not null)
                {
                    return postCheckError;
                }

                var otherBytes = session!.Chunks
                    .Where(c => c.ChunkIndex != chunkIndex)
                    .Sum(c => c.SizeBytes);

                if (otherBytes + written > session.TotalSizeBytes)
                {
                    return new ChunkedUploadOpResult(
                        StatusCodes.Status400BadRequest,
                        new { error = "Uploaded chunk bytes exceed declared session TotalSizeBytes." });
                }

                File.Move(tempPath, partPath, overwrite: true);

                var existingChunk = session.Chunks.FirstOrDefault(c => c.ChunkIndex == chunkIndex);
                if (existingChunk is null)
                {
                    session.Chunks.Add(new UploadChunkEntity
                    {
                        UploadSessionId = uploadId,
                        ChunkIndex = chunkIndex,
                        SizeBytes = written,
                        Sha256 = chunkSha256,
                        ReceivedAtUtc = DateTimeOffset.UtcNow
                    });
                }
                else
                {
                    existingChunk.SizeBytes = written;
                    existingChunk.Sha256 = chunkSha256;
                    existingChunk.ReceivedAtUtc = DateTimeOffset.UtcNow;
                }

                await db.SaveChangesAsync(ct);

                return new ChunkedUploadOpResult(
                    StatusCodes.Status200OK,
                    new ChunkUploadResponse(
                        uploadId,
                        chunkIndex,
                        written,
                        chunkSha256,
                        session.Chunks.Count,
                        session.TotalChunks));
            }
            finally
            {
                sessionLock.Release();
            }
        }
        finally
        {
            DeleteFileIfExists(tempPath);
        }
    }

    public async Task<ChunkedUploadOpResult> CompleteSessionAsync(
        Guid uploadId,
        string actorSub,
        CancellationToken ct)
    {
        var sessionLock = _sessionLocks.GetOrAdd(uploadId, _ => new SemaphoreSlim(1, 1));
        await sessionLock.WaitAsync(ct);
        try
        {
            await using var db = await _dbFactory.CreateDbContextAsync(ct);
            var session = await db.UploadSessions
                .Include(s => s.Chunks)
                .FirstOrDefaultAsync(s => s.Id == uploadId, ct);

            if (session is null)
            {
                return new ChunkedUploadOpResult(
                    StatusCodes.Status404NotFound,
                    new { error = "Upload session not found." });
            }

            if (!string.Equals(session.CreatedBySub, actorSub, StringComparison.Ordinal))
            {
                return new ChunkedUploadOpResult(
                    StatusCodes.Status403Forbidden,
                    new { error = "Forbidden: upload session belongs to a different identity." });
            }

            if (session.Status != "InProgress")
            {
                return new ChunkedUploadOpResult(
                    StatusCodes.Status409Conflict,
                    new { error = $"Upload session is already in terminal state '{session.Status}'." });
            }

            if (DateTimeOffset.UtcNow > session.ExpiresAtUtc)
            {
                session.Status = "Expired";
                await db.SaveChangesAsync(ct);
                TryDeleteDirectory(ResolveSessionDirectory(uploadId));
                return new ChunkedUploadOpResult(
                    StatusCodes.Status410Gone,
                    new { error = "Upload session expired and staging data was purged." });
            }

            var sessionDir = ResolveSessionDirectory(uploadId);
            var recordedIndices = session.Chunks.Select(c => c.ChunkIndex).ToHashSet();
            var missing = Enumerable.Range(0, session.TotalChunks)
                .Where(idx => !recordedIndices.Contains(idx) || !File.Exists(Path.Combine(sessionDir, $"chunk-{idx:D6}.part")))
                .ToArray();

            if (missing.Length > 0)
            {
                return new ChunkedUploadOpResult(
                    StatusCodes.Status400BadRequest,
                    new { error = "Upload session is missing required chunks.", missingChunks = missing });
            }

            var finalArtifactPath = _catalog.ResolveArtifactPath(session.Kind, session.FileName);
            if (finalArtifactPath is null)
            {
                session.Status = "Failed";
                await db.SaveChangesAsync(ct);
                TryDeleteDirectory(sessionDir);
                return new ChunkedUploadOpResult(
                    StatusCodes.Status400BadRequest,
                    new { error = "Unsafe target artifact path rejected." });
            }

            var assembledTempPath = Path.Combine(sessionDir, $"assembled-{uploadId:N}.tmp");
            long totalAssembled = 0;
            byte[] actualHashBytes;

            try
            {
                var buffer = new byte[StreamBufferSize];
                using var hasher = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);

                await using (var outStream = new FileStream(
                    assembledTempPath,
                    FileMode.Create,
                    FileAccess.Write,
                    FileShare.None,
                    StreamBufferSize,
                    useAsync: true))
                {
                    for (int i = 0; i < session.TotalChunks; i++)
                    {
                        var partPath = Path.Combine(sessionDir, $"chunk-{i:D6}.part");
                        await using var partStream = new FileStream(
                            partPath,
                            FileMode.Open,
                            FileAccess.Read,
                            FileShare.Read,
                            StreamBufferSize,
                            useAsync: true);

                        int read;
                        while ((read = await partStream.ReadAsync(buffer, ct)) > 0)
                        {
                            await outStream.WriteAsync(buffer.AsMemory(0, read), ct);
                            hasher.AppendData(buffer, 0, read);
                            totalAssembled += read;
                        }
                    }

                    await outStream.FlushAsync(ct);
                }

                actualHashBytes = hasher.GetHashAndReset();
            }
            catch
            {
                DeleteFileIfExists(assembledTempPath);
                throw;
            }

            var actualSha256 = Convert.ToHexStringLower(actualHashBytes);
            var expectedHashBytes = Convert.FromHexString(session.ExpectedSha256);
            bool digestMatches = totalAssembled == session.TotalSizeBytes &&
                                 CryptographicOperations.FixedTimeEquals(actualHashBytes, expectedHashBytes);

            if (!digestMatches)
            {
                // Zero Trust integrity gate: immediately purge staging & assembled file on mismatch
                DeleteFileIfExists(assembledTempPath);
                TryDeleteDirectory(sessionDir);
                session.Status = "Failed";
                db.UploadChunks.RemoveRange(session.Chunks);
                await db.SaveChangesAsync(ct);

                _logger.LogWarning(
                    "Upload {UploadId} failed SHA-256 verification and was purged (expected={Expected}, actual={Actual}, bytes={ActualBytes}/{ExpectedBytes})",
                    session.Id, session.ExpectedSha256, actualSha256, totalAssembled, session.TotalSizeBytes);

                await _publisher.PublishAsync(
                    exchange: "eggman.public.events",
                    routingKey: "release.upload.hash_mismatch",
                    payload: new SecurityAuditEvent(
                        "Eggman.ReleaseHub",
                        "ReleaseUploadHashMismatch",
                        actorSub,
                        "RejectedHashMismatch",
                        DateTimeOffset.UtcNow),
                    vaultSecretPath: "secret/data/public/releasehub/rabbitmq",
                    ct: ct);

                return new ChunkedUploadOpResult(
                    StatusCodes.Status422UnprocessableEntity,
                    new
                    {
                        error = "Assembled artifact failed SHA-256 or byte-length integrity verification and was purged.",
                        expectedSha256 = session.ExpectedSha256,
                        actualSha256,
                        expectedBytes = session.TotalSizeBytes,
                        actualBytes = totalAssembled
                    });
            }

            Directory.CreateDirectory(Path.GetDirectoryName(finalArtifactPath)!);
            File.Move(assembledTempPath, finalArtifactPath, overwrite: true);
            TryDeleteDirectory(sessionDir);

            var artifact = await _catalog.RegisterReleaseAsync(
                new PublishReleaseRequest(
                    session.Kind,
                    session.AppSlug,
                    session.Version,
                    session.FileName,
                    actualSha256,
                    session.Description),
                session.Platform,
                totalAssembled,
                ct);

            session.Status = "Completed";
            session.CompletedAtUtc = DateTimeOffset.UtcNow;
            db.UploadChunks.RemoveRange(session.Chunks);
            await db.SaveChangesAsync(ct);

            await _publisher.PublishAsync(
                exchange: "eggman.public.events",
                routingKey: $"release.published.{artifact.Kind}",
                payload: new ReleasePublishedEvent(
                    ArtifactId: $"{artifact.Kind}/{artifact.FileName}",
                    Channel: artifact.Kind,
                    Version: artifact.Version,
                    Sha256: artifact.Sha256,
                    PublishedAtUtc: artifact.ReleasedAtUtc),
                vaultSecretPath: "secret/data/public/releasehub/rabbitmq",
                ct: ct);

            await _publisher.PublishAsync(
                exchange: "eggman.public.events",
                routingKey: "release.audit",
                payload: new SecurityAuditEvent(
                    "Eggman.ReleaseHub",
                    "ReleaseChunkedUploadCompleted",
                    actorSub,
                    "Success",
                    DateTimeOffset.UtcNow),
                vaultSecretPath: "secret/data/public/releasehub/rabbitmq",
                ct: ct);

            var downloadUrl = $"{_catalog.PublicBaseUrl}/api/v1/releases/{artifact.Kind}/{artifact.FileName}";
            return new ChunkedUploadOpResult(
                StatusCodes.Status201Created,
                new CompleteChunkedUploadResponse(
                    session.Id,
                    artifact.Kind,
                    artifact.Slug,
                    artifact.Version,
                    artifact.Platform,
                    artifact.FileName,
                    artifact.SizeBytes,
                    artifact.Sha256,
                    downloadUrl,
                    artifact.ReleasedAtUtc));
        }
        finally
        {
            sessionLock.Release();
            if (_sessionLocks.TryRemove(uploadId, out var removed))
            {
                removed.Dispose();
            }
        }
    }

    public async Task<int> PurgeExpiredSessionsAsync(CancellationToken ct = default, DateTimeOffset? utcNowOverride = null)
    {
        var now = utcNowOverride ?? DateTimeOffset.UtcNow;
        var cutoff = now - SessionMaxAge;
        int purged = 0;

        await using var db = await _dbFactory.CreateDbContextAsync(ct);
        var staleSessions = await db.UploadSessions
            .Include(s => s.Chunks)
            .Where(s => (s.Status == "InProgress" || s.Status == "Failed") &&
                        (s.ExpiresAtUtc <= now || s.CreatedAtUtc <= cutoff))
            .ToListAsync(ct);

        foreach (var session in staleSessions)
        {
            TryDeleteDirectory(ResolveSessionDirectory(session.Id));
            if (session.Status == "InProgress")
            {
                session.Status = "Expired";
            }
            if (session.Chunks.Count > 0)
            {
                db.UploadChunks.RemoveRange(session.Chunks);
            }
            purged++;
        }

        if (staleSessions.Count > 0)
        {
            await db.SaveChangesAsync(ct);
        }

        if (Directory.Exists(_stagingRoot))
        {
            var activeDirs = await db.UploadSessions
                .AsNoTracking()
                .Where(s => s.Status == "InProgress")
                .Select(s => s.Id.ToString("N"))
                .ToListAsync(ct);
            var activeSet = activeDirs.ToHashSet(StringComparer.OrdinalIgnoreCase);

            foreach (var dir in Directory.EnumerateDirectories(_stagingRoot))
            {
                var name = Path.GetFileName(dir);
                var info = new DirectoryInfo(dir);
                if (!activeSet.Contains(name) && info.LastWriteTimeUtc <= cutoff.UtcDateTime)
                {
                    TryDeleteDirectory(dir);
                    purged++;
                }
            }
        }

        if (purged > 0)
        {
            _logger.LogInformation("Purged {PurgedCount} expired/abandoned release upload sessions.", purged);
        }

        return purged;
    }

    private ChunkedUploadOpResult? ValidateSessionWritable(
        UploadSessionEntity? session,
        int chunkIndex,
        string actorSub,
        DateTimeOffset now)
    {
        if (session is null)
        {
            return new ChunkedUploadOpResult(StatusCodes.Status404NotFound, new { error = "Upload session not found." });
        }

        if (!string.Equals(session.CreatedBySub, actorSub, StringComparison.Ordinal))
        {
            return new ChunkedUploadOpResult(StatusCodes.Status403Forbidden, new { error = "Forbidden: upload session belongs to a different identity." });
        }

        if (session.Status != "InProgress")
        {
            return new ChunkedUploadOpResult(StatusCodes.Status409Conflict, new { error = $"Upload session is '{session.Status}'." });
        }

        if (now > session.ExpiresAtUtc)
        {
            return new ChunkedUploadOpResult(StatusCodes.Status410Gone, new { error = "Upload session expired." });
        }

        if (chunkIndex < 0 || chunkIndex >= session.TotalChunks)
        {
            return new ChunkedUploadOpResult(
                StatusCodes.Status400BadRequest,
                new { error = $"chunkIndex {chunkIndex} out of bounds [0, {session.TotalChunks - 1}]." });
        }

        return null;
    }

    private string ResolveSessionDirectory(Guid uploadId)
    {
        var dir = Path.GetFullPath(Path.Combine(_stagingRoot, uploadId.ToString("N")));
        if (!dir.StartsWith(_stagingRoot + Path.DirectorySeparatorChar, StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Staging directory path traversal blocked.");
        }
        return dir;
    }

    private static (string Kind, string CanonicalPlatform) MapPlatformToKind(string rawPlatform)
    {
        return rawPlatform.Trim().ToLowerInvariant() switch
        {
            "ios" or "ipa" => ("ipa", "iOS"),
            "firmware" => ("firmware", "Firmware"),
            "windows" => ("games", "Windows"),
            "linux" => ("games", "Linux"),
            "macos" => ("games", "macOS"),
            _ => ("games", "Cross-Platform")
        };
    }

    private static void DeleteFileIfExists(string path)
    {
        try
        {
            if (File.Exists(path))
            {
                File.Delete(path);
            }
        }
        catch
        {
            // Best-effort temp cleanup
        }
    }

    private static void TryDeleteDirectory(string path)
    {
        try
        {
            if (Directory.Exists(path))
            {
                Directory.Delete(path, recursive: true);
            }
        }
        catch
        {
            // Best-effort staging cleanup
        }
    }
}
