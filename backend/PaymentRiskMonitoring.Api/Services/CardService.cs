using Microsoft.EntityFrameworkCore;
using PaymentRiskMonitoring.Api.Data;
using PaymentRiskMonitoring.Api.DTOs.Cards;
using PaymentRiskMonitoring.Api.Entities;
using PaymentRiskMonitoring.Api.Enums;
using PaymentRiskMonitoring.Api.Exceptions;
using PaymentRiskMonitoring.Api.Models.Responses;

namespace PaymentRiskMonitoring.Api.Services;

public class CardService
{
    private readonly AppDbContext _dbContext;

    public CardService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<PagedResult<CardDto>> GetCardsAsync(
        CardListQuery query,
        CancellationToken cancellationToken = default)
    {
        var cardsQuery = _dbContext.Cards.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLowerInvariant();
            cardsQuery = cardsQuery.Where(card =>
                card.CardToken.ToLower().Contains(search) ||
                card.MaskedCardNumber.ToLower().Contains(search));
        }

        if (query.Status.HasValue)
        {
            cardsQuery = cardsQuery.Where(card => card.Status == query.Status.Value);
        }

        if (query.CardType.HasValue)
        {
            cardsQuery = cardsQuery.Where(card => card.CardType == query.CardType.Value);
        }

        var totalCount = await cardsQuery.CountAsync(cancellationToken);

        var cards = await cardsQuery
            .OrderByDescending(card => card.CreatedAt)
            .ThenBy(card => card.MaskedCardNumber)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<CardDto>
        {
            Items = cards.Select(MapCard).ToList(),
            Page = query.Page,
            PageSize = query.PageSize,
            TotalCount = totalCount
        };
    }

    public async Task<CardDto> GetCardByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var card = await _dbContext.Cards
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (card is null)
        {
            throw new NotFoundException("Card", id);
        }

        return MapCard(card);
    }

    public async Task<CardDto> CreateCardAsync(
        CreateCardRequest request,
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var card = new Card
        {
            Id = Guid.NewGuid(),
            CardToken = GenerateDemoCardToken(),
            MaskedCardNumber = BuildMaskedCardNumber(request.LastFourDigits),
            CardType = request.CardType,
            Status = request.Status,
            CreditLimit = request.CreditLimit,
            AvailableLimit = request.AvailableLimit,
            CreatedAt = now,
            UpdatedAt = now
        };

        _dbContext.Cards.Add(card);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return MapCard(card);
    }

    public async Task<CardDto> UpdateCardAsync(
        Guid id,
        UpdateCardRequest request,
        CancellationToken cancellationToken = default)
    {
        var card = await _dbContext.Cards
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (card is null)
        {
            throw new NotFoundException("Card", id);
        }

        card.CreditLimit = request.CreditLimit;
        card.AvailableLimit = request.AvailableLimit;
        card.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return MapCard(card);
    }

    public async Task<CardDto> UpdateCardStatusAsync(
        Guid id,
        CardStatus status,
        CancellationToken cancellationToken = default)
    {
        var card = await _dbContext.Cards
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (card is null)
        {
            throw new NotFoundException("Card", id);
        }

        if (card.Status == status)
        {
            return MapCard(card);
        }

        card.Status = status;
        card.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);

        return MapCard(card);
    }

    private static string GenerateDemoCardToken()
    {
        // Demo-only fake token. Never represents a real PAN/CVV.
        return $"tok_{Guid.NewGuid():N}";
    }

    private static string BuildMaskedCardNumber(string lastFourDigits)
    {
        return $"**** **** **** {lastFourDigits}";
    }

    private static CardDto MapCard(Card card)
    {
        return new CardDto
        {
            Id = card.Id,
            CardToken = card.CardToken,
            MaskedCardNumber = card.MaskedCardNumber,
            CardType = card.CardType,
            Status = card.Status,
            CreditLimit = card.CreditLimit,
            AvailableLimit = card.AvailableLimit,
            CreatedAt = card.CreatedAt,
            UpdatedAt = card.UpdatedAt
        };
    }
}
