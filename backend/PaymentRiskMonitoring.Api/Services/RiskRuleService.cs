using Microsoft.EntityFrameworkCore;
using PaymentRiskMonitoring.Api.Data;
using PaymentRiskMonitoring.Api.DTOs.RiskRules;
using PaymentRiskMonitoring.Api.Entities;
using PaymentRiskMonitoring.Api.Enums;
using PaymentRiskMonitoring.Api.Exceptions;

namespace PaymentRiskMonitoring.Api.Services;

public class RiskRuleService
{
    private readonly AppDbContext _dbContext;

    public RiskRuleService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<RiskRuleDto>> GetRulesAsync(
        CancellationToken cancellationToken = default)
    {
        var rules = await _dbContext.RiskRules
            .AsNoTracking()
            .OrderBy(rule => rule.SortOrder)
            .ThenBy(rule => rule.Code)
            .ToListAsync(cancellationToken);

        return rules.Select(MapRule).ToList();
    }

    public async Task<RiskRuleDto> GetRuleByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var rule = await _dbContext.RiskRules
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (rule is null)
        {
            throw new NotFoundException("RiskRule", id);
        }

        return MapRule(rule);
    }

    public async Task<RiskRuleDto> UpdateRuleAsync(
        Guid id,
        UpdateRiskRuleRequest request,
        CancellationToken cancellationToken = default)
    {
        var rule = await _dbContext.RiskRules
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (rule is null)
        {
            throw new NotFoundException("RiskRule", id);
        }

        ValidateThresholdForUnit(rule.ThresholdUnit, request.Threshold);

        rule.Threshold = request.Threshold;
        rule.Points = request.Points;
        rule.IsEnabled = request.IsEnabled;
        rule.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return MapRule(rule);
    }

    private static void ValidateThresholdForUnit(
        RiskRuleThresholdUnit unit,
        decimal threshold)
    {
        switch (unit)
        {
            case RiskRuleThresholdUnit.Ratio:
                if (threshold is <= 0 or > 1)
                {
                    throw new ValidationException(
                        "Invalid threshold for ratio rule.",
                        ["Ratio threshold must be greater than 0 and at most 1."]);
                }

                break;

            case RiskRuleThresholdUnit.Count:
                if (threshold < 1 || threshold != decimal.Truncate(threshold))
                {
                    throw new ValidationException(
                        "Invalid threshold for count rule.",
                        ["Count threshold must be a whole number of at least 1."]);
                }

                break;

            case RiskRuleThresholdUnit.Multiplier:
                if (threshold < 1)
                {
                    throw new ValidationException(
                        "Invalid threshold for multiplier rule.",
                        ["Multiplier threshold must be at least 1."]);
                }

                break;

            case RiskRuleThresholdUnit.Amount:
                if (threshold <= 0)
                {
                    throw new ValidationException(
                        "Invalid threshold for amount rule.",
                        ["Amount threshold must be greater than 0."]);
                }

                break;
        }
    }

    private static RiskRuleDto MapRule(RiskRule rule)
    {
        return new RiskRuleDto
        {
            Id = rule.Id,
            Code = rule.Code,
            Name = rule.Name,
            Description = rule.Description,
            Threshold = rule.Threshold,
            ThresholdUnit = rule.ThresholdUnit,
            Points = rule.Points,
            IsEnabled = rule.IsEnabled,
            SortOrder = rule.SortOrder,
            CreatedAt = rule.CreatedAt,
            UpdatedAt = rule.UpdatedAt
        };
    }
}
