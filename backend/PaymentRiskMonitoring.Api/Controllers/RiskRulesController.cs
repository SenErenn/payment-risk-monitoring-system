using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PaymentRiskMonitoring.Api.Authorization;
using PaymentRiskMonitoring.Api.DTOs.RiskRules;
using PaymentRiskMonitoring.Api.Models.Responses;
using PaymentRiskMonitoring.Api.Services;

namespace PaymentRiskMonitoring.Api.Controllers;

[ApiController]
[Route("api/risk-rules")]
[Authorize(Policy = AuthorizationPolicies.AdminOnly)]
public class RiskRulesController : ControllerBase
{
    private readonly RiskRuleService _riskRuleService;

    public RiskRulesController(RiskRuleService riskRuleService)
    {
        _riskRuleService = riskRuleService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<RiskRuleDto>>>> GetRules(
        CancellationToken cancellationToken)
    {
        var rules = await _riskRuleService.GetRulesAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<RiskRuleDto>>.Ok(rules, "Risk rules retrieved."));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<RiskRuleDto>>> GetRuleById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var rule = await _riskRuleService.GetRuleByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<RiskRuleDto>.Ok(rule, "Risk rule retrieved."));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<RiskRuleDto>>> UpdateRule(
        Guid id,
        [FromBody] UpdateRiskRuleRequest request,
        CancellationToken cancellationToken)
    {
        var rule = await _riskRuleService.UpdateRuleAsync(id, request, cancellationToken);
        return Ok(ApiResponse<RiskRuleDto>.Ok(rule, "Risk rule updated."));
    }
}
