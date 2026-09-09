using FluentValidation;
using PaymentRiskMonitoring.Api.DTOs.Analytics;

namespace PaymentRiskMonitoring.Api.Validators;

public class AnalyticsRangeQueryValidator : AbstractValidator<AnalyticsRangeQuery>
{
    public AnalyticsRangeQueryValidator()
    {
        RuleFor(query => query)
            .Must(query =>
                !query.From.HasValue ||
                !query.To.HasValue ||
                Normalize(query.From.Value) <= Normalize(query.To.Value))
            .WithMessage("'from' must be less than or equal to 'to'.");
    }

    private static DateTime Normalize(DateTime value)
    {
        return value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };
    }
}
