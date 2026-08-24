using FluentValidation;
using PaymentRiskMonitoring.Api.DTOs.Merchants;

namespace PaymentRiskMonitoring.Api.Validators;

public class CreateMerchantRequestValidator : AbstractValidator<CreateMerchantRequest>
{
    public CreateMerchantRequestValidator()
    {
        RuleFor(request => request.MerchantCode)
            .NotEmpty()
            .WithMessage("Merchant code is required.")
            .MaximumLength(50)
            .WithMessage("Merchant code must be at most 50 characters.")
            .Matches(@"^[A-Za-z0-9_-]+$")
            .WithMessage("Merchant code may only contain letters, numbers, underscores, and hyphens.");

        RuleFor(request => request.Name)
            .NotEmpty()
            .WithMessage("Merchant name is required.")
            .MaximumLength(200)
            .WithMessage("Merchant name must be at most 200 characters.");

        RuleFor(request => request.Category)
            .NotEmpty()
            .WithMessage("Merchant category is required.")
            .MaximumLength(100)
            .WithMessage("Merchant category must be at most 100 characters.");
    }
}
