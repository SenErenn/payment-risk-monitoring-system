using PaymentRiskMonitoring.Api.Enums;

namespace PaymentRiskMonitoring.Api.DTOs.Cards;

public class CardListQuery
{
    public int Page { get; set; } = 1;

    public int PageSize { get; set; } = 10;

    public string? Search { get; set; }

    public CardStatus? Status { get; set; }

    public CardType? CardType { get; set; }
}
