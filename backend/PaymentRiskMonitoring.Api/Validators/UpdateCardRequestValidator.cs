using FluentValidation;
using PaymentRiskMonitoring.Api.DTOs.Cards;

namespace PaymentRiskMonitoring.Api.Validators;

public class UpdateCardRequestValidator : AbstractValidator<UpdateCardRequest>
{
    public UpdateCardRequestValidator()
    {
        RuleFor(request => request.CreditLimit)
            .GreaterThan(0)
            .WithMessage("Credit limit must be greater than 0.");

        RuleFor(request => request.AvailableLimit)
            .GreaterThanOrEqualTo(0)
            .WithMessage("Available limit cannot be negative.")
            .LessThanOrEqualTo(request => request.CreditLimit)
            .WithMessage("Available limit cannot exceed credit limit.");
    }
}
