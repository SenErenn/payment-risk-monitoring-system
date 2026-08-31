namespace PaymentRiskMonitoring.Api.DTOs.Transactions;

public sealed class CreateTransactionResult
{
    public required TransactionDto Transaction { get; init; }

    public bool WasCreated { get; init; }
}
