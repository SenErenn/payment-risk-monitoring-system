using FluentAssertions;
using PaymentRiskMonitoring.Api.DTOs.Refunds;
using PaymentRiskMonitoring.Api.Entities;
using PaymentRiskMonitoring.Api.Enums;
using PaymentRiskMonitoring.Api.Exceptions;
using PaymentRiskMonitoring.Api.Services;

namespace PaymentRiskMonitoring.Api.Tests;

public class RefundServiceTests
{
    [Fact]
    public async Task GetRefundsForTransactionAsync_ThrowsWhenMissing()
    {
        await using var db = TestDbContextFactory.Create();
        var service = new RefundService(db);

        var act = async () => await service.GetRefundsForTransactionAsync(Guid.NewGuid());

        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task CreateRefundAsync_RejectsOverRefund_AndRestoresLimitOnPartial()
    {
        await using var db = TestDbContextFactory.Create();
        var now = DateTime.UtcNow;
        var merchantId = Guid.NewGuid();
        var cardId = Guid.NewGuid();
        var txId = Guid.NewGuid();

        db.Merchants.Add(new Merchant
        {
            Id = merchantId,
            MerchantCode = "M-REF",
            Name = "Refund Merchant",
            Category = "Retail",
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        });
        db.Cards.Add(new Card
        {
            Id = cardId,
            CardToken = "tok-ref",
            MaskedCardNumber = "****9999",
            CardType = CardType.Credit,
            Status = CardStatus.Active,
            CreditLimit = 5_000m,
            AvailableLimit = 4_000m,
            CreatedAt = now,
            UpdatedAt = now
        });
        db.Transactions.Add(new Transaction
        {
            Id = txId,
            TransactionCode = "TXN_REFUND",
            MerchantId = merchantId,
            CardId = cardId,
            Amount = 1_000m,
            Currency = "TRY",
            Status = TransactionStatus.Approved,
            PaymentType = PaymentType.Online,
            RiskScore = 15,
            RiskLevel = RiskLevel.Low,
            CreatedAt = now
        });
        await db.SaveChangesAsync();

        var service = new RefundService(db);
        var first = await service.CreateRefundAsync(
            txId,
            new CreateRefundRequest { Amount = 600m, Reason = "partial" });

        first.Amount.Should().Be(600m);
        (await db.Cards.FindAsync(cardId))!.AvailableLimit.Should().Be(4_600m);

        var over = async () => await service.CreateRefundAsync(
            txId,
            new CreateRefundRequest { Amount = 500m, Reason = "too much" });

        await over.Should().ThrowAsync<ValidationException>();

        var second = await service.CreateRefundAsync(
            txId,
            new CreateRefundRequest { Amount = 400m, Reason = "rest" });

        second.Amount.Should().Be(400m);
        (await db.Transactions.FindAsync(txId))!.Status.Should().Be(TransactionStatus.Refunded);
        (await db.Cards.FindAsync(cardId))!.AvailableLimit.Should().Be(5_000m);
    }
}
