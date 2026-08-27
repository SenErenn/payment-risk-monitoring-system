using FluentValidation;
using PaymentRiskMonitoring.Api.DTOs.Cards;

namespace PaymentRiskMonitoring.Api.Validators;

public class CreateCardRequestValidator : AbstractValidator<CreateCardRequest>
{
    public CreateCardRequestValidator()
    {
        RuleFor(request => request.CardType)
            .IsInEnum()
            .WithMessage("Card type is invalid.");

        RuleFor(request => request.Status)
            .IsInEnum()
            .WithMessage("Card status is invalid.");

        RuleFor(request => request.CreditLimit)
            .GreaterThan(0)
            .WithMessage("Credit limit must be greater than 0.");

        RuleFor(request => request.AvailableLimit)
            .GreaterThanOrEqualTo(0)
            .WithMessage("Available limit cannot be negative.")
            .LessThanOrEqualTo(request => request.CreditLimit)
            .WithMessage("Available limit cannot exceed credit limit.");

        RuleFor(request => request.LastFourDigits)
            .NotEmpty()
            .WithMessage("Last four digits are required.")
            .Matches(@"^\d{4}$")
            .WithMessage("Last four digits must be exactly 4 numeric characters.");
    }
}
