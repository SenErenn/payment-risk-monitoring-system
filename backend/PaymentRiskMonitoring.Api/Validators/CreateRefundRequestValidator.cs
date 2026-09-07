using FluentValidation;
using PaymentRiskMonitoring.Api.DTOs.Refunds;

namespace PaymentRiskMonitoring.Api.Validators;

public class CreateRefundRequestValidator : AbstractValidator<CreateRefundRequest>
{
    public CreateRefundRequestValidator()
    {
        RuleFor(request => request.Amount)
            .GreaterThan(0)
            .When(request => request.Amount.HasValue)
            .WithMessage("Refund amount must be greater than 0.")
            .Must(amount => !amount.HasValue || HaveAtMostTwoDecimalPlaces(amount.Value))
            .WithMessage("Refund amount must have at most 2 decimal places.");

        RuleFor(request => request.Reason)
            .MaximumLength(500)
            .When(request => !string.IsNullOrWhiteSpace(request.Reason))
            .WithMessage("Refund reason must be at most 500 characters.");
    }

    private static bool HaveAtMostTwoDecimalPlaces(decimal amount)
    {
        return decimal.Round(amount, 2, MidpointRounding.AwayFromZero) == amount;
    }
}
