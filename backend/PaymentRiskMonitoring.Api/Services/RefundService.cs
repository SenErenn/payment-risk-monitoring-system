using System.Data;
using Microsoft.EntityFrameworkCore;
using PaymentRiskMonitoring.Api.Data;
using PaymentRiskMonitoring.Api.DTOs.Refunds;
using PaymentRiskMonitoring.Api.Entities;
using PaymentRiskMonitoring.Api.Enums;
using PaymentRiskMonitoring.Api.Exceptions;

namespace PaymentRiskMonitoring.Api.Services;

public class RefundService
{
    private readonly AppDbContext _dbContext;

    public RefundService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<RefundDto>> GetRefundsForTransactionAsync(
        Guid transactionId,
        CancellationToken cancellationToken = default)
    {
        var exists = await _dbContext.Transactions
            .AsNoTracking()
            .AnyAsync(transaction => transaction.Id == transactionId, cancellationToken);

        if (!exists)
        {
            throw new NotFoundException("Transaction", transactionId);
        }

        var refunds = await _dbContext.Refunds
            .AsNoTracking()
            .Include(refund => refund.Transaction)
            .Where(refund => refund.TransactionId == transactionId)
            .OrderByDescending(refund => refund.CreatedAt)
            .ToListAsync(cancellationToken);

        return refunds.Select(MapRefund).ToList();
    }

    public async Task<RefundDto> CreateRefundAsync(
        Guid transactionId,
        CreateRefundRequest request,
        CancellationToken cancellationToken = default)
    {
        await using var dbTransaction = await _dbContext.Database.BeginTransactionAsync(
            IsolationLevel.ReadCommitted,
            cancellationToken);

        try
        {
            var transaction = await _dbContext.Transactions
                .Include(item => item.Refunds)
                .FirstOrDefaultAsync(item => item.Id == transactionId, cancellationToken);

            if (transaction is null)
            {
                throw new NotFoundException("Transaction", transactionId);
            }

            if (transaction.Status is not (TransactionStatus.Approved or TransactionStatus.PartiallyRefunded))
            {
                throw new ValidationException(
                    "Transaction cannot be refunded.",
                    [
                        $"Only Approved or PartiallyRefunded transactions can be refunded. Current status: {transaction.Status}."
                    ]);
            }

            await _dbContext.Database.ExecuteSqlInterpolatedAsync(
                $"""SELECT 1 FROM "Cards" WHERE "Id" = {transaction.CardId} FOR UPDATE""",
                cancellationToken);

            var card = await _dbContext.Cards
                .FirstOrDefaultAsync(item => item.Id == transaction.CardId, cancellationToken);

            if (card is null)
            {
                throw new NotFoundException("Card", transaction.CardId);
            }

            var alreadyRefunded = transaction.Refunds.Sum(refund => refund.Amount);
            var refundableAmount = transaction.Amount - alreadyRefunded;

            if (refundableAmount <= 0)
            {
                throw new ValidationException(
                    "Transaction has no remaining refundable amount.",
                    ["Over-refund is not allowed."]);
            }

            var refundAmount = request.Amount.HasValue
                ? decimal.Round(request.Amount.Value, 2, MidpointRounding.AwayFromZero)
                : refundableAmount;

            if (refundAmount <= 0)
            {
                throw new ValidationException(
                    "Refund amount must be greater than 0.",
                    ["Provide a positive refund amount."]);
            }

            if (refundAmount > refundableAmount)
            {
                throw new ValidationException(
                    "Refund amount exceeds refundable balance.",
                    [
                        $"Requested {refundAmount}, refundable remaining {refundableAmount}."
                    ]);
            }

            var now = DateTime.UtcNow;
            var refund = new Refund
            {
                Id = Guid.NewGuid(),
                RefundCode = GenerateRefundCode(),
                TransactionId = transaction.Id,
                Amount = refundAmount,
                Currency = transaction.Currency,
                Reason = string.IsNullOrWhiteSpace(request.Reason)
                    ? null
                    : request.Reason.Trim(),
                CreatedAt = now,
                Transaction = transaction
            };

            transaction.Refunds.Add(refund);

            var remainingAfter = refundableAmount - refundAmount;
            transaction.Status = remainingAfter == 0
                ? TransactionStatus.Refunded
                : TransactionStatus.PartiallyRefunded;

            card.AvailableLimit = Math.Min(
                card.CreditLimit,
                card.AvailableLimit + refundAmount);
            card.UpdatedAt = now;

            _dbContext.Refunds.Add(refund);
            await _dbContext.SaveChangesAsync(cancellationToken);
            await dbTransaction.CommitAsync(cancellationToken);

            return MapRefund(refund);
        }
        catch
        {
            if (_dbContext.Database.CurrentTransaction is not null)
            {
                await dbTransaction.RollbackAsync(cancellationToken);
            }

            throw;
        }
    }

    private static string GenerateRefundCode()
    {
        return $"RFD_{Guid.NewGuid():N}".ToUpperInvariant();
    }

    private static RefundDto MapRefund(Refund refund)
    {
        return new RefundDto
        {
            Id = refund.Id,
            RefundCode = refund.RefundCode,
            TransactionId = refund.TransactionId,
            TransactionCode = refund.Transaction?.TransactionCode ?? string.Empty,
            Amount = refund.Amount,
            Currency = refund.Currency,
            Reason = refund.Reason,
            CreatedAt = refund.CreatedAt
        };
    }
}
