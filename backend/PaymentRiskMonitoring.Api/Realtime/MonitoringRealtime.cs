namespace PaymentRiskMonitoring.Api.Realtime;

public static class MonitoringRealtime
{
    public const string HubPath = "/hubs/monitoring";

    public static class Groups
    {
        public const string Staff = "staff";
        public const string Analysts = "analysts";
    }

    public static class Events
    {
        public const string TransactionCreated = "TransactionCreated";
        public const string RiskAlertCreated = "RiskAlertCreated";
    }
}
