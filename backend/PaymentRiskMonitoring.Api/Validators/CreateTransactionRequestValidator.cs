using FluentValidation;
using PaymentRiskMonitoring.Api.DTOs.Transactions;

namespace PaymentRiskMonitoring.Api.Validators;

public class CreateTransactionRequestValidator : AbstractValidator<CreateTransactionRequest>
{
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
            .WithMessage("Amount must be greater than 0.");

        RuleFor(request => request.Currency)
            .NotEmpty()
            .WithMessage("Currency is required.")
            .Must(currency => AllowedCurrencies.Contains(currency.Trim()))
            .WithMessage("Currency must be one of: TRY, USD, EUR.");

        RuleFor(request => request.PaymentType)
            .IsInEnum()
            .WithMessage("Payment type is invalid.");
    }
}
