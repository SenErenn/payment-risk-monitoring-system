namespace PaymentRiskMonitoring.Api.DTOs.Dashboard;

public class DashboardSummaryDto
{
    public DateTime FromUtc { get; init; }

    public DateTime ToUtc { get; init; }

    public DashboardKpisDto Kpis { get; init; } = new();

    public IReadOnlyList<HourlyBucketDto> HourlyTransactions { get; init; } = [];

    public IReadOnlyList<NamedCountDto> StatusDistribution { get; init; } = [];

    public IReadOnlyList<NamedCountDto> RiskDistribution { get; init; } = [];

    public IReadOnlyList<TopMerchantDto> TopMerchants { get; init; } = [];
}

public class DashboardKpisDto
{
    public int TotalTransactions { get; init; }

    public decimal TransactionVolume { get; init; }

    public string Currency { get; init; } = "TRY";

    public int ApprovedCount { get; init; }

    public int DeclinedCount { get; init; }

    public int HighRiskCount { get; init; }

    public int OpenAlertsCount { get; init; }

    /// <summary>Approved / (Approved + Declined), 0–1.</summary>
    public decimal ApprovalRate { get; init; }

    public decimal AverageAmount { get; init; }
}

public class HourlyBucketDto
{
    public DateTime HourUtc { get; init; }

    public int Count { get; init; }
}

public class NamedCountDto
{
    public string Key { get; init; } = string.Empty;

    public int Count { get; init; }
}

public class TopMerchantDto
{
    public Guid MerchantId { get; init; }

    public string MerchantCode { get; init; } = string.Empty;

    public string Name { get; init; } = string.Empty;

    public int TransactionCount { get; init; }

    public decimal Volume { get; init; }
}
