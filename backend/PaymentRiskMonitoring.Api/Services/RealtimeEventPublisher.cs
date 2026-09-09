using Microsoft.AspNetCore.SignalR;
using PaymentRiskMonitoring.Api.DTOs.RiskAlerts;
using PaymentRiskMonitoring.Api.DTOs.Transactions;
using PaymentRiskMonitoring.Api.Hubs;
using PaymentRiskMonitoring.Api.Realtime;

namespace PaymentRiskMonitoring.Api.Services;

public class RealtimeEventPublisher : IRealtimeEventPublisher
{
    private readonly IHubContext<MonitoringHub> _hubContext;
    private readonly ILogger<RealtimeEventPublisher> _logger;

    public RealtimeEventPublisher(
        IHubContext<MonitoringHub> hubContext,
        ILogger<RealtimeEventPublisher> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task PublishTransactionCreatedAsync(
        TransactionDto transaction,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await _hubContext.Clients
                .Group(MonitoringRealtime.Groups.Staff)
                .SendAsync(
                    MonitoringRealtime.Events.TransactionCreated,
                    transaction,
                    cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Failed to publish {Event} for transaction {TransactionCode}.",
                MonitoringRealtime.Events.TransactionCreated,
                transaction.TransactionCode);
        }
    }

    public async Task PublishRiskAlertCreatedAsync(
        RiskAlertDto alert,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await _hubContext.Clients
                .Group(MonitoringRealtime.Groups.Analysts)
                .SendAsync(
                    MonitoringRealtime.Events.RiskAlertCreated,
                    alert,
                    cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Failed to publish {Event} for alert {AlertCode}.",
                MonitoringRealtime.Events.RiskAlertCreated,
                alert.AlertCode);
        }
    }
}
