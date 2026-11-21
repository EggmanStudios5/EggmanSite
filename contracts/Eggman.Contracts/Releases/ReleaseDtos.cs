using System.ComponentModel.DataAnnotations;

namespace Eggman.Contracts.Releases;

public sealed record AltStoreSourceDto(
    string Name,
    string Identifier,
    string Subtitle,
    string Description,
    string IconUrl,
    string Website,
    IReadOnlyList<AltStoreAppDto> Apps);

public sealed record AltStoreAppDto(
    string Name,
    string BundleIdentifier,
    string DeveloperName,
    string Subtitle,
    string LocalizedDescription,
    string IconUrl,
    string TintColor,
    IReadOnlyList<AltStoreVersionDto> Versions);

public sealed record AltStoreVersionDto(
    string Version,
    string Date,
    long Size,
    string DownloadUrl,
    string LocalizedDescription,
    string Sha256);

public sealed record FirmwareManifestDto(
    string ProductSlug,
    string HardwareRevision,
    string Version,
    string FileName,
    string Sha256,
    long SizeBytes,
    DateTimeOffset ReleasedAtUtc);

public sealed record GameBuildDto(
    string GameSlug,
    string Title,
    string Platform,
    string Version,
    string FileName,
    string Sha256,
    long SizeBytes,
    DateTimeOffset ReleasedAtUtc);

public sealed record PublishReleaseRequest(
    [property: Required, RegularExpression("^(ipa|firmware|games)$")] string Kind,
    [property: Required, RegularExpression("^[a-z0-9][a-z0-9-]{0,63}$")] string Slug,
    [property: Required, RegularExpression(@"^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.-]+)?$")] string Version,
    [property: Required, RegularExpression("^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$")] string FileName,
    [property: Required, RegularExpression("^[a-fA-F0-9]{64}$")] string Sha256,
    [property: Required, StringLength(500, MinimumLength = 3)] string Description);

public sealed record InitChunkedUploadRequest(
    [property: Required, RegularExpression("^[a-z0-9][a-z0-9-]{0,63}$")] string AppSlug,
    [property: Required, RegularExpression(@"^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.-]+)?$")] string Version,
    [property: Required, RegularExpression("^(?i)(ios|ipa|firmware|windows|linux|macos|cross-platform|games)$")] string Platform,
    [property: Required, RegularExpression("^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$")] string FileName,
    [property: Range(1L, 10_737_418_240L)] long TotalSizeBytes,
    [property: Range(1, 10_000)] int TotalChunks,
    [property: Required, RegularExpression("^[a-fA-F0-9]{64}$")] string ExpectedSha256,
    [property: StringLength(500)] string? Description = null);

public sealed record InitChunkedUploadResponse(
    Guid UploadId,
    long MaxChunkBytes,
    int TotalChunks,
    DateTimeOffset ExpiresAtUtc);

public sealed record ChunkUploadResponse(
    Guid UploadId,
    int ChunkIndex,
    long SizeBytes,
    string ChunkSha256,
    int ReceivedChunks,
    int TotalChunks);

public sealed record CompleteChunkedUploadResponse(
    Guid UploadId,
    string Kind,
    string AppSlug,
    string Version,
    string Platform,
    string FileName,
    long SizeBytes,
    string Sha256,
    string DownloadUrl,
    DateTimeOffset ReleasedAtUtc);
