using FluentValidation;
using PaymentRiskMonitoring.Api.DTOs.RiskAlerts;
using PaymentRiskMonitoring.Api.Enums;

namespace PaymentRiskMonitoring.Api.Validators;

public class ReviewRiskAlertRequestValidator : AbstractValidator<ReviewRiskAlertRequest>
{
    private static readonly AlertStatus[] AllowedTargetStatuses =
    [
        AlertStatus.UnderReview,
        AlertStatus.Safe,
        AlertStatus.Suspicious,
        AlertStatus.Closed
    ];

    public ReviewRiskAlertRequestValidator()
    {
        RuleFor(request => request.Status)
            .IsInEnum()
            .Must(status => AllowedTargetStatuses.Contains(status))
            .WithMessage(
                "Review status must be UnderReview, Safe, Suspicious, or Closed.");

        RuleFor(request => request.AnalystNotes)
            .MaximumLength(1000)
            .When(request => !string.IsNullOrWhiteSpace(request.AnalystNotes))
            .WithMessage("Analyst notes must be at most 1000 characters.");

        RuleFor(request => request.AnalystNotes)
            .Must(notes => !string.IsNullOrWhiteSpace(notes))
            .When(request =>
                request.Status is AlertStatus.Safe
                    or AlertStatus.Suspicious
                    or AlertStatus.Closed)
            .WithMessage("Analyst notes are required when closing a review.");
    }
}
