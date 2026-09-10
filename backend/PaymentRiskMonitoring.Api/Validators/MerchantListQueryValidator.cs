using FluentValidation;
using PaymentRiskMonitoring.Api.DTOs.Merchants;

namespace PaymentRiskMonitoring.Api.Validators;

public class MerchantListQueryValidator : AbstractValidator<MerchantListQuery>
{
    public MerchantListQueryValidator()
    {
        RuleFor(query => query.Page)
            .GreaterThanOrEqualTo(1)
            .WithMessage("Page must be at least 1.");

        RuleFor(query => query.PageSize)
            .InclusiveBetween(1, 500)
            .WithMessage("Page size must be between 1 and 500.");

        RuleFor(query => query.Search)
            .MaximumLength(100)
            .WithMessage("Search must be at most 100 characters.")
            .When(query => !string.IsNullOrWhiteSpace(query.Search));
    }
}
