using Microsoft.EntityFrameworkCore;
using PaymentRiskMonitoring.Api.Data;
using PaymentRiskMonitoring.Api.DTOs.Merchants;
using PaymentRiskMonitoring.Api.Entities;
using PaymentRiskMonitoring.Api.Exceptions;
using PaymentRiskMonitoring.Api.Models.Responses;

namespace PaymentRiskMonitoring.Api.Services;

public class MerchantService
{
    private readonly AppDbContext _dbContext;

    public MerchantService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<PagedResult<MerchantDto>> GetMerchantsAsync(
        MerchantListQuery query,
        CancellationToken cancellationToken = default)
    {
        var merchantsQuery = _dbContext.Merchants.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLowerInvariant();
            merchantsQuery = merchantsQuery.Where(merchant =>
                merchant.MerchantCode.ToLower().Contains(search) ||
                merchant.Name.ToLower().Contains(search) ||
                merchant.Category.ToLower().Contains(search));
        }

        if (query.IsActive.HasValue)
        {
            merchantsQuery = merchantsQuery.Where(merchant => merchant.IsActive == query.IsActive.Value);
        }

        var totalCount = await merchantsQuery.CountAsync(cancellationToken);

        var merchants = await merchantsQuery
            .OrderBy(merchant => merchant.Name)
            .ThenBy(merchant => merchant.MerchantCode)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<MerchantDto>
        {
            Items = merchants.Select(MapMerchant).ToList(),
            Page = query.Page,
            PageSize = query.PageSize,
            TotalCount = totalCount
        };
    }

    public async Task<MerchantDto> GetMerchantByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var merchant = await _dbContext.Merchants
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (merchant is null)
        {
            throw new NotFoundException("Merchant", id);
        }

        return MapMerchant(merchant);
    }

    public async Task<MerchantDto> CreateMerchantAsync(
        CreateMerchantRequest request,
        CancellationToken cancellationToken = default)
    {
        var merchantCode = NormalizeMerchantCode(request.MerchantCode);

        await EnsureMerchantCodeIsUniqueAsync(merchantCode, excludeId: null, cancellationToken);

        var now = DateTime.UtcNow;
        var merchant = new Merchant
        {
            Id = Guid.NewGuid(),
            MerchantCode = merchantCode,
            Name = request.Name.Trim(),
            Category = request.Category.Trim(),
            IsActive = request.IsActive,
            CreatedAt = now,
            UpdatedAt = now
        };

        _dbContext.Merchants.Add(merchant);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return MapMerchant(merchant);
    }

    public async Task<MerchantDto> UpdateMerchantAsync(
        Guid id,
        UpdateMerchantRequest request,
        CancellationToken cancellationToken = default)
    {
        var merchant = await _dbContext.Merchants
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (merchant is null)
        {
            throw new NotFoundException("Merchant", id);
        }

        merchant.Name = request.Name.Trim();
        merchant.Category = request.Category.Trim();
        merchant.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return MapMerchant(merchant);
    }

    public async Task<MerchantDto> ActivateMerchantAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        return await SetActiveStatusAsync(id, isActive: true, cancellationToken);
    }

    public async Task<MerchantDto> DeactivateMerchantAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        return await SetActiveStatusAsync(id, isActive: false, cancellationToken);
    }

    private async Task<MerchantDto> SetActiveStatusAsync(
        Guid id,
        bool isActive,
        CancellationToken cancellationToken)
    {
        var merchant = await _dbContext.Merchants
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (merchant is null)
        {
            throw new NotFoundException("Merchant", id);
        }

        if (merchant.IsActive == isActive)
        {
            return MapMerchant(merchant);
        }

        merchant.IsActive = isActive;
        merchant.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);

        return MapMerchant(merchant);
    }

    private async Task EnsureMerchantCodeIsUniqueAsync(
        string merchantCode,
        Guid? excludeId,
        CancellationToken cancellationToken)
    {
        var exists = await _dbContext.Merchants.AnyAsync(
            merchant =>
                merchant.MerchantCode == merchantCode &&
                (!excludeId.HasValue || merchant.Id != excludeId.Value),
            cancellationToken);

        if (exists)
        {
            throw new AppException(
                $"Merchant code '{merchantCode}' is already in use.",
                StatusCodes.Status409Conflict);
        }
    }

    private static string NormalizeMerchantCode(string merchantCode)
    {
        return merchantCode.Trim().ToUpperInvariant();
    }

    private static MerchantDto MapMerchant(Merchant merchant)
    {
        return new MerchantDto
        {
            Id = merchant.Id,
            MerchantCode = merchant.MerchantCode,
            Name = merchant.Name,
            Category = merchant.Category,
            IsActive = merchant.IsActive,
            CreatedAt = merchant.CreatedAt,
            UpdatedAt = merchant.UpdatedAt
        };
    }
}
