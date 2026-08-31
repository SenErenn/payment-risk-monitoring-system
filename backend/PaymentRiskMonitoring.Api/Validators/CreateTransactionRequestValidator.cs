using FluentValidation;
using PaymentRiskMonitoring.Api.DTOs.Transactions;

namespace PaymentRiskMonitoring.Api.Validators;

public class CreateTransactionRequestValidator : AbstractValidator<CreateTransactionRequest>
{
    public const decimal MaxAmount = 1_000_000m;

    private static readonly HashSet<string> AllowedCurrencies = new(StringComparer.OrdinalIgnoreCase)
    {
        "TRY",
        "USD",
        "EUR"
    };

    public CreateTransactionRequestValidator()
    {
        RuleFor(request => request.MerchantId)
            .NotEmpty()
            .WithMessage("Merchant id is required.");

        RuleFor(request => request.CardId)
            .NotEmpty()
            .WithMessage("Card id is required.");

        RuleFor(request => request.Amount)
            .GreaterThan(0)
            .WithMessage("Amount must be greater than 0.")
            .LessThanOrEqualTo(MaxAmount)
            .WithMessage($"Amount must be less than or equal to {MaxAmount:0}.")
            .Must(HaveAtMostTwoDecimalPlaces)
            .WithMessage("Amount must have at most 2 decimal places.");

        RuleFor(request => request.Currency)
            .NotEmpty()
            .WithMessage("Currency is required.")
            .Must(currency => AllowedCurrencies.Contains(currency.Trim()))
            .WithMessage("Currency must be one of: TRY, USD, EUR.");

        RuleFor(request => request.PaymentType)
            .IsInEnum()
            .WithMessage("Payment type is invalid.");

        RuleFor(request => request.IdempotencyKey)
            .MaximumLength(100)
            .WithMessage("Idempotency key must be at most 100 characters.")
            .Must(key => key is null || !string.IsNullOrWhiteSpace(key))
            .WithMessage("Idempotency key cannot be blank.")
            .When(request => request.IdempotencyKey is not null);
    }

    private static bool HaveAtMostTwoDecimalPlaces(decimal amount)
    {
        return decimal.Round(amount, 2, MidpointRounding.AwayFromZero) == amount;
    }
}
