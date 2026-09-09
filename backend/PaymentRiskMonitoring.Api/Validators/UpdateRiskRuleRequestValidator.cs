using FluentValidation;
using PaymentRiskMonitoring.Api.DTOs.RiskRules;

namespace PaymentRiskMonitoring.Api.Validators;

public class UpdateRiskRuleRequestValidator : AbstractValidator<UpdateRiskRuleRequest>
{
    public UpdateRiskRuleRequestValidator()
    {
        RuleFor(request => request.Points)
            .InclusiveBetween(0, 100)
            .WithMessage("Risk points must be between 0 and 100.");

        RuleFor(request => request.Threshold)
            .GreaterThan(0)
            .WithMessage("Threshold must be greater than 0.");
    }
}
