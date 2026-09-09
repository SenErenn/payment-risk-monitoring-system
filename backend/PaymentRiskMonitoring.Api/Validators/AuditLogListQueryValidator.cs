using FluentValidation;
using PaymentRiskMonitoring.Api.DTOs.Audit;

namespace PaymentRiskMonitoring.Api.Validators;

public class AuditLogListQueryValidator : AbstractValidator<AuditLogListQuery>
{
    public AuditLogListQueryValidator()
    {
        RuleFor(query => query.Page)
            .GreaterThanOrEqualTo(1);

        RuleFor(query => query.PageSize)
            .InclusiveBetween(1, 100);

        RuleFor(query => query.Action)
            .MaximumLength(100)
            .When(query => !string.IsNullOrWhiteSpace(query.Action));

        RuleFor(query => query.EntityType)
            .MaximumLength(100)
            .When(query => !string.IsNullOrWhiteSpace(query.EntityType));

        RuleFor(query => query.Search)
            .MaximumLength(200)
            .When(query => !string.IsNullOrWhiteSpace(query.Search));

        RuleFor(query => query)
            .Must(query =>
                !query.CreatedFrom.HasValue
                || !query.CreatedTo.HasValue
                || query.CreatedFrom <= query.CreatedTo)
            .WithMessage("CreatedFrom must be less than or equal to CreatedTo.");
    }
}
