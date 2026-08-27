using PaymentRiskMonitoring.Api.Enums;

namespace PaymentRiskMonitoring.Api.DTOs.Cards;

public class UpdateCardStatusRequest
{
    public CardStatus Status { get; set; }
}
