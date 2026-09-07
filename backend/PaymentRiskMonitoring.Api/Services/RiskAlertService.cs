using Microsoft.EntityFrameworkCore;
using PaymentRiskMonitoring.Api.Data;
using PaymentRiskMonitoring.Api.DTOs.RiskAlerts;
using PaymentRiskMonitoring.Api.Entities;
using PaymentRiskMonitoring.Api.Enums;
using PaymentRiskMonitoring.Api.Exceptions;
using PaymentRiskMonitoring.Api.Models.Responses;

namespace PaymentRiskMonitoring.Api.Services;

public class RiskAlertService
{
    private readonly AppDbContext _dbContext;

    public RiskAlertService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<PagedResult<RiskAlertDto>> GetAlertsAsync(
        RiskAlertListQuery query,
        CancellationToken cancellationToken = default)
    {
        var alertsQuery = _dbContext.RiskAlerts
            .AsNoTracking()
            .Include(alert => alert.Transaction)
                .ThenInclude(transaction => transaction.Merchant)
            .Include(alert => alert.Transaction)
                .ThenInclude(transaction => transaction.Card)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLowerInvariant();
            alertsQuery = alertsQuery.Where(alert =>
                alert.AlertCode.ToLower().Contains(search) ||
                alert.Transaction.TransactionCode.ToLower().Contains(search) ||
                alert.Transaction.Merchant.MerchantCode.ToLower().Contains(search) ||
                alert.Transaction.Merchant.Name.ToLower().Contains(search) ||
                alert.Transaction.Card.MaskedCardNumber.ToLower().Contains(search));
        }

        if (query.Status.HasValue)
        {
            alertsQuery = alertsQuery.Where(alert => alert.Status == query.Status.Value);
        }

        if (query.RiskLevel.HasValue)
        {
            alertsQuery = alertsQuery.Where(alert => alert.RiskLevel == query.RiskLevel.Value);
        }

        if (query.MerchantId.HasValue)
        {
            alertsQuery = alertsQuery.Where(alert =>
                alert.Transaction.MerchantId == query.MerchantId.Value);
        }

        if (query.CardId.HasValue)
        {
            alertsQuery = alertsQuery.Where(alert =>
                alert.Transaction.CardId == query.CardId.Value);
        }

        if (query.TransactionId.HasValue)
        {
            alertsQuery = alertsQuery.Where(alert =>
                alert.TransactionId == query.TransactionId.Value);
        }

        if (query.CreatedFrom.HasValue)
        {
            var createdFrom = NormalizeToUtc(query.CreatedFrom.Value);
            alertsQuery = alertsQuery.Where(alert => alert.CreatedAt >= createdFrom);
        }

        if (query.CreatedTo.HasValue)
        {
            var createdTo = NormalizeToUtc(query.CreatedTo.Value);
            alertsQuery = alertsQuery.Where(alert => alert.CreatedAt <= createdTo);
        }

        var totalCount = await alertsQuery.CountAsync(cancellationToken);

        alertsQuery = ApplySorting(alertsQuery, query.SortBy, query.SortDirection);

        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);

        var items = await alertsQuery
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<RiskAlertDto>
        {
            Items = items.Select(MapAlert).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount
        };
    }

    public async Task<RiskAlertDto> GetAlertByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var alert = await _dbContext.RiskAlerts
            .AsNoTracking()
            .Include(item => item.Transaction)
                .ThenInclude(transaction => transaction.Merchant)
            .Include(item => item.Transaction)
                .ThenInclude(transaction => transaction.Card)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (alert is null)
        {
            throw new NotFoundException("RiskAlert", id);
        }

        return MapAlert(alert);
    }

    public static RiskAlert CreateOpenAlertForTransaction(Transaction transaction, DateTime utcNow)
    {
        return new RiskAlert
        {
            Id = Guid.NewGuid(),
            AlertCode = GenerateAlertCode(),
            TransactionId = transaction.Id,
            RiskLevel = transaction.RiskLevel,
            RiskScore = transaction.RiskScore,
            Status = AlertStatus.Open,
            CreatedAt = utcNow,
            UpdatedAt = utcNow,
            Transaction = transaction
        };
    }

    private static IQueryable<RiskAlert> ApplySorting(
        IQueryable<RiskAlert> query,
        string sortBy,
        string sortDirection)
    {
        var ascending = string.Equals(sortDirection.Trim(), "asc", StringComparison.OrdinalIgnoreCase);
        var field = sortBy.Trim().ToLowerInvariant();

        return field switch
        {
            "riskscore" => ascending
                ? query.OrderBy(alert => alert.RiskScore).ThenByDescending(alert => alert.CreatedAt)
                : query.OrderByDescending(alert => alert.RiskScore).ThenByDescending(alert => alert.CreatedAt),
            "risklevel" => ascending
                ? query.OrderBy(alert => alert.RiskLevel).ThenByDescending(alert => alert.CreatedAt)
                : query.OrderByDescending(alert => alert.RiskLevel).ThenByDescending(alert => alert.CreatedAt),
            "status" => ascending
                ? query.OrderBy(alert => alert.Status).ThenByDescending(alert => alert.CreatedAt)
                : query.OrderByDescending(alert => alert.Status).ThenByDescending(alert => alert.CreatedAt),
            "alertcode" => ascending
                ? query.OrderBy(alert => alert.AlertCode)
                : query.OrderByDescending(alert => alert.AlertCode),
            _ => ascending
                ? query.OrderBy(alert => alert.CreatedAt)
                : query.OrderByDescending(alert => alert.CreatedAt)
        };
    }

    private static DateTime NormalizeToUtc(DateTime value)
    {
        return value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };
    }

    private static string GenerateAlertCode()
    {
        return $"ALT_{Guid.NewGuid():N}".ToUpperInvariant();
    }

    private static RiskAlertDto MapAlert(RiskAlert alert)
    {
        var transaction = alert.Transaction;

        return new RiskAlertDto
        {
            Id = alert.Id,
            AlertCode = alert.AlertCode,
            TransactionId = alert.TransactionId,
            TransactionCode = transaction.TransactionCode,
            MerchantId = transaction.MerchantId,
            MerchantCode = transaction.Merchant.MerchantCode,
            MerchantName = transaction.Merchant.Name,
            CardId = transaction.CardId,
            MaskedCardNumber = transaction.Card.MaskedCardNumber,
            Amount = transaction.Amount,
            Currency = transaction.Currency,
            TransactionStatus = transaction.Status,
            RiskLevel = alert.RiskLevel,
            RiskScore = alert.RiskScore,
            RiskReasons = transaction.RiskReasons?.ToList() ?? [],
            Status = alert.Status,
            CreatedAt = alert.CreatedAt,
            UpdatedAt = alert.UpdatedAt
        };
    }
}
