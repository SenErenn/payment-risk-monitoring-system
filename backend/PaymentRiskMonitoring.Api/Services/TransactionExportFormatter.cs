using System.Globalization;
using System.Net;
using System.Text;
using PaymentRiskMonitoring.Api.DTOs.Transactions;

namespace PaymentRiskMonitoring.Api.Services;

public static class TransactionExportFormatter
{
    public const int MaxExportRows = 5000;

    public static (byte[] Content, string ContentType, string FileName) Format(
        IReadOnlyList<TransactionDto> transactions,
        string format)
    {
        var stamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss", CultureInfo.InvariantCulture);
        var normalized = format.Trim().ToLowerInvariant();

        if (normalized == "excel")
        {
            var xml = BuildSpreadsheetMl(transactions);
            return (
                Encoding.UTF8.GetBytes(xml),
                "application/vnd.ms-excel",
                $"transactions_{stamp}.xls");
        }

        var csv = BuildCsv(transactions);
        var preamble = Encoding.UTF8.GetPreamble();
        var body = Encoding.UTF8.GetBytes(csv);
        var bytes = new byte[preamble.Length + body.Length];
        Buffer.BlockCopy(preamble, 0, bytes, 0, preamble.Length);
        Buffer.BlockCopy(body, 0, bytes, preamble.Length, body.Length);

        return (bytes, "text/csv; charset=utf-8", $"transactions_{stamp}.csv");
    }

    private static string BuildCsv(IReadOnlyList<TransactionDto> transactions)
    {
        var builder = new StringBuilder();
        builder.AppendLine(string.Join(',', Headers));

        foreach (var tx in transactions)
        {
            builder.Append(Escape(tx.TransactionCode)).Append(',');
            builder.Append(Escape(tx.MerchantCode)).Append(',');
            builder.Append(Escape(tx.MerchantName)).Append(',');
            builder.Append(Escape(tx.MaskedCardNumber)).Append(',');
            builder.Append(Escape(tx.Amount.ToString(CultureInfo.InvariantCulture))).Append(',');
            builder.Append(Escape(tx.Currency)).Append(',');
            builder.Append(Escape(tx.Status.ToString())).Append(',');
            builder.Append(Escape(tx.PaymentType.ToString())).Append(',');
            builder.Append(Escape(tx.RiskScore.ToString(CultureInfo.InvariantCulture))).Append(',');
            builder.Append(Escape(tx.RiskLevel.ToString())).Append(',');
            builder.Append(Escape(tx.RefundedAmount.ToString(CultureInfo.InvariantCulture))).Append(',');
            builder.Append(Escape(tx.CreatedAt.ToString("O", CultureInfo.InvariantCulture)));
            builder.AppendLine();
        }

        return builder.ToString();
    }

    private static string BuildSpreadsheetMl(IReadOnlyList<TransactionDto> transactions)
    {
        var builder = new StringBuilder();
        builder.AppendLine("""<?xml version="1.0" encoding="UTF-8"?>""");
        builder.AppendLine("""<?mso-application progid="Excel.Sheet"?>""");
        builder.AppendLine("""<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">""");
        builder.AppendLine("<Worksheet ss:Name=\"Transactions\"><Table>");

        builder.Append("<Row>");
        foreach (var header in Headers)
        {
            builder.Append("<Cell><Data ss:Type=\"String\">")
                .Append(WebUtility.HtmlEncode(header))
                .Append("</Data></Cell>");
        }
        builder.AppendLine("</Row>");

        foreach (var tx in transactions)
        {
            builder.Append("<Row>");
            AppendStringCell(builder, tx.TransactionCode);
            AppendStringCell(builder, tx.MerchantCode);
            AppendStringCell(builder, tx.MerchantName);
            AppendStringCell(builder, tx.MaskedCardNumber);
            AppendNumberCell(builder, tx.Amount);
            AppendStringCell(builder, tx.Currency);
            AppendStringCell(builder, tx.Status.ToString());
            AppendStringCell(builder, tx.PaymentType.ToString());
            AppendNumberCell(builder, tx.RiskScore);
            AppendStringCell(builder, tx.RiskLevel.ToString());
            AppendNumberCell(builder, tx.RefundedAmount);
            AppendStringCell(builder, tx.CreatedAt.ToString("O", CultureInfo.InvariantCulture));
            builder.AppendLine("</Row>");
        }

        builder.AppendLine("</Table></Worksheet></Workbook>");
        return builder.ToString();
    }

    private static readonly string[] Headers =
    [
        "TransactionCode",
        "MerchantCode",
        "MerchantName",
        "MaskedCardNumber",
        "Amount",
        "Currency",
        "Status",
        "PaymentType",
        "RiskScore",
        "RiskLevel",
        "RefundedAmount",
        "CreatedAtUtc"
    ];

    private static string Escape(string? value)
    {
        var text = value ?? string.Empty;
        if (text.Contains('"') || text.Contains(',') || text.Contains('\n') || text.Contains('\r'))
        {
            return $"\"{text.Replace("\"", "\"\"")}\"";
        }

        return text;
    }

    private static void AppendStringCell(StringBuilder builder, string? value)
    {
        builder.Append("<Cell><Data ss:Type=\"String\">")
            .Append(WebUtility.HtmlEncode(value ?? string.Empty))
            .Append("</Data></Cell>");
    }

    private static void AppendNumberCell(StringBuilder builder, decimal value)
    {
        builder.Append("<Cell><Data ss:Type=\"Number\">")
            .Append(value.ToString(CultureInfo.InvariantCulture))
            .Append("</Data></Cell>");
    }

    private static void AppendNumberCell(StringBuilder builder, int value)
    {
        builder.Append("<Cell><Data ss:Type=\"Number\">")
            .Append(value.ToString(CultureInfo.InvariantCulture))
            .Append("</Data></Cell>");
    }
}
