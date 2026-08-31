using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PaymentRiskMonitoring.Api.Authorization;
using PaymentRiskMonitoring.Api.DTOs.Cards;
using PaymentRiskMonitoring.Api.Enums;
using PaymentRiskMonitoring.Api.Models.Responses;
using PaymentRiskMonitoring.Api.Services;

namespace PaymentRiskMonitoring.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CardsController : ControllerBase
{
    private readonly CardService _cardService;

    public CardsController(CardService cardService)
    {
        _cardService = cardService;
    }

    [Authorize(Policy = AuthorizationPolicies.AnalystOrAdmin)]
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<CardDto>>>> GetCards(
        [FromQuery] CardListQuery query,
        CancellationToken cancellationToken)
    {
        var result = await _cardService.GetCardsAsync(query, cancellationToken);
        return Ok(ApiResponse<PagedResult<CardDto>>.Ok(result, "Cards retrieved."));
    }

    [Authorize(Policy = AuthorizationPolicies.AnalystOrAdmin)]
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<CardDto>>> GetCardById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var card = await _cardService.GetCardByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<CardDto>.Ok(card, "Card retrieved."));
    }

    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    [HttpPost]
    public async Task<ActionResult<ApiResponse<CardDto>>> CreateCard(
        [FromBody] CreateCardRequest request,
        CancellationToken cancellationToken)
    {
        var card = await _cardService.CreateCardAsync(request, cancellationToken);
        return CreatedAtAction(
            nameof(GetCardById),
            new { id = card.Id },
            ApiResponse<CardDto>.Ok(card, "Card created."));
    }

    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<CardDto>>> UpdateCard(
        Guid id,
        [FromBody] UpdateCardRequest request,
        CancellationToken cancellationToken)
    {
        var card = await _cardService.UpdateCardAsync(id, request, cancellationToken);
        return Ok(ApiResponse<CardDto>.Ok(card, "Card limits updated."));
    }

    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    [HttpPost("{id:guid}/status")]
    public async Task<ActionResult<ApiResponse<CardDto>>> UpdateCardStatus(
        Guid id,
        [FromBody] UpdateCardStatusRequest request,
        CancellationToken cancellationToken)
    {
        var card = await _cardService.UpdateCardStatusAsync(id, request.Status, cancellationToken);
        return Ok(ApiResponse<CardDto>.Ok(card, "Card status updated."));
    }

    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    [HttpPost("{id:guid}/activate")]
    public async Task<ActionResult<ApiResponse<CardDto>>> ActivateCard(
        Guid id,
        CancellationToken cancellationToken)
    {
        var card = await _cardService.UpdateCardStatusAsync(id, CardStatus.Active, cancellationToken);
        return Ok(ApiResponse<CardDto>.Ok(card, "Card activated."));
    }

    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    [HttpPost("{id:guid}/block")]
    public async Task<ActionResult<ApiResponse<CardDto>>> BlockCard(
        Guid id,
        CancellationToken cancellationToken)
    {
        var card = await _cardService.UpdateCardStatusAsync(id, CardStatus.Blocked, cancellationToken);
        return Ok(ApiResponse<CardDto>.Ok(card, "Card blocked."));
    }

    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    [HttpPost("{id:guid}/deactivate")]
    public async Task<ActionResult<ApiResponse<CardDto>>> DeactivateCard(
        Guid id,
        CancellationToken cancellationToken)
    {
        var card = await _cardService.UpdateCardStatusAsync(id, CardStatus.Passive, cancellationToken);
        return Ok(ApiResponse<CardDto>.Ok(card, "Card deactivated."));
    }
}
