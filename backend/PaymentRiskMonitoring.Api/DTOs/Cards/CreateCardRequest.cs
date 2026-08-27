using PaymentRiskMonitoring.Api.Enums;

namespace PaymentRiskMonitoring.Api.DTOs.Cards;

public class CreateCardRequest
{
    public CardType CardType { get; set; }

    public decimal CreditLimit { get; set; }

    public decimal AvailableLimit { get; set; }

    public string LastFourDigits { get; set; } = string.Empty;

    public CardStatus Status { get; set; } = CardStatus.Active;
}
