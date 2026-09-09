using Microsoft.EntityFrameworkCore;
using PaymentRiskMonitoring.Api.Audit;
using PaymentRiskMonitoring.Api.Data;
using PaymentRiskMonitoring.Api.DTOs.Audit;
using PaymentRiskMonitoring.Api.Entities;
using PaymentRiskMonitoring.Api.Models.Responses;

namespace PaymentRiskMonitoring.Api.Services;

public class AuditLogService
{
    private readonly AppDbContext _dbContext;
    private readonly ILogger<AuditLogService> _logger;
    private readonly TimeProvider _timeProvider;

    public AuditLogService(
        AppDbContext dbContext,
        ILogger<AuditLogService> logger,
        TimeProvider timeProvider)
    {
        _dbContext = dbContext;
        _logger = logger;
        _timeProvider = timeProvider;
    }

    public async Task WriteAsync(AuditEntry entry, CancellationToken cancellationToken = default)
    {
        try
        {
            var log = new AuditLog
            {
                Id = Guid.NewGuid(),
                UserId = entry.UserId,
                UserEmail = Truncate(entry.UserEmail, 256),
                UserName = Truncate(entry.UserName, 200),
                Action = Truncate(entry.Action, 100) ?? string.Empty,
                EntityType = Truncate(entry.EntityType, 100) ?? string.Empty,
                EntityId = Truncate(entry.EntityId, 100),
                Summary = Truncate(entry.Summary, 500) ?? string.Empty,
                Details = Truncate(entry.Details, 4000),
                IpAddress = Truncate(entry.IpAddress, 64),
                CreatedAt = _timeProvider.GetUtcNow().UtcDateTime
            };

            _dbContext.AuditLogs.Add(log);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to write audit log for action {Action} on {EntityType}/{EntityId}.",
                entry.Action,
                entry.EntityType,
                entry.EntityId);
        }
    }

    public async Task<PagedResult<AuditLogDto>> GetLogsAsync(
        AuditLogListQuery query,
        CancellationToken cancellationToken = default)
    {
        var logsQuery = _dbContext.AuditLogs.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLowerInvariant();
            logsQuery = logsQuery.Where(log =>
                (log.Summary != null && log.Summary.ToLower().Contains(search))
                || (log.UserEmail != null && log.UserEmail.ToLower().Contains(search))
                || (log.UserName != null && log.UserName.ToLower().Contains(search))
                || (log.EntityId != null && log.EntityId.ToLower().Contains(search))
                || (log.Action != null && log.Action.ToLower().Contains(search)));
        }

        if (!string.IsNullOrWhiteSpace(query.Action))
        {
            var action = query.Action.Trim();
            logsQuery = logsQuery.Where(log => log.Action == action);
        }

        if (!string.IsNullOrWhiteSpace(query.EntityType))
        {
            var entityType = query.EntityType.Trim();
            logsQuery = logsQuery.Where(log => log.EntityType == entityType);
        }

        if (query.UserId.HasValue)
        {
            logsQuery = logsQuery.Where(log => log.UserId == query.UserId.Value);
        }

        if (query.CreatedFrom.HasValue)
        {
            var from = NormalizeToUtc(query.CreatedFrom.Value);
            logsQuery = logsQuery.Where(log => log.CreatedAt >= from);
        }

        if (query.CreatedTo.HasValue)
        {
            var to = NormalizeToUtc(query.CreatedTo.Value);
            logsQuery = logsQuery.Where(log => log.CreatedAt <= to);
        }

        var totalCount = await logsQuery.CountAsync(cancellationToken);

        var items = await logsQuery
            .OrderByDescending(log => log.CreatedAt)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(log => new AuditLogDto
            {
                Id = log.Id,
                UserId = log.UserId,
                UserEmail = log.UserEmail,
                UserName = log.UserName,
                Action = log.Action,
                EntityType = log.EntityType,
                EntityId = log.EntityId,
                Summary = log.Summary,
                Details = log.Details,
                IpAddress = log.IpAddress,
                CreatedAt = log.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return new PagedResult<AuditLogDto>
        {
            Items = items,
            Page = query.Page,
            PageSize = query.PageSize,
            TotalCount = totalCount
        };
    }

    public async Task<IReadOnlyList<string>> GetDistinctActionsAsync(
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.AuditLogs
            .AsNoTracking()
            .Select(log => log.Action)
            .Distinct()
            .OrderBy(action => action)
            .ToListAsync(cancellationToken);
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

    private static string? Truncate(string? value, int maxLength)
    {
        if (string.IsNullOrEmpty(value))
        {
            return value;
        }

        return value.Length <= maxLength ? value : value[..maxLength];
    }
}
