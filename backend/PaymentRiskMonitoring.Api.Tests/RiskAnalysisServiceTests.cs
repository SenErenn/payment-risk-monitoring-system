using FluentAssertions;
using PaymentRiskMonitoring.Api.Enums;
using PaymentRiskMonitoring.Api.Services;

namespace PaymentRiskMonitoring.Api.Tests;

public class RiskAnalysisServiceTests
{
    [Theory]
    [InlineData(0, RiskLevel.Low)]
    [InlineData(39, RiskLevel.Low)]
    [InlineData(40, RiskLevel.Medium)]
    [InlineData(69, RiskLevel.Medium)]
    [InlineData(70, RiskLevel.High)]
    [InlineData(100, RiskLevel.High)]
    public void ResolveRiskLevel_MapsScoreBands(int score, RiskLevel expected)
    {
        RiskAnalysisService.ResolveRiskLevel(score).Should().Be(expected);
    }

    [Theory]
    [InlineData(22, true)]
    [InlineData(23, true)]
    [InlineData(5, true)]
    [InlineData(6, false)]
    [InlineData(12, false)]
    [InlineData(21, false)]
    public void IsNightUtc_UsesConfiguredWindow(int hour, bool expected)
    {
        var utc = new DateTime(2026, 1, 15, hour, 0, 0, DateTimeKind.Utc);
        RiskAnalysisService.IsNightUtc(utc).Should().Be(expected);
    }

    [Fact]
    public async Task AnalyzePaymentAsync_DeclinesInactiveMerchant()
    {
        await using var db = TestDbContextFactory.Create();
        var service = new RiskAnalysisService(db, TimeProvider.System);

        var merchant = new Entities.Merchant
        {
            Id = Guid.NewGuid(),
            MerchantCode = "M1",
            Name = "Inactive",
            IsActive = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        var card = new Entities.Card
        {
            Id = Guid.NewGuid(),
            CardToken = "tok",
            MaskedCardNumber = "****1111",
            CardType = Enums.CardType.Credit,
            Status = Enums.CardStatus.Active,
            CreditLimit = 1000,
            AvailableLimit = 1000,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var result = await service.AnalyzePaymentAsync(merchant, card, 10m);

        result.Status.Should().Be(TransactionStatus.Declined);
        result.RiskScore.Should().Be(RiskAnalysisService.OperationalDeclineScore);
        result.RiskLevel.Should().Be(RiskLevel.Low);
        result.RiskReasons.Should().Contain(r => r.Code == "MERCHANT_INACTIVE");
        result.RiskReasons.Should().OnlyContain(r => r.Points == 0);
    }

    [Fact]
    public async Task AnalyzePaymentAsync_DeclinesInsufficientLimit()
    {
        await using var db = TestDbContextFactory.Create();
        var service = new RiskAnalysisService(db, TimeProvider.System);

        var merchant = new Entities.Merchant
        {
            Id = Guid.NewGuid(),
            MerchantCode = "M1",
            Name = "Active",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        var card = new Entities.Card
        {
            Id = Guid.NewGuid(),
            CardToken = "tok",
            MaskedCardNumber = "****1111",
            CardType = Enums.CardType.Credit,
            Status = Enums.CardStatus.Active,
            CreditLimit = 100,
            AvailableLimit = 50,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var result = await service.AnalyzePaymentAsync(merchant, card, 75m);

        result.Status.Should().Be(TransactionStatus.Declined);
        result.RiskReasons.Should().Contain(r => r.Code == "INSUFFICIENT_LIMIT");
        result.RiskScore.Should().Be(RiskAnalysisService.OperationalDeclineScore);
        result.RiskLevel.Should().Be(RiskLevel.Low);
    }

    [Fact]
    public async Task AnalyzePaymentAsync_HighAmountRaisesScore()
    {
        await using var db = TestDbContextFactory.Create();
        db.RiskRules.Add(new Entities.RiskRule
        {
            Id = Guid.NewGuid(),
            Code = RiskAnalysisService.HighAmountCode,
            Name = "High amount",
            Description = "test",
            Threshold = 10_000m,
            ThresholdUnit = Enums.RiskRuleThresholdUnit.Amount,
            Points = 70,
            IsEnabled = true,
            SortOrder = 1,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var service = new RiskAnalysisService(db, TimeProvider.System);
        var merchant = new Entities.Merchant
        {
            Id = Guid.NewGuid(),
            MerchantCode = "M1",
            Name = "Active",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        var card = new Entities.Card
        {
            Id = Guid.NewGuid(),
            CardToken = "tok",
            MaskedCardNumber = "****1111",
            CardType = Enums.CardType.Credit,
            Status = Enums.CardStatus.Active,
            CreditLimit = 100_000,
            AvailableLimit = 100_000,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var result = await service.AnalyzePaymentAsync(merchant, card, 25_000m);

        result.Status.Should().Be(TransactionStatus.Approved);
        result.RiskLevel.Should().Be(RiskLevel.High);
        result.RiskReasons.Should().Contain(r => r.Code == RiskAnalysisService.HighAmountCode);
    }
}
