using System.Text.Json.Serialization;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;
using PaymentRiskMonitoring.Api.Data;
using PaymentRiskMonitoring.Api.Entities;
using PaymentRiskMonitoring.Api.Extensions;
using PaymentRiskMonitoring.Api.Hubs;
using PaymentRiskMonitoring.Api.Middleware;
using PaymentRiskMonitoring.Api.Realtime;
using PaymentRiskMonitoring.Api.Services;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "DefaultConnection is not configured. Set ConnectionStrings:DefaultConnection via appsettings.Development.json or environment variables.");
}

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
builder.Services.ConfigureApiBehavior();
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<Program>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Payment Risk Monitoring System API",
        Version = "v1",
        Description = "Internal API for card payment simulation, monitoring, and risk analysis."
    });
    options.AddJwtSwaggerSecurity();
});
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));
builder.Services.AddJwtAuthentication(builder.Configuration);
builder.Services.AddScoped<JwtTokenService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<MerchantService>();
builder.Services.AddScoped<CardService>();
builder.Services.AddScoped<TransactionService>();
builder.Services.AddScoped<RefundService>();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<RiskAnalysisService>();
builder.Services.AddScoped<RiskAlertService>();
builder.Services.AddScoped<RiskRuleService>();
builder.Services.AddScoped<DashboardService>();
builder.Services.AddScoped<EntityAnalyticsService>();
builder.Services.AddScoped<AuditLogService>();
builder.Services.AddSingleton<IRealtimeEventPublisher, RealtimeEventPublisher>();
builder.Services
    .AddSignalR()
    .AddJsonProtocol(options =>
    {
        options.PayloadSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        options.PayloadSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    });

var corsOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>();
if (corsOrigins is { Length: > 0 } || builder.Environment.IsDevelopment())
{
    var origins = corsOrigins is { Length: > 0 }
        ? corsOrigins
        : ["http://localhost:5173"];

    builder.Services.AddCors(options =>
    {
        options.AddPolicy("Frontend", policy =>
        {
            policy
                .WithOrigins(origins)
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        });
    });
}

builder.Services
    .AddHealthChecks()
    .AddNpgSql(
        connectionString: connectionString,
        name: "postgresql",
        tags: ["ready"]);

var app = builder.Build();

app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseMiddleware<SecurityHeadersMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "Payment Risk Monitoring System API v1");
        options.RoutePrefix = "swagger";
    });
}

var migrateOnStartup = builder.Configuration.GetValue(
    "Database:MigrateOnStartup",
    builder.Environment.IsDevelopment());
var seedOnStartup = builder.Configuration.GetValue(
    "Database:SeedOnStartup",
    builder.Environment.IsDevelopment());

if (migrateOnStartup || seedOnStartup)
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();
    var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>()
        .CreateLogger("DatabaseSeeder");
    await DatabaseSeeder.InitializeAsync(
        dbContext,
        passwordHasher,
        logger,
        applyMigrations: migrateOnStartup,
        seedData: seedOnStartup);
}

if (!app.Environment.IsEnvironment("Testing"))
{
    app.UseHttpsRedirection();
}

if (corsOrigins is { Length: > 0 } || app.Environment.IsDevelopment())
{
    app.UseCors("Frontend");
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<MonitoringHub>(MonitoringRealtime.HubPath);
app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false,
    ResponseWriter = WriteHealthCheckResponse
}).AllowAnonymous();
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = registration => registration.Tags.Contains("ready"),
    ResponseWriter = WriteHealthCheckResponse
}).AllowAnonymous();

app.Logger.LogInformation("Payment Risk Monitoring System API started.");

app.Run();

static Task WriteHealthCheckResponse(HttpContext context, Microsoft.Extensions.Diagnostics.HealthChecks.HealthReport report)
{
    context.Response.ContentType = "application/json";

    var response = new
    {
        status = report.Status.ToString(),
        checks = report.Entries.Select(entry => new
        {
            name = entry.Key,
            status = entry.Value.Status.ToString(),
            description = entry.Value.Description
        }),
        timestamp = DateTime.UtcNow
    };

    return context.Response.WriteAsync(JsonSerializer.Serialize(response));
}

public partial class Program;
