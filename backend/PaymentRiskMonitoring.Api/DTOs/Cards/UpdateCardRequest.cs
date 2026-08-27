namespace PaymentRiskMonitoring.Api.DTOs.Cards;

public class UpdateCardRequest
{
    public decimal CreditLimit { get; set; }

    public decimal AvailableLimit { get; set; }
}
