using PaymentRiskMonitoring.Api.Enums;

namespace PaymentRiskMonitoring.Api.Entities;

public class Card
{
    public Guid Id { get; set; }

    public string CardToken { get; set; } = string.Empty;

    public string MaskedCardNumber { get; set; } = string.Empty;

    public CardType CardType { get; set; }

    public CardStatus Status { get; set; }

    public decimal CreditLimit { get; set; }

    public decimal AvailableLimit { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
