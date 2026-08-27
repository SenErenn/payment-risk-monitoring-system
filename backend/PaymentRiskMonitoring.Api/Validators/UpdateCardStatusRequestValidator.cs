using FluentValidation;
using PaymentRiskMonitoring.Api.DTOs.Cards;

namespace PaymentRiskMonitoring.Api.Validators;

public class UpdateCardStatusRequestValidator : AbstractValidator<UpdateCardStatusRequest>
{
    public UpdateCardStatusRequestValidator()
    {
        RuleFor(request => request.Status)
            .IsInEnum()
            .WithMessage("Card status is invalid.");
    }
}
