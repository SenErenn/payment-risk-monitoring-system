using Microsoft.AspNetCore.Mvc;
using PaymentRiskMonitoring.Api.Models.Responses;

namespace PaymentRiskMonitoring.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public ActionResult<ApiResponse<object>> Get()
    {
        var payload = new
        {
            status = "healthy",
            service = "Payment Risk Monitoring System",
            databaseCheck = "/health/ready",
            timestamp = DateTime.UtcNow
        };

        return Ok(ApiResponse<object>.Ok(payload, "API is healthy."));
    }
}
