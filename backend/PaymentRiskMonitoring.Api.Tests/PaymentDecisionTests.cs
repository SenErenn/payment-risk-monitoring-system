using FluentAssertions;
using PaymentRiskMonitoring.Api.Data;
using PaymentRiskMonitoring.Api.DTOs.RiskAlerts;
using PaymentRiskMonitoring.Api.DTOs.Transactions;
using PaymentRiskMonitoring.Api.Entities;
using PaymentRiskMonitoring.Api.Enums;
using PaymentRiskMonitoring.Api.Services;

namespace PaymentRiskMonitoring.Api.Tests;

public class PaymentDecisionTests
{
    [Fact]
    public async Task CreateTransaction_ApprovesAndReducesAvailableLimit()
    {
        await using var db = TestDbContextFactory.Create();
        var (merchant, card) = await SeedActiveMerchantAndCardAsync(db, availableLimit: 10_000m);
        var service = CreateTransactionService(db);

        var result = await service.CreateTransactionAsync(new CreateTransactionRequest
        {
            MerchantId = merchant.Id,
            CardId = card.Id,
            Amount = 3_000m,
            Currency = "TRY",
            PaymentType = PaymentType.Contactless,
            IdempotencyKey = $"pay-{Guid.NewGuid():N}"
        });

        result.WasCreated.Should().BeTrue();
        result.Transaction.Status.Should().Be(TransactionStatus.Approved);

        var reloaded = await db.Cards.FindAsync(card.Id);
        reloaded!.AvailableLimit.Should().Be(7_000m);
    }

    [Fact]
    public async Task CreateTransaction_DeclinesBlockedCard_WithoutChangingLimit()
    {
        await using var db = TestDbContextFactory.Create();
        var (merchant, card) = await SeedActiveMerchantAndCardAsync(db, availableLimit: 10_000m);
        card.Status = CardStatus.Blocked;
        await db.SaveChangesAsync();
        var service = CreateTransactionService(db);

        var result = await service.CreateTransactionAsync(new CreateTransactionRequest
        {
            MerchantId = merchant.Id,
            CardId = card.Id,
            Amount = 100m,
            Currency = "TRY",
            PaymentType = PaymentType.Online,
            IdempotencyKey = $"pay-{Guid.NewGuid():N}"
        });

        result.Transaction.Status.Should().Be(TransactionStatus.Declined);
        var reloaded = await db.Cards.FindAsync(card.Id);
        reloaded!.AvailableLimit.Should().Be(10_000m);
    }

    [Fact]
    public async Task CreateTransaction_DeclinesInsufficientLimit()
    {
        await using var db = TestDbContextFactory.Create();
        var (merchant, card) = await SeedActiveMerchantAndCardAsync(db, availableLimit: 50m);
        var service = CreateTransactionService(db);

        var result = await service.CreateTransactionAsync(new CreateTransactionRequest
        {
            MerchantId = merchant.Id,
            CardId = card.Id,
            Amount = 100m,
            Currency = "TRY",
            PaymentType = PaymentType.Chip,
            IdempotencyKey = $"pay-{Guid.NewGuid():N}"
        });

        result.Transaction.Status.Should().Be(TransactionStatus.Declined);
        result.Transaction.RiskReasons.Should().Contain(r => r.Code == "INSUFFICIENT_LIMIT");
    }

    [Fact]
    public async Task CreateTransaction_IdempotentReplay_DoesNotDoubleCharge()
    {
        await using var db = TestDbContextFactory.Create();
        var (merchant, card) = await SeedActiveMerchantAndCardAsync(db, availableLimit: 5_000m);
        var service = CreateTransactionService(db);
        var key = $"idem-{Guid.NewGuid():N}";

        var first = await service.CreateTransactionAsync(new CreateTransactionRequest
        {
            MerchantId = merchant.Id,
            CardId = card.Id,
            Amount = 500m,
            Currency = "TRY",
            PaymentType = PaymentType.Online,
            IdempotencyKey = key
        });
        var second = await service.CreateTransactionAsync(new CreateTransactionRequest
        {
            MerchantId = merchant.Id,
            CardId = card.Id,
            Amount = 500m,
            Currency = "TRY",
            PaymentType = PaymentType.Online,
            IdempotencyKey = key
        });

        first.WasCreated.Should().BeTrue();
        second.WasCreated.Should().BeFalse();
        second.Transaction.Id.Should().Be(first.Transaction.Id);

        var reloaded = await db.Cards.FindAsync(card.Id);
        reloaded!.AvailableLimit.Should().Be(4_500m);
    }

    private static TransactionService CreateTransactionService(AppDbContext db)
    {
        var risk = new RiskAnalysisService(db, TimeProvider.System);
        var publisher = new NoopRealtimePublisher();
        return new TransactionService(db, risk, publisher);
    }

    private static async Task<(Merchant Merchant, Card Card)> SeedActiveMerchantAndCardAsync(
        AppDbContext db,
        decimal availableLimit)
    {
        var now = DateTime.UtcNow;
        var merchant = new Merchant
        {
            Id = Guid.NewGuid(),
            MerchantCode = $"M-{Guid.NewGuid():N}"[..12],
            Name = "Audit Merchant",
            Category = "Retail",
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        };
        var card = new Card
        {
            Id = Guid.NewGuid(),
            CardToken = $"tok-{Guid.NewGuid():N}",
            MaskedCardNumber = "****4242",
            CardType = CardType.Credit,
            Status = CardStatus.Active,
            CreditLimit = Math.Max(availableLimit, 10_000m),
            AvailableLimit = availableLimit,
            CreatedAt = now,
            UpdatedAt = now
        };
        db.Merchants.Add(merchant);
        db.Cards.Add(card);
        await db.SaveChangesAsync();
        return (merchant, card);
    }

    private sealed class NoopRealtimePublisher : IRealtimeEventPublisher
    {
        public Task PublishTransactionCreatedAsync(
            TransactionDto transaction,
            CancellationToken cancellationToken = default) => Task.CompletedTask;

        public Task PublishRiskAlertCreatedAsync(
            RiskAlertDto alert,
            CancellationToken cancellationToken = default) => Task.CompletedTask;
    }
}
