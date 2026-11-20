using Eggman.Contracts.IoT;
using FluentValidation;

namespace Eggman.IoT.Bridge.Validators;

public sealed class SensorReadingValidator : AbstractValidator<SensorReadingDto>
{
    public SensorReadingValidator()
    {
        RuleFor(x => x.DeviceId)
            .NotEmpty()
            .Matches("^[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}$");
        RuleFor(x => x.Location).NotEmpty().Length(2, 120);
        RuleFor(x => x.TemperatureCelsius).InclusiveBetween(-40.0, 125.0);
        RuleFor(x => x.HumidityPercent).InclusiveBetween(0.0, 100.0);
        RuleFor(x => x.FanPwmPercent).InclusiveBetween(0, 100);
    }
}

public sealed class RfidVerifyRequestValidator : AbstractValidator<RfidVerifyRequest>
{
    public RfidVerifyRequestValidator()
    {
        RuleFor(x => x.NodeId)
            .NotEmpty()
            .Matches("^[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}$");
        RuleFor(x => x.DoorId)
            .NotEmpty()
            .Matches("^[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}$");
        RuleFor(x => x.CardUidHashSha256)
            .NotEmpty()
            .Matches("^[a-fA-F0-9]{64}$");
    }
}

public sealed class RackAirflowCommandValidator : AbstractValidator<RackAirflowCommand>
{
    public RackAirflowCommandValidator()
    {
        RuleFor(x => x.DeviceId)
            .NotEmpty()
            .Matches("^[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}$");
        RuleFor(x => x.TargetFanPwmPercent).InclusiveBetween(0, 100);
        RuleFor(x => x.Reason).NotEmpty().Length(2, 200);
    }
}
