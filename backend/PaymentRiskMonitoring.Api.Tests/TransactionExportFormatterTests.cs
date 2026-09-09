using System.Text;
using FluentAssertions;
using PaymentRiskMonitoring.Api.DTOs.Transactions;
using PaymentRiskMonitoring.Api.Enums;
using PaymentRiskMonitoring.Api.Services;

namespace PaymentRiskMonitoring.Api.Tests;

public class TransactionExportFormatterTests
{
    [Fact]
    public void Format_Csv_IncludesHeaderAndRow()
    {
        var (content, contentType, fileName) = TransactionExportFormatter.Format(
            [CreateTx("TXN_1")],
            "csv");

        var text = Encoding.UTF8.GetString(content);
        text.Should().Contain("TransactionCode");
        text.Should().Contain("TXN_1");
        contentType.Should().Contain("text/csv");
        fileName.Should().EndWith(".csv");
    }

    [Fact]
    public void Format_Excel_ReturnsSpreadsheetMl()
    {
        var (content, contentType, fileName) = TransactionExportFormatter.Format(
            [CreateTx("TXN_2")],
            "excel");

        var text = Encoding.UTF8.GetString(content);
        text.Should().Contain("Workbook");
        text.Should().Contain("TXN_2");
        contentType.Should().Be("application/vnd.ms-excel");
        fileName.Should().EndWith(".xls");
    }

    private static TransactionDto CreateTx(string code) => new()
    {
        Id = Guid.NewGuid(),
        TransactionCode = code,
        MerchantId = Guid.NewGuid(),
        MerchantCode = "MCH",
        MerchantName = "Merchant",
        CardId = Guid.NewGuid(),
        CardToken = "tok",
        MaskedCardNumber = "****4242",
        Amount = 100m,
        Currency = "TRY",
        Status = TransactionStatus.Approved,
        PaymentType = PaymentType.Online,
        RiskScore = 15,
        RiskLevel = RiskLevel.Low,
        CreatedAt = DateTime.UtcNow
    };
}
