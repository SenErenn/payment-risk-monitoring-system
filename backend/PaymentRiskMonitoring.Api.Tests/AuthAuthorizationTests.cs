using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using PaymentRiskMonitoring.Api.Data;
using PaymentRiskMonitoring.Api.Entities;
using PaymentRiskMonitoring.Api.Enums;
using PaymentRiskMonitoring.Api.Models.Responses;

namespace PaymentRiskMonitoring.Api.Tests;

public class AuthAuthorizationTests : IClassFixture<PayScopeWebApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly PayScopeWebApplicationFactory _factory;

    public AuthAuthorizationTests(PayScopeWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Login_ReturnsToken_ForSeededAdmin()
    {
        var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "admin@payscope.local",
            password = "Admin123!"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await response.Content.ReadFromJsonAsync<ApiResponse<LoginPayload>>(JsonOptions);
        payload!.Success.Should().BeTrue();
        payload.Data!.AccessToken.Should().NotBeNullOrWhiteSpace();
        payload.Data.User.Role.Should().Be("Admin");
    }

    [Fact]
    public async Task AuditLogs_Forbidden_ForViewer()
    {
        var client = _factory.CreateClient();
        var login = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "viewer@payscope.local",
            password = "Viewer123!"
        });
        var payload = await login.Content.ReadFromJsonAsync<ApiResponse<LoginPayload>>(JsonOptions);
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", payload!.Data!.AccessToken);

        var audit = await client.GetAsync("/api/audit-logs");
        audit.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task AuditLogs_Ok_ForAdmin()
    {
        var client = _factory.CreateClient();
        var login = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "admin@payscope.local",
            password = "Admin123!"
        });
        var payload = await login.Content.ReadFromJsonAsync<ApiResponse<LoginPayload>>(JsonOptions);
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", payload!.Data!.AccessToken);

        var audit = await client.GetAsync("/api/audit-logs");
        audit.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task SecurityHeaders_ArePresent()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/health/live");
        response.Headers.Should().ContainKey("X-Content-Type-Options");
        response.Headers.GetValues("X-Content-Type-Options").Should().Contain("nosniff");
        response.Headers.Should().ContainKey("X-Frame-Options");
    }

    private sealed class LoginPayload
    {
        public string AccessToken { get; set; } = string.Empty;
        public LoginUser User { get; set; } = new();
    }

    private sealed class LoginUser
    {
        public string Role { get; set; } = string.Empty;
    }
}

public class PayScopeWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _dbName = $"payscope-tests-{Guid.NewGuid():N}";
    private bool _seeded;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting(
            "ConnectionStrings:DefaultConnection",
            "Host=127.0.0.1;Port=1;Database=unused;Username=u;Password=p");
        builder.UseSetting("Database:MigrateOnStartup", "false");
        builder.UseSetting("Database:SeedOnStartup", "false");
        builder.UseSetting("Jwt:Secret", "test_secret_must_be_at_least_32_chars_long!!");
        builder.UseSetting("Jwt:Issuer", "PaymentRiskMonitoring");
        builder.UseSetting("Jwt:Audience", "PaymentRiskMonitoring");
        builder.UseSetting("Jwt:ExpiryMinutes", "60");

        builder.ConfigureServices(services =>
        {
            RemoveDbContext(services);

            services.AddDbContext<AppDbContext>(options =>
                options.UseInMemoryDatabase(_dbName));
        });
    }

    protected override void ConfigureClient(HttpClient client)
    {
        if (!_seeded)
        {
            using var scope = Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var hasher = scope.ServiceProvider
                .GetRequiredService<Microsoft.AspNetCore.Identity.IPasswordHasher<User>>();

            db.Database.EnsureCreated();
            if (!db.Users.Any())
            {
                var now = DateTime.UtcNow;
                db.Users.AddRange(
                    CreateUser("Admin", "User", "admin@payscope.local", "Admin123!", UserRole.Admin, hasher, now),
                    CreateUser("Analyst", "User", "analyst@payscope.local", "Analyst123!", UserRole.Analyst, hasher, now),
                    CreateUser("Viewer", "User", "viewer@payscope.local", "Viewer123!", UserRole.Viewer, hasher, now));
                db.SaveChanges();
            }

            _seeded = true;
        }

        base.ConfigureClient(client);
    }

    private static void RemoveDbContext(IServiceCollection services)
    {
        var toRemove = services
            .Where(descriptor =>
                descriptor.ServiceType == typeof(AppDbContext)
                || descriptor.ServiceType == typeof(DbContextOptions)
                || descriptor.ServiceType == typeof(DbContextOptions<AppDbContext>)
                || (descriptor.ServiceType.IsGenericType
                    && descriptor.ServiceType.GetGenericTypeDefinition() == typeof(IDbContextOptionsConfiguration<>)))
            .ToList();

        foreach (var descriptor in toRemove)
        {
            services.Remove(descriptor);
        }
    }

    private static User CreateUser(
        string first,
        string last,
        string email,
        string password,
        UserRole role,
        Microsoft.AspNetCore.Identity.IPasswordHasher<User> hasher,
        DateTime now)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            FirstName = first,
            LastName = last,
            Email = email,
            Role = role,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        };
        user.PasswordHash = hasher.HashPassword(user, password);
        return user;
    }
}
