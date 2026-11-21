using System.Security.Cryptography;
using System.Text.RegularExpressions;
using Eggman.Contracts.Releases;
using Eggman.ReleaseHub.Data;
using Microsoft.EntityFrameworkCore;

namespace Eggman.ReleaseHub.Services;

public sealed partial class ArtifactCatalogService
{
    private static readonly HashSet<string> AllowedKinds = new(StringComparer.Ordinal)
    {
        "ipa", "firmware", "games"
    };

    private readonly string _storageRoot;
    private readonly string _publicBaseUrl;
    private readonly IDbContextFactory<ReleaseHubDbContext> _dbFactory;

    public ArtifactCatalogService(IConfiguration config, IDbContextFactory<ReleaseHubDbContext> dbFactory)
    {
        _storageRoot = Path.GetFullPath(config["ReleaseHub:StorageRoot"] ?? "/var/lib/eggman/releases");
        _publicBaseUrl = (config["ReleaseHub:PublicBaseUrl"] ?? "https://releases.eggmanstudios.me").TrimEnd('/');
        _dbFactory = dbFactory;
    }

    public string PublicBaseUrl => _publicBaseUrl;

    public async Task<AltStoreSourceDto> BuildAltStoreSourceAsync(CancellationToken ct = default)
    {
        var companionVersions = await GetVersionsForAppAsync("ipa", "eggman-companion", ct);
        var apps = new List<AltStoreAppDto>
        {
            new(
                Name: "Eggman Companion",
                BundleIdentifier: "me.eggmanstudios.companion",
                DeveloperName: "Eggman Studios",
                Subtitle: "Open hardware companion & AltStore showcase app",
                LocalizedDescription: "Official signed iOS release distributed exclusively via Eggman ReleaseHub with SHA-256 verification.",
                IconUrl: $"{_publicBaseUrl}/assets/companion-icon.png",
                TintColor: "#0F766E",
                Versions: companionVersions)
        };

        await using var db = await _dbFactory.CreateDbContextAsync(ct);
        var extraIpaApps = await db.ReleaseArtifacts
            .AsNoTracking()
            .Where(x => x.Kind == "ipa" && x.Slug != "eggman-companion")
            .OrderByDescending(x => x.ReleasedAtUtc)
            .ToListAsync(ct);

        foreach (var group in extraIpaApps.GroupBy(x => x.Slug, StringComparer.Ordinal))
        {
            var versions = group.Select(x => new AltStoreVersionDto(
                x.Version,
                x.ReleasedAtUtc.ToString("yyyy-MM-dd"),
                x.SizeBytes,
                $"{_publicBaseUrl}/api/v1/releases/ipa/{x.FileName}",
                x.Description,
                x.Sha256)).ToList();

            apps.Add(new AltStoreAppDto(
                Name: group.Key,
                BundleIdentifier: $"me.eggmanstudios.{group.Key.Replace("-", string.Empty, StringComparison.Ordinal)}",
                DeveloperName: "Eggman Studios",
                Subtitle: "Verified Eggman Studios iOS release",
                LocalizedDescription: group.First().Description,
                IconUrl: $"{_publicBaseUrl}/assets/eggman-icon.png",
                TintColor: "#0F766E",
                Versions: versions));
        }

        return new AltStoreSourceDto(
            Name: "Eggman Studios AltStore",
            Identifier: "me.eggmanstudios.altstore",
            Subtitle: "Sovereign builds, firmware & games",
            Description: "Cryptographically verified builds hosted on Eggman ReleaseHub.",
            IconUrl: $"{_publicBaseUrl}/assets/eggman-icon.png",
            Website: "https://eggmanstudios.me",
            Apps: apps);
    }

    public async Task<IReadOnlyList<FirmwareManifestDto>> GetFirmwareManifestsAsync(CancellationToken ct = default)
    {
        var list = new List<FirmwareManifestDto>
        {
            CreateFirmwareManifest("macro-3x3-usb", "ATmega32U4-r1", "1.2.0", "macro-3x3-usb-1.2.0.hex"),
            CreateFirmwareManifest("rfid-access-node", "ESP32-S3-r1", "0.9.0", "rfid-node-0.9.0.bin")
        };

        await using var db = await _dbFactory.CreateDbContextAsync(ct);
        var stored = await db.ReleaseArtifacts
            .AsNoTracking()
            .Where(x => x.Kind == "firmware")
            .OrderByDescending(x => x.ReleasedAtUtc)
            .ToListAsync(ct);

        foreach (var entry in stored)
        {
            list.Add(new FirmwareManifestDto(
                entry.Slug,
                "Hardware-Latest",
                entry.Version,
                entry.FileName,
                entry.Sha256,
                entry.SizeBytes,
                entry.ReleasedAtUtc));
        }

        return list;
    }

    public async Task<IReadOnlyList<GameBuildDto>> GetGameBuildsAsync(CancellationToken ct = default)
    {
        var list = new List<GameBuildDto>
        {
            CreateGameBuild("slunicka", "Sluníčka", "Windows/Linux", "1.0.0", "slunicka-1.0.0-linux-x64.tar.gz"),
            CreateGameBuild("protikod", "Protikód", "Windows/Linux", "1.0.0", "protikod-1.0.0-linux-x64.tar.gz")
        };

        await using var db = await _dbFactory.CreateDbContextAsync(ct);
        var stored = await db.ReleaseArtifacts
            .AsNoTracking()
            .Where(x => x.Kind == "games")
            .OrderByDescending(x => x.ReleasedAtUtc)
            .ToListAsync(ct);

        foreach (var entry in stored)
        {
            list.Add(new GameBuildDto(
                entry.Slug,
                entry.Slug,
                string.IsNullOrWhiteSpace(entry.Platform) ? "Cross-Platform" : entry.Platform,
                entry.Version,
                entry.FileName,
                entry.Sha256,
                entry.SizeBytes,
                entry.ReleasedAtUtc));
        }

        return list;
    }

    public Task<ReleaseArtifactEntity> RegisterReleaseAsync(PublishReleaseRequest req, CancellationToken ct = default)
        => RegisterReleaseAsync(req, "Cross-Platform", null, ct);

    public async Task<ReleaseArtifactEntity> RegisterReleaseAsync(
        PublishReleaseRequest req,
        string platform,
        long? verifiedSizeBytes,
        CancellationToken ct = default)
    {
        var path = ResolveArtifactPath(req.Kind, req.FileName);
        long size = verifiedSizeBytes ?? (path is not null && File.Exists(path) ? new FileInfo(path).Length : 0);

        await using var db = await _dbFactory.CreateDbContextAsync(ct);
        var existing = await db.ReleaseArtifacts
            .FirstOrDefaultAsync(x => x.Kind == req.Kind && x.FileName == req.FileName, ct);

        if (existing is null)
        {
            existing = new ReleaseArtifactEntity
            {
                Kind = req.Kind,
                Slug = req.Slug,
                Platform = platform,
                Version = req.Version,
                FileName = req.FileName,
                Sha256 = req.Sha256.ToLowerInvariant(),
                SizeBytes = size,
                Description = req.Description,
                ReleasedAtUtc = DateTimeOffset.UtcNow
            };
            db.ReleaseArtifacts.Add(existing);
        }
        else
        {
            existing.Slug = req.Slug;
            existing.Platform = platform;
            existing.Version = req.Version;
            existing.Sha256 = req.Sha256.ToLowerInvariant();
            existing.SizeBytes = size;
            existing.Description = req.Description;
            existing.ReleasedAtUtc = DateTimeOffset.UtcNow;
        }

        await db.SaveChangesAsync(ct);
        return existing;
    }

    public string? ResolveArtifactPath(string kind, string fileName)
    {
        if (!AllowedKinds.Contains(kind) || !SafeFileNameRegex().IsMatch(fileName) || fileName.Contains("..", StringComparison.Ordinal))
        {
            return null;
        }

        var kindDir = Path.GetFullPath(Path.Combine(_storageRoot, kind));
        var candidate = Path.GetFullPath(Path.Combine(kindDir, fileName));
        if (!candidate.StartsWith(kindDir + Path.DirectorySeparatorChar, StringComparison.Ordinal))
        {
            return null;
        }
        return candidate;
    }

    public static async Task<string> ComputeFileSha256Async(string path, CancellationToken ct)
    {
        await using var fs = File.OpenRead(path);
        var hash = await SHA256.HashDataAsync(fs, ct);
        return Convert.ToHexStringLower(hash);
    }

    private async Task<IReadOnlyList<AltStoreVersionDto>> GetVersionsForAppAsync(string kind, string slug, CancellationToken ct)
    {
        await using var db = await _dbFactory.CreateDbContextAsync(ct);
        var stored = await db.ReleaseArtifacts
            .AsNoTracking()
            .Where(x => x.Kind == kind && x.Slug == slug)
            .OrderByDescending(x => x.ReleasedAtUtc)
            .ToListAsync(ct);

        if (stored.Count > 0)
        {
            return stored.Select(x => new AltStoreVersionDto(
                x.Version,
                x.ReleasedAtUtc.ToString("yyyy-MM-dd"),
                x.SizeBytes,
                $"{_publicBaseUrl}/api/v1/releases/ipa/{x.FileName}",
                x.Description,
                x.Sha256)).ToList();
        }

        var defaultFile = "eggman-companion-1.0.0.ipa";
        var (sha, size) = InspectArtifactOrPlaceholder("ipa", defaultFile);
        return
        [
            new AltStoreVersionDto(
                Version: "1.0.0",
                Date: "2026-11-20",
                Size: size,
                DownloadUrl: $"{_publicBaseUrl}/api/v1/releases/ipa/{defaultFile}",
                LocalizedDescription: "Initial signed AltStore distribution manifest.",
                Sha256: sha)
        ];
    }

    private FirmwareManifestDto CreateFirmwareManifest(string slug, string rev, string version, string fileName)
    {
        var (sha, size) = InspectArtifactOrPlaceholder("firmware", fileName);
        return new FirmwareManifestDto(slug, rev, version, fileName, sha, size, DateTimeOffset.UtcNow);
    }

    private GameBuildDto CreateGameBuild(string slug, string title, string platform, string version, string fileName)
    {
        var (sha, size) = InspectArtifactOrPlaceholder("games", fileName);
        return new GameBuildDto(slug, title, platform, version, fileName, sha, size, DateTimeOffset.UtcNow);
    }

    private (string Sha256, long SizeBytes) InspectArtifactOrPlaceholder(string kind, string fileName)
    {
        var path = ResolveArtifactPath(kind, fileName);
        if (path is not null && File.Exists(path))
        {
            using var fs = File.OpenRead(path);
            var sha = Convert.ToHexStringLower(SHA256.HashData(fs));
            return (sha, fs.Length);
        }
        return ("pending-artifact-upload", 0);
    }

    [GeneratedRegex("^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$")]
    private static partial Regex SafeFileNameRegex();
}
