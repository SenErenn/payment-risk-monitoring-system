using FluentValidation;
using PaymentRiskMonitoring.Api.DTOs.Transactions;

namespace PaymentRiskMonitoring.Api.Validators;

public class TransactionExportQueryValidator : AbstractValidator<TransactionExportQuery>
{
    private static readonly HashSet<string> AllowedSortFields = new(StringComparer.OrdinalIgnoreCase)
    {
        "createdAt",
        "amount",
        "status",
        "riskScore",
        "riskLevel",
        "transactionCode",
        "paymentType"
    };

    private static readonly HashSet<string> AllowedSortDirections = new(StringComparer.OrdinalIgnoreCase)
    {
        "asc",
        "desc"
    };

    private static readonly HashSet<string> AllowedFormats = new(StringComparer.OrdinalIgnoreCase)
    {
        "csv",
        "excel"
    };

    public TransactionExportQueryValidator()
    {
        RuleFor(query => query.Search)
            .MaximumLength(100)
            .When(query => !string.IsNullOrWhiteSpace(query.Search));

        RuleFor(query => query.Status)
            .IsInEnum()
            .When(query => query.Status.HasValue);

        RuleFor(query => query.PaymentType)
            .IsInEnum()
            .When(query => query.PaymentType.HasValue);

        RuleFor(query => query.MinAmount)
            .GreaterThanOrEqualTo(0)
            .When(query => query.MinAmount.HasValue);

        RuleFor(query => query.MaxAmount)
            .GreaterThanOrEqualTo(0)
            .When(query => query.MaxAmount.HasValue);

        RuleFor(query => query)
            .Must(query =>
                !query.MinAmount.HasValue ||
                !query.MaxAmount.HasValue ||
                query.MinAmount.Value <= query.MaxAmount.Value)
            .WithMessage("Min amount must be less than or equal to max amount.");

        RuleFor(query => query)
            .Must(query =>
                !query.CreatedFrom.HasValue ||
                !query.CreatedTo.HasValue ||
                query.CreatedFrom.Value <= query.CreatedTo.Value)
            .WithMessage("Created from must be less than or equal to created to.");

        RuleFor(query => query.SortBy)
            .Must(sortBy => AllowedSortFields.Contains(sortBy.Trim()));

        RuleFor(query => query.SortDirection)
            .Must(direction => AllowedSortDirections.Contains(direction.Trim()));

        RuleFor(query => query.Format)
            .Must(format => AllowedFormats.Contains(format.Trim()))
            .WithMessage("Format must be csv or excel.");
    }
}
