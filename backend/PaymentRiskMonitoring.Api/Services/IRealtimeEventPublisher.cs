using PaymentRiskMonitoring.Api.DTOs.RiskAlerts;
using PaymentRiskMonitoring.Api.DTOs.Transactions;

namespace PaymentRiskMonitoring.Api.Services;

public interface IRealtimeEventPublisher
{
    Task PublishTransactionCreatedAsync(
        TransactionDto transaction,
        CancellationToken cancellationToken = default);

    Task PublishRiskAlertCreatedAsync(
        RiskAlertDto alert,
        CancellationToken cancellationToken = default);
}
