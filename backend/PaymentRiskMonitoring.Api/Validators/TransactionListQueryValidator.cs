using FluentValidation;
using PaymentRiskMonitoring.Api.DTOs.Transactions;

namespace PaymentRiskMonitoring.Api.Validators;

public class TransactionListQueryValidator : AbstractValidator<TransactionListQuery>
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

    public TransactionListQueryValidator()
    {
        RuleFor(query => query.Page)
            .GreaterThanOrEqualTo(1)
            .WithMessage("Page must be at least 1.");

        RuleFor(query => query.PageSize)
            .InclusiveBetween(1, 100)
            .WithMessage("Page size must be between 1 and 100.");

        RuleFor(query => query.Search)
            .MaximumLength(100)
            .WithMessage("Search must be at most 100 characters.")
            .When(query => !string.IsNullOrWhiteSpace(query.Search));

        RuleFor(query => query.Status)
            .IsInEnum()
            .When(query => query.Status.HasValue)
            .WithMessage("Transaction status is invalid.");

        RuleFor(query => query.PaymentType)
            .IsInEnum()
            .When(query => query.PaymentType.HasValue)
            .WithMessage("Payment type is invalid.");

        RuleFor(query => query.MinAmount)
            .GreaterThanOrEqualTo(0)
            .When(query => query.MinAmount.HasValue)
            .WithMessage("Min amount must be greater than or equal to 0.");

        RuleFor(query => query.MaxAmount)
            .GreaterThanOrEqualTo(0)
            .When(query => query.MaxAmount.HasValue)
            .WithMessage("Max amount must be greater than or equal to 0.");

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
            .Must(sortBy => AllowedSortFields.Contains(sortBy.Trim()))
            .WithMessage(
                "Sort by must be one of: createdAt, amount, status, riskScore, riskLevel, transactionCode, paymentType.");

        RuleFor(query => query.SortDirection)
            .Must(direction => AllowedSortDirections.Contains(direction.Trim()))
            .WithMessage("Sort direction must be asc or desc.");
    }
}
