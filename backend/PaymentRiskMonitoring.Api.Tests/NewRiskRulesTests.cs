using FluentAssertions;
using PaymentRiskMonitoring.Api.Data;
using PaymentRiskMonitoring.Api.Entities;
using PaymentRiskMonitoring.Api.Enums;
using PaymentRiskMonitoring.Api.Services;

namespace PaymentRiskMonitoring.Api.Tests;

public class NewRiskRulesTests
{
    private static readonly DateTime FixedNow =
        new(2026, 6, 15, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void EvaluateMultiMerchantBurst_TriggersOnDistinctMerchants()
    {
        var merchantA = Guid.NewGuid();
        var merchantB = Guid.NewGuid();
        var merchantC = Guid.NewGuid();
        var history = new List<Transaction>
        {
            Tx(merchantA, 100m, "TRY", TransactionStatus.Approved, FixedNow.AddMinutes(-3)),
            Tx(merchantB, 100m, "TRY", TransactionStatus.Approved, FixedNow.AddMinutes(-2))
        };

        var reason = RiskAnalysisService.EvaluateMultiMerchantBurst(
            history,
            merchantC,
            FixedNow,
            Enabled(3, 25));

        reason.Should().NotBeNull();
        reason!.Code.Should().Be(RiskAnalysisService.MultiMerchantBurstCode);
        reason.Points.Should().Be(25);
    }

    [Fact]
    public void EvaluateMultiMerchantBurst_DoesNotTriggerOnSameMerchant()
    {
        var merchantA = Guid.NewGuid();
        var history = new List<Transaction>
        {
            Tx(merchantA, 100m, "TRY", TransactionStatus.Approved, FixedNow.AddMinutes(-3)),
            Tx(merchantA, 100m, "TRY", TransactionStatus.Approved, FixedNow.AddMinutes(-2)),
            Tx(merchantA, 100m, "TRY", TransactionStatus.Approved, FixedNow.AddMinutes(-1))
        };

        var reason = RiskAnalysisService.EvaluateMultiMerchantBurst(
            history,
            merchantA,
            FixedNow,
            Enabled(3, 25));

        reason.Should().BeNull();
    }

    [Fact]
    public void EvaluateMultiMerchantBurst_IgnoresOutsideWindow()
    {
        var merchantA = Guid.NewGuid();
        var merchantB = Guid.NewGuid();
        var merchantC = Guid.NewGuid();
        var history = new List<Transaction>
        {
            Tx(merchantA, 100m, "TRY", TransactionStatus.Approved, FixedNow.AddMinutes(-30)),
            Tx(merchantB, 100m, "TRY", TransactionStatus.Approved, FixedNow.AddMinutes(-20))
        };

        var reason = RiskAnalysisService.EvaluateMultiMerchantBurst(
            history,
            merchantC,
            FixedNow,
            Enabled(3, 25));

        reason.Should().BeNull();
    }

    [Fact]
    public void EvaluateMultiMerchantBurst_RespectsDisabledAndThresholdConfig()
    {
        var merchantA = Guid.NewGuid();
        var merchantB = Guid.NewGuid();
        var merchantC = Guid.NewGuid();
        var history = new List<Transaction>
        {
            Tx(merchantA, 50m, "TRY", TransactionStatus.Approved, FixedNow.AddMinutes(-2)),
            Tx(merchantB, 50m, "TRY", TransactionStatus.Approved, FixedNow.AddMinutes(-1))
        };

        RiskAnalysisService.EvaluateMultiMerchantBurst(
                history,
                merchantC,
                FixedNow,
                new RiskAnalysisService.RuleSettings(false, 3, 25))
            .Should().BeNull();

        RiskAnalysisService.EvaluateMultiMerchantBurst(
                history,
                merchantC,
                FixedNow,
                Enabled(4, 25))
            .Should().BeNull();

        RiskAnalysisService.EvaluateMultiMerchantBurst(
                history,
                merchantC,
                FixedNow,
                Enabled(3, 25))
            .Should().NotBeNull();
    }

    [Fact]
    public void EvaluateRepeatedSameAmount_TriggersOnSameAmountCurrency()
    {
        var merchantId = Guid.NewGuid();
        var history = new List<Transaction>
        {
            Tx(merchantId, 5_000m, "TRY", TransactionStatus.Approved, FixedNow.AddMinutes(-2)),
            Tx(merchantId, 5_000m, "TRY", TransactionStatus.Declined, FixedNow.AddMinutes(-1))
        };

        var reason = RiskAnalysisService.EvaluateRepeatedSameAmount(
            history,
            5_000m,
            "TRY",
            FixedNow,
            Enabled(3, 20));

        reason.Should().NotBeNull();
        reason!.Code.Should().Be(RiskAnalysisService.RepeatedSameAmountCode);
    }

    [Fact]
    public void EvaluateRepeatedSameAmount_DoesNotTriggerOnDifferentAmount()
    {
        var merchantId = Guid.NewGuid();
        var history = new List<Transaction>
        {
            Tx(merchantId, 5_000m, "TRY", TransactionStatus.Approved, FixedNow.AddMinutes(-2)),
            Tx(merchantId, 5_000m, "TRY", TransactionStatus.Approved, FixedNow.AddMinutes(-1))
        };

        RiskAnalysisService.EvaluateRepeatedSameAmount(
                history,
                4_000m,
                "TRY",
                FixedNow,
                Enabled(3, 20))
            .Should().BeNull();
    }

    [Fact]
    public void EvaluateRepeatedSameAmount_DoesNotTriggerOnDifferentCurrency()
    {
        var merchantId = Guid.NewGuid();
        var history = new List<Transaction>
        {
            Tx(merchantId, 5_000m, "USD", TransactionStatus.Approved, FixedNow.AddMinutes(-2)),
            Tx(merchantId, 5_000m, "USD", TransactionStatus.Approved, FixedNow.AddMinutes(-1))
        };

        RiskAnalysisService.EvaluateRepeatedSameAmount(
                history,
                5_000m,
                "TRY",
                FixedNow,
                Enabled(3, 20))
            .Should().BeNull();
    }

    [Fact]
    public void EvaluateDeclineThenSuccess_TriggersAfterPriorDeclines()
    {
        var merchantId = Guid.NewGuid();
        var history = new List<Transaction>
        {
            Tx(merchantId, 100m, "TRY", TransactionStatus.Declined, FixedNow.AddMinutes(-3)),
            Tx(merchantId, 100m, "TRY", TransactionStatus.Declined, FixedNow.AddMinutes(-2))
        };

        var reason = RiskAnalysisService.EvaluateDeclineThenSuccess(
            history,
            FixedNow,
            Enabled(2, 20));

        reason.Should().NotBeNull();
        reason!.Code.Should().Be(RiskAnalysisService.DeclineThenSuccessCode);
    }

    [Fact]
    public void EvaluateDeclineThenSuccess_DoesNotCountOutsideWindow()
    {
        var merchantId = Guid.NewGuid();
        var history = new List<Transaction>
        {
            Tx(merchantId, 100m, "TRY", TransactionStatus.Declined, FixedNow.AddMinutes(-30)),
            Tx(merchantId, 100m, "TRY", TransactionStatus.Declined, FixedNow.AddMinutes(-20))
        };

        RiskAnalysisService.EvaluateDeclineThenSuccess(
                history,
                FixedNow,
                Enabled(2, 20))
            .Should().BeNull();
    }

    [Fact]
    public async Task AnalyzePaymentAsync_DeclineThenSuccess_OnlyOnApprovedPath()
    {
        await using var db = TestDbContextFactory.Create();
        SeedRule(db, RiskAnalysisService.DeclineThenSuccessCode, 2, 20);
        // Disable velocity / multiple declines noise where possible by high thresholds
        SeedRule(db, RiskAnalysisService.VelocityCode, 99, 25);
        SeedRule(db, RiskAnalysisService.MultipleDeclinesCode, 99, 25);
        SeedRule(db, RiskAnalysisService.MultiMerchantBurstCode, 99, 25);
        SeedRule(db, RiskAnalysisService.RepeatedSameAmountCode, 99, 20);
        await db.SaveChangesAsync();

        var merchant = ActiveMerchant();
        var card = ActiveCard(available: 50_000m);
        db.Merchants.Add(merchant);
        db.Cards.Add(card);
        db.Transactions.AddRange(
            Tx(merchant.Id, 10m, "TRY", TransactionStatus.Declined, FixedNow.AddMinutes(-2), card.Id),
            Tx(merchant.Id, 10m, "TRY", TransactionStatus.Declined, FixedNow.AddMinutes(-1), card.Id));
        await db.SaveChangesAsync();

        var service = new RiskAnalysisService(db, new FakeTimeProvider(FixedNow));

        var approved = await service.AnalyzePaymentAsync(merchant, card, 25m, "TRY");
        approved.Status.Should().Be(TransactionStatus.Approved);
        approved.RiskReasons.Should().Contain(r => r.Code == RiskAnalysisService.DeclineThenSuccessCode);

        // Another decline path never reaches approved rule evaluation — insufficient limit
        card.AvailableLimit = 5m;
        var declined = await service.AnalyzePaymentAsync(merchant, card, 25m, "TRY");
        declined.Status.Should().Be(TransactionStatus.Declined);
        declined.RiskReasons.Should().NotContain(r => r.Code == RiskAnalysisService.DeclineThenSuccessCode);
    }

    [Fact]
    public async Task AnalyzePaymentAsync_MultiMerchantBurst_UsesDatabaseThreshold()
    {
        await using var db = TestDbContextFactory.Create();
        SeedRule(db, RiskAnalysisService.MultiMerchantBurstCode, 3, 25);
        SeedRule(db, RiskAnalysisService.VelocityCode, 99, 25);
        SeedRule(db, RiskAnalysisService.RepeatedSameAmountCode, 99, 20);
        SeedRule(db, RiskAnalysisService.DeclineThenSuccessCode, 99, 20);
        SeedRule(db, RiskAnalysisService.MultipleDeclinesCode, 99, 25);
        await db.SaveChangesAsync();

        var merchantA = ActiveMerchant();
        var merchantB = ActiveMerchant();
        var merchantC = ActiveMerchant();
        var card = ActiveCard(available: 50_000m);
        db.Merchants.AddRange(merchantA, merchantB, merchantC);
        db.Cards.Add(card);
        db.Transactions.AddRange(
            Tx(merchantA.Id, 40m, "TRY", TransactionStatus.Approved, FixedNow.AddMinutes(-2), card.Id),
            Tx(merchantB.Id, 40m, "TRY", TransactionStatus.Approved, FixedNow.AddMinutes(-1), card.Id));
        await db.SaveChangesAsync();

        var service = new RiskAnalysisService(db, new FakeTimeProvider(FixedNow));

        var withThreshold3 = await service.AnalyzePaymentAsync(merchantC, card, 40m, "TRY");
        withThreshold3.RiskReasons.Should()
            .Contain(r => r.Code == RiskAnalysisService.MultiMerchantBurstCode);

        var rule = db.RiskRules.Single(r => r.Code == RiskAnalysisService.MultiMerchantBurstCode);
        rule.Threshold = 4;
        await db.SaveChangesAsync();

        var withThreshold4 = await service.AnalyzePaymentAsync(merchantC, card, 41m, "TRY");
        withThreshold4.RiskReasons.Should()
            .NotContain(r => r.Code == RiskAnalysisService.MultiMerchantBurstCode);
    }

    private static RiskAnalysisService.RuleSettings Enabled(decimal threshold, int points) =>
        new(true, threshold, points);

    private static void SeedRule(AppDbContext db, string code, decimal threshold, int points)
    {
        db.RiskRules.Add(new RiskRule
        {
            Id = Guid.NewGuid(),
            Code = code,
            Name = code,
            Description = "test",
            Threshold = threshold,
            ThresholdUnit = RiskRuleThresholdUnit.Count,
            Points = points,
            IsEnabled = true,
            SortOrder = 1,
            CreatedAt = FixedNow,
            UpdatedAt = FixedNow
        });
    }

    private static Merchant ActiveMerchant() => new()
    {
        Id = Guid.NewGuid(),
        MerchantCode = $"M-{Guid.NewGuid():N}"[..12],
        Name = "Merchant",
        IsActive = true,
        CreatedAt = FixedNow,
        UpdatedAt = FixedNow
    };

    private static Card ActiveCard(decimal available) => new()
    {
        Id = Guid.NewGuid(),
        CardToken = $"tok-{Guid.NewGuid():N}",
        MaskedCardNumber = "****4242",
        CardType = CardType.Credit,
        Status = CardStatus.Active,
        CreditLimit = Math.Max(available, 10_000m),
        AvailableLimit = available,
        CreatedAt = FixedNow,
        UpdatedAt = FixedNow
    };

    private static Transaction Tx(
        Guid merchantId,
        decimal amount,
        string currency,
        TransactionStatus status,
        DateTime createdAt,
        Guid? cardId = null) => new()
    {
        Id = Guid.NewGuid(),
        TransactionCode = $"TXN_{Guid.NewGuid():N}"[..20],
        MerchantId = merchantId,
        CardId = cardId ?? Guid.NewGuid(),
        Amount = amount,
        Currency = currency,
        Status = status,
        PaymentType = PaymentType.Online,
        RiskScore = 0,
        RiskLevel = RiskLevel.Low,
        RiskReasons = [],
        CreatedAt = createdAt
    };

    private sealed class FakeTimeProvider(DateTime utcNow) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() =>
            new(DateTime.SpecifyKind(utcNow, DateTimeKind.Utc));
    }
}
