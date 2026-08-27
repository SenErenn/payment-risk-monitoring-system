using FluentValidation;
using PaymentRiskMonitoring.Api.DTOs.Cards;

namespace PaymentRiskMonitoring.Api.Validators;

public class CardListQueryValidator : AbstractValidator<CardListQuery>
{
    public CardListQueryValidator()
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
            .WithMessage("Card status is invalid.");

        RuleFor(query => query.CardType)
            .IsInEnum()
            .When(query => query.CardType.HasValue)
            .WithMessage("Card type is invalid.");
    }
}
