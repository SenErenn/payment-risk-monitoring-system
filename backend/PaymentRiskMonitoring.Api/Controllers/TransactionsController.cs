using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PaymentRiskMonitoring.Api.Authorization;
using PaymentRiskMonitoring.Api.DTOs.Refunds;
using PaymentRiskMonitoring.Api.DTOs.Transactions;
using PaymentRiskMonitoring.Api.Models.Responses;
using PaymentRiskMonitoring.Api.Services;

namespace PaymentRiskMonitoring.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TransactionsController : ControllerBase
{
    private readonly TransactionService _transactionService;
    private readonly RefundService _refundService;

    public TransactionsController(
        TransactionService transactionService,
        RefundService refundService)
    {
        _transactionService = transactionService;
        _refundService = refundService;
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
        [FromHeader(Name = "Idempotency-Key")] string? idempotencyKeyHeader,
        CancellationToken cancellationToken)
    {
        var result = await _transactionService.CreateTransactionAsync(
            request,
            idempotencyKeyHeader,
            cancellationToken);

        var message = result.WasCreated
            ? result.Transaction.DecisionMessage ?? "Transaction created."
            : "Existing payment returned for duplicate or idempotent request.";

        var payload = ApiResponse<TransactionDto>.Ok(result.Transaction, message);

        if (!result.WasCreated)
        {
            return Ok(payload);
        }

        return CreatedAtAction(
            nameof(GetTransactionById),
            new { id = result.Transaction.Id },
            payload);
    }

    [Authorize(Policy = AuthorizationPolicies.StaffRead)]
    [HttpGet("{id:guid}/refunds")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<RefundDto>>>> GetTransactionRefunds(
        Guid id,
        CancellationToken cancellationToken)
    {
        var refunds = await _refundService.GetRefundsForTransactionAsync(id, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<RefundDto>>.Ok(refunds, "Refunds retrieved."));
    }

    [Authorize(Policy = AuthorizationPolicies.AnalystOrAdmin)]
    [HttpPost("{id:guid}/refunds")]
    public async Task<ActionResult<ApiResponse<RefundDto>>> CreateTransactionRefund(
        Guid id,
        [FromBody] CreateRefundRequest request,
        CancellationToken cancellationToken)
    {
        var refund = await _refundService.CreateRefundAsync(id, request, cancellationToken);
        return CreatedAtAction(
            nameof(GetTransactionRefunds),
            new { id },
            ApiResponse<RefundDto>.Ok(refund, "Refund created."));
    }
}
