namespace PaymentRiskMonitoring.Api.Enums;

public enum TransactionStatus
{
    Pending = 1,
    Approved = 2,
    Declined = 3,
    Refunded = 4,
    PartiallyRefunded = 5
}
