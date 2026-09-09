using FluentAssertions;
using FluentValidation.TestHelper;
using PaymentRiskMonitoring.Api.Authorization;
using PaymentRiskMonitoring.Api.DTOs.Transactions;
using PaymentRiskMonitoring.Api.Enums;
using PaymentRiskMonitoring.Api.Validators;

namespace PaymentRiskMonitoring.Api.Tests;

public class ValidatorTests
{
    [Fact]
    public void CreateTransactionRequest_RejectsNonPositiveAmount()
    {
        var validator = new CreateTransactionRequestValidator();
        var result = validator.TestValidate(new CreateTransactionRequest
        {
            MerchantId = Guid.NewGuid(),
            CardId = Guid.NewGuid(),
            Amount = 0,
            Currency = "TRY",
            PaymentType = PaymentType.Contactless
        });

        result.ShouldHaveValidationErrorFor(request => request.Amount);
    }

    [Fact]
    public void CreateTransactionRequest_AcceptsValidPayload()
    {
        var validator = new CreateTransactionRequestValidator();
        var result = validator.TestValidate(new CreateTransactionRequest
        {
            MerchantId = Guid.NewGuid(),
            CardId = Guid.NewGuid(),
            Amount = 25.5m,
            Currency = "try",
            PaymentType = PaymentType.Online
        });

        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void ExportQuery_RejectsUnknownFormat()
    {
        var validator = new TransactionExportQueryValidator();
        var result = validator.TestValidate(new TransactionExportQuery
        {
            Format = "pdf",
            SortBy = "createdAt",
            SortDirection = "desc"
        });

        result.ShouldHaveValidationErrorFor(query => query.Format);
    }
}

public class AuthorizationPolicyTests
{
    [Fact]
    public void PolicyNames_AreStable()
    {
        AuthorizationPolicies.AdminOnly.Should().Be("AdminOnly");
        AuthorizationPolicies.AnalystOrAdmin.Should().Be("AnalystOrAdmin");
        AuthorizationPolicies.StaffRead.Should().Be("StaffRead");
        AppRoles.Admin.Should().Be("Admin");
        AppRoles.Analyst.Should().Be("Analyst");
        AppRoles.Viewer.Should().Be("Viewer");
    }
}
