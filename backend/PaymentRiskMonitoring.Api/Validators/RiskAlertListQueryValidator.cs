using FluentValidation;
using PaymentRiskMonitoring.Api.DTOs.RiskAlerts;

namespace PaymentRiskMonitoring.Api.Validators;

public class RiskAlertListQueryValidator : AbstractValidator<RiskAlertListQuery>
{
    private static readonly HashSet<string> AllowedSortFields = new(StringComparer.OrdinalIgnoreCase)
    {
        "createdAt",
        "riskScore",
        "riskLevel",
        "status",
        "alertCode"
    };

    public RiskAlertListQueryValidator()
    {
        RuleFor(query => query.Page)
            .GreaterThanOrEqualTo(1);

        RuleFor(query => query.PageSize)
            .InclusiveBetween(1, 100);

        RuleFor(query => query.SortBy)
            .Must(sortBy => AllowedSortFields.Contains(sortBy.Trim()))
            .WithMessage("SortBy must be one of: createdAt, riskScore, riskLevel, status, alertCode.");

        RuleFor(query => query.SortDirection)
            .Must(direction =>
                string.Equals(direction.Trim(), "asc", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(direction.Trim(), "desc", StringComparison.OrdinalIgnoreCase))
            .WithMessage("SortDirection must be asc or desc.");

        RuleFor(query => query.CreatedTo)
            .GreaterThanOrEqualTo(query => query.CreatedFrom)
            .When(query => query.CreatedFrom.HasValue && query.CreatedTo.HasValue)
            .WithMessage("CreatedTo must be greater than or equal to CreatedFrom.");
    }
}
