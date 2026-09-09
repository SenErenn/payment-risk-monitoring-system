using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PaymentRiskMonitoring.Api.Authorization;
using PaymentRiskMonitoring.Api.DTOs.Audit;
using PaymentRiskMonitoring.Api.Models.Responses;
using PaymentRiskMonitoring.Api.Services;

namespace PaymentRiskMonitoring.Api.Controllers;

[ApiController]
[Route("api/audit-logs")]
[Authorize(Policy = AuthorizationPolicies.AdminOnly)]
public class AuditLogsController : ControllerBase
{
    private readonly AuditLogService _auditLogService;

    public AuditLogsController(AuditLogService auditLogService)
    {
        _auditLogService = auditLogService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<AuditLogDto>>>> GetLogs(
        [FromQuery] AuditLogListQuery query,
        CancellationToken cancellationToken)
    {
        var result = await _auditLogService.GetLogsAsync(query, cancellationToken);
        return Ok(ApiResponse<PagedResult<AuditLogDto>>.Ok(result, "Audit logs retrieved."));
    }

    [HttpGet("actions")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<string>>>> GetActions(
        CancellationToken cancellationToken)
    {
        var actions = await _auditLogService.GetDistinctActionsAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<string>>.Ok(actions, "Audit actions retrieved."));
    }
}
