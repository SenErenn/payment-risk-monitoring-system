using FluentAssertions;
using PaymentRiskMonitoring.Api.Exceptions;
using PaymentRiskMonitoring.Api.Services;

namespace PaymentRiskMonitoring.Api.Tests;

public class RefundServiceTests
{
    [Fact]
    public async Task GetRefundsForTransactionAsync_ThrowsWhenMissing()
    {
        await using var db = TestDbContextFactory.Create();
        var service = new RefundService(db);

        var act = async () => await service.GetRefundsForTransactionAsync(Guid.NewGuid());

        await act.Should().ThrowAsync<NotFoundException>();
    }
}
