namespace PaymentRiskMonitoring.Api.Audit;

public static class AuditActions
{
    public const string UserLogin = "UserLogin";

    public const string MerchantCreated = "MerchantCreated";
    public const string MerchantUpdated = "MerchantUpdated";
    public const string MerchantActivated = "MerchantActivated";
    public const string MerchantDeactivated = "MerchantDeactivated";

    public const string CardCreated = "CardCreated";
    public const string CardUpdated = "CardUpdated";
    public const string CardStatusChanged = "CardStatusChanged";

    public const string TransactionCreated = "TransactionCreated";
    public const string RefundCreated = "RefundCreated";
    public const string TransactionsExported = "TransactionsExported";

    public const string RiskRuleUpdated = "RiskRuleUpdated";
    public const string RiskAlertReviewed = "RiskAlertReviewed";
}

public static class AuditEntityTypes
{
    public const string User = "User";
    public const string Merchant = "Merchant";
    public const string Card = "Card";
    public const string Transaction = "Transaction";
    public const string Refund = "Refund";
    public const string RiskRule = "RiskRule";
    public const string RiskAlert = "RiskAlert";
}
