using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PaymentRiskMonitoring.Api.Authorization;
using PaymentRiskMonitoring.Api.DTOs.Dashboard;
using PaymentRiskMonitoring.Api.Models.Responses;
using PaymentRiskMonitoring.Api.Services;

namespace PaymentRiskMonitoring.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize(Policy = AuthorizationPolicies.StaffRead)]
public class DashboardController : ControllerBase
{
    private readonly DashboardService _dashboardService;

    public DashboardController(DashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    [HttpGet("summary")]
    public async Task<ActionResult<ApiResponse<DashboardSummaryDto>>> GetSummary(
        [FromQuery] DashboardSummaryQuery query,
        CancellationToken cancellationToken)
    {
        var summary = await _dashboardService.GetSummaryAsync(query, cancellationToken);
        return Ok(ApiResponse<DashboardSummaryDto>.Ok(summary, "Dashboard summary retrieved."));
    }
}
