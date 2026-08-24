using Microsoft.AspNetCore.Mvc;

namespace PaymentRiskMonitoring.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new
        {
            status = "healthy",
            service = "Payment Risk Monitoring System",
            databaseCheck = "/health/ready",
            timestamp = DateTime.UtcNow
        });
    }
}
