using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using PaymentRiskMonitoring.Api.Authorization;
using PaymentRiskMonitoring.Api.Realtime;

namespace PaymentRiskMonitoring.Api.Hubs;

[Authorize(Policy = AuthorizationPolicies.StaffRead)]
public class MonitoringHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, MonitoringRealtime.Groups.Staff);

        if (Context.User?.IsInRole(AppRoles.Admin) == true
            || Context.User?.IsInRole(AppRoles.Analyst) == true)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, MonitoringRealtime.Groups.Analysts);
        }

        await base.OnConnectedAsync();
    }
}
