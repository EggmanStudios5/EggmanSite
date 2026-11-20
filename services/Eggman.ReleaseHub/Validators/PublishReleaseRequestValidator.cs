using Eggman.Contracts.Releases;
using FluentValidation;

namespace Eggman.ReleaseHub.Validators;

public sealed class PublishReleaseRequestValidator : AbstractValidator<PublishReleaseRequest>
{
    private static readonly string[] AllowedKinds = ["ipa", "firmware", "games"];

    public PublishReleaseRequestValidator()
    {
        RuleFor(x => x.Kind)
            .NotEmpty()
            .Must(k => AllowedKinds.Contains(k, StringComparer.Ordinal))
            .WithMessage("Kind must be one of: ipa, firmware, games.");

        RuleFor(x => x.Slug)
            .NotEmpty()
            .Matches("^[a-z0-9][a-z0-9-]{0,63}$")
            .WithMessage("Slug must contain lowercase alphanumeric characters and hyphens only.");

        RuleFor(x => x.Version)
            .NotEmpty()
            .Matches(@"^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.-]+)?$")
            .WithMessage("Version must follow semantic versioning (e.g., 1.2.0).");

        RuleFor(x => x.FileName)
            .NotEmpty()
            .Matches("^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$")
            .Must(f => !f.Contains("..", StringComparison.Ordinal))
            .WithMessage("FileName must be a safe single filename without path traversal.");

        RuleFor(x => x.Sha256)
            .NotEmpty()
            .Matches("^[a-fA-F0-9]{64}$")
            .WithMessage("Sha256 must be a valid 64-character hexadecimal digest.");

        RuleFor(x => x.Description)
            .NotEmpty()
            .MinimumLength(3)
            .MaximumLength(500);
    }
}
