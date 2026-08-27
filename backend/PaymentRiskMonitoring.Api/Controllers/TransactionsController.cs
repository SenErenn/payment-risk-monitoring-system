using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PaymentRiskMonitoring.Api.Authorization;
using PaymentRiskMonitoring.Api.DTOs.Transactions;
using PaymentRiskMonitoring.Api.Models.Responses;
using PaymentRiskMonitoring.Api.Services;

namespace PaymentRiskMonitoring.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TransactionsController : ControllerBase
{
    private readonly TransactionService _transactionService;

    public TransactionsController(TransactionService transactionService)
    {
        _transactionService = transactionService;
    }

    [Authorize(Policy = AuthorizationPolicies.StaffRead)]
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<TransactionDto>>>> GetTransactions(
        [FromQuery] TransactionListQuery query,
        CancellationToken cancellationToken)
    {
        var result = await _transactionService.GetTransactionsAsync(query, cancellationToken);
        return Ok(ApiResponse<PagedResult<TransactionDto>>.Ok(result, "Transactions retrieved."));
    }

    [Authorize(Policy = AuthorizationPolicies.StaffRead)]
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<TransactionDto>>> GetTransactionById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var transaction = await _transactionService.GetTransactionByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<TransactionDto>.Ok(transaction, "Transaction retrieved."));
    }

    [Authorize(Policy = AuthorizationPolicies.AnalystOrAdmin)]
    [HttpPost]
    public async Task<ActionResult<ApiResponse<TransactionDto>>> CreateTransaction(
        [FromBody] CreateTransactionRequest request,
        CancellationToken cancellationToken)
    {
        var transaction = await _transactionService.CreateTransactionAsync(request, cancellationToken);
        return CreatedAtAction(
            nameof(GetTransactionById),
            new { id = transaction.Id },
            ApiResponse<TransactionDto>.Ok(transaction, transaction.DecisionMessage ?? "Transaction created."));
    }
}
