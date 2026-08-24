using FluentValidation;
using PaymentRiskMonitoring.Api.DTOs;

namespace PaymentRiskMonitoring.Api.Validators;

public class SampleValidationRequestValidator : AbstractValidator<SampleValidationRequest>
{
    public SampleValidationRequestValidator()
    {
        RuleFor(request => request.Name)
            .NotEmpty()
            .WithMessage("Name is required.")
            .MaximumLength(100)
            .WithMessage("Name must be at most 100 characters.");

        RuleFor(request => request.Amount)
            .GreaterThan(0)
            .WithMessage("Amount must be greater than 0.");
    }
}
