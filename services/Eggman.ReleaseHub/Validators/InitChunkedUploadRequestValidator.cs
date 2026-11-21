using Eggman.Contracts.Releases;
using FluentValidation;

namespace Eggman.ReleaseHub.Validators;

public sealed class InitChunkedUploadRequestValidator : AbstractValidator<InitChunkedUploadRequest>
{
    private static readonly HashSet<string> AllowedPlatforms = new(StringComparer.OrdinalIgnoreCase)
    {
        "ios", "ipa", "firmware", "windows", "linux", "macos", "cross-platform", "games"
    };

    public InitChunkedUploadRequestValidator(IConfiguration config)
    {
        var maxChunkBytes = config.GetValue<long?>("Security:MaxChunkBodyBytes") ?? 55L * 1024 * 1024;

        RuleFor(x => x.AppSlug)
            .NotEmpty()
            .Matches("^[a-z0-9][a-z0-9-]{0,63}$")
            .WithMessage("AppSlug must contain lowercase alphanumeric characters and hyphens only.");

        RuleFor(x => x.Version)
            .NotEmpty()
            .Matches(@"^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.-]+)?$")
            .WithMessage("Version must follow semantic versioning (e.g., 1.2.0).");

        RuleFor(x => x.Platform)
            .NotEmpty()
            .Must(p => AllowedPlatforms.Contains(p))
            .WithMessage("Platform must be one of: ios, ipa, firmware, windows, linux, macos, cross-platform, games.");

        RuleFor(x => x.FileName)
            .NotEmpty()
            .Matches("^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$")
            .Must(f => !f.Contains("..", StringComparison.Ordinal))
            .WithMessage("FileName must be a safe single filename without path traversal.");

        RuleFor(x => x.TotalSizeBytes)
            .InclusiveBetween(1L, 10_737_418_240L);

        RuleFor(x => x.TotalChunks)
            .InclusiveBetween(1, 10_000);

        RuleFor(x => x)
            .Must(req =>
            {
                if (req.TotalChunks <= 0)
                {
                    return false;
                }
                var maxCapacity = (long)req.TotalChunks * maxChunkBytes;
                return req.TotalSizeBytes <= maxCapacity && req.TotalSizeBytes >= req.TotalChunks;
            })
            .WithMessage($"TotalSizeBytes must fit within TotalChunks * {maxChunkBytes} bytes and be at least TotalChunks bytes.");

        RuleFor(x => x.ExpectedSha256)
            .NotEmpty()
            .Matches("^[a-fA-F0-9]{64}$")
            .WithMessage("ExpectedSha256 must be a valid 64-character hexadecimal SHA-256 digest.");

        RuleFor(x => x.Description)
            .MaximumLength(500)
            .When(x => x.Description is not null);
    }
}
