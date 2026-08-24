using FluentValidation;
using PaymentRiskMonitoring.Api.DTOs.Merchants;

namespace PaymentRiskMonitoring.Api.Validators;

public class UpdateMerchantRequestValidator : AbstractValidator<UpdateMerchantRequest>
{
    public UpdateMerchantRequestValidator()
    {
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
