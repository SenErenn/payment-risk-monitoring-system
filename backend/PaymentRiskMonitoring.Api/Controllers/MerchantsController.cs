using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PaymentRiskMonitoring.Api.Authorization;
using PaymentRiskMonitoring.Api.DTOs.Analytics;
using PaymentRiskMonitoring.Api.DTOs.Merchants;
using PaymentRiskMonitoring.Api.Models.Responses;
using PaymentRiskMonitoring.Api.Services;

namespace PaymentRiskMonitoring.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MerchantsController : ControllerBase
{
    private readonly MerchantService _merchantService;
    private readonly EntityAnalyticsService _entityAnalyticsService;

    public MerchantsController(
        MerchantService merchantService,
        EntityAnalyticsService entityAnalyticsService)
    {
        _merchantService = merchantService;
        _entityAnalyticsService = entityAnalyticsService;
    }

    [Authorize(Policy = AuthorizationPolicies.StaffRead)]
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<MerchantDto>>>> GetMerchants(
        [FromQuery] MerchantListQuery query,
        CancellationToken cancellationToken)
    {
        var result = await _merchantService.GetMerchantsAsync(query, cancellationToken);
        return Ok(ApiResponse<PagedResult<MerchantDto>>.Ok(result, "Merchants retrieved."));
    }

    [Authorize(Policy = AuthorizationPolicies.StaffRead)]
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<MerchantDto>>> GetMerchantById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var merchant = await _merchantService.GetMerchantByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<MerchantDto>.Ok(merchant, "Merchant retrieved."));
    }

    [Authorize(Policy = AuthorizationPolicies.StaffRead)]
    [HttpGet("{id:guid}/analytics")]
    public async Task<ActionResult<ApiResponse<MerchantAnalyticsDto>>> GetMerchantAnalytics(
        Guid id,
        [FromQuery] AnalyticsRangeQuery query,
        CancellationToken cancellationToken)
    {
        var analytics = await _entityAnalyticsService.GetMerchantAnalyticsAsync(
            id,
            query,
            cancellationToken);
        return Ok(ApiResponse<MerchantAnalyticsDto>.Ok(analytics, "Merchant analytics retrieved."));
    }

    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    [HttpPost]
    public async Task<ActionResult<ApiResponse<MerchantDto>>> CreateMerchant(
        [FromBody] CreateMerchantRequest request,
        CancellationToken cancellationToken)
    {
        var merchant = await _merchantService.CreateMerchantAsync(request, cancellationToken);
        return CreatedAtAction(
            nameof(GetMerchantById),
            new { id = merchant.Id },
            ApiResponse<MerchantDto>.Ok(merchant, "Merchant created."));
    }

    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<MerchantDto>>> UpdateMerchant(
        Guid id,
        [FromBody] UpdateMerchantRequest request,
        CancellationToken cancellationToken)
    {
        var merchant = await _merchantService.UpdateMerchantAsync(id, request, cancellationToken);
        return Ok(ApiResponse<MerchantDto>.Ok(merchant, "Merchant updated."));
    }

    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    [HttpPost("{id:guid}/activate")]
    public async Task<ActionResult<ApiResponse<MerchantDto>>> ActivateMerchant(
        Guid id,
        CancellationToken cancellationToken)
    {
        var merchant = await _merchantService.ActivateMerchantAsync(id, cancellationToken);
        return Ok(ApiResponse<MerchantDto>.Ok(merchant, "Merchant activated."));
    }

    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    [HttpPost("{id:guid}/deactivate")]
    public async Task<ActionResult<ApiResponse<MerchantDto>>> DeactivateMerchant(
        Guid id,
        CancellationToken cancellationToken)
    {
        var merchant = await _merchantService.DeactivateMerchantAsync(id, cancellationToken);
        return Ok(ApiResponse<MerchantDto>.Ok(merchant, "Merchant deactivated."));
    }
}
