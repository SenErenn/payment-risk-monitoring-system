using PaymentRiskMonitoring.Api.Enums;

namespace PaymentRiskMonitoring.Api.DTOs.Cards;

public class CardDto
{
    public Guid Id { get; init; }

    public string CardToken { get; init; } = string.Empty;

    public string MaskedCardNumber { get; init; } = string.Empty;

    public CardType CardType { get; init; }

    public CardStatus Status { get; init; }

    public decimal CreditLimit { get; init; }

    public decimal AvailableLimit { get; init; }

    public DateTime CreatedAt { get; init; }

    public DateTime UpdatedAt { get; init; }
}
