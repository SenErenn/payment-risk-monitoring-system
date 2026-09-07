using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PaymentRiskMonitoring.Api.Authorization;
using PaymentRiskMonitoring.Api.DTOs.RiskAlerts;
using PaymentRiskMonitoring.Api.Enums;
using PaymentRiskMonitoring.Api.Models.Responses;
using PaymentRiskMonitoring.Api.Services;

namespace PaymentRiskMonitoring.Api.Controllers;

[ApiController]
[Route("api/risk-alerts")]
[Authorize(Policy = AuthorizationPolicies.AnalystOrAdmin)]
public class RiskAlertsController : ControllerBase
{
    private readonly RiskAlertService _riskAlertService;

    public RiskAlertsController(RiskAlertService riskAlertService)
    {
        _riskAlertService = riskAlertService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<RiskAlertDto>>>> GetAlerts(
        [FromQuery] RiskAlertListQuery query,
        CancellationToken cancellationToken)
    {
        var result = await _riskAlertService.GetAlertsAsync(query, cancellationToken);
        return Ok(ApiResponse<PagedResult<RiskAlertDto>>.Ok(result, "Risk alerts retrieved."));
    }

    [HttpGet("open")]
    public async Task<ActionResult<ApiResponse<PagedResult<RiskAlertDto>>>> GetOpenAlerts(
        [FromQuery] RiskAlertListQuery query,
        CancellationToken cancellationToken)
    {
        query.Status = AlertStatus.Open;
        var result = await _riskAlertService.GetAlertsAsync(query, cancellationToken);
        return Ok(ApiResponse<PagedResult<RiskAlertDto>>.Ok(result, "Open risk alerts retrieved."));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<RiskAlertDto>>> GetAlertById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var alert = await _riskAlertService.GetAlertByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<RiskAlertDto>.Ok(alert, "Risk alert retrieved."));
    }
}
