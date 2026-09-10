using FluentAssertions;
using PaymentRiskMonitoring.Api.DTOs.Dashboard;
using PaymentRiskMonitoring.Api.Services;

namespace PaymentRiskMonitoring.Api.Tests;

public class DashboardServiceTests
{
    [Fact]
    public async Task GetSummaryAsync_Default24HourWindow_Returns24HourlyBuckets()
    {
        await using var db = TestDbContextFactory.Create();
        var fixedNow = new DateTimeOffset(2026, 3, 10, 9, 15, 0, TimeSpan.Zero);
        var service = new DashboardService(db, new FakeTimeProvider(fixedNow));

        var summary = await service.GetSummaryAsync(new DashboardSummaryQuery());

        summary.HourlyTransactions.Should().HaveCount(24);
        summary.HourlyTransactions.Select(b => b.HourUtc).Should().OnlyHaveUniqueItems();
        summary.HourlyTransactions.First().HourUtc.Should().Be(
            new DateTime(2026, 3, 9, 9, 0, 0, DateTimeKind.Utc));
        summary.HourlyTransactions.Last().HourUtc.Should().Be(
            new DateTime(2026, 3, 10, 8, 0, 0, DateTimeKind.Utc));
    }

    private sealed class FakeTimeProvider(DateTimeOffset utcNow) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => utcNow;
    }
}
