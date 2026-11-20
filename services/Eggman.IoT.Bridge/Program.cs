using Eggman.Contracts.IoT;
using Eggman.IoT.Bridge.Data;
using Eggman.IoT.Bridge.Security;
using Eggman.IoT.Bridge.Services;
using Eggman.IoT.Bridge.Validators;
using Eggman.ServiceDefaults;
using Eggman.ServiceDefaults.Vault;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

if (args.Contains("--healthcheck", StringComparer.OrdinalIgnoreCase))
{
    return await ZeroTrustExtensions.RunSelfHealthCheckAsync("https://127.0.0.1:8443/health/live");
}

var builder = WebApplication.CreateBuilder(args);

var configuredMaxRequestBytes = builder.Configuration.GetValue<long?>("Security:MaxRequestBodyBytes") ?? 1 * 1024 * 1024;
builder.WebHost.ConfigureKestrel(kestrel =>
{
    kestrel.Limits.MaxRequestBodySize = configuredMaxRequestBytes;
    kestrel.Limits.RequestHeadersTimeout = TimeSpan.FromSeconds(15);
    kestrel.AddServerHeader = false;
});

builder.AddEggmanVaultConfiguration(opts =>
{
    opts.DatabaseRole ??= "iot-bridge-role";
    opts.RabbitMqRole ??= "iot-bridge";
});
builder.AddEggmanZeroTrustDefaults();

builder.Services
    .AddEggmanKeycloakJwtAuth(builder.Configuration, "eggman-iot-bridge")
    .AddAuthentication()
    .AddScheme<DeviceHmacAuthOptions, DeviceHmacAuthHandler>(DeviceHmacAuthOptions.SchemeName, _ => { });

builder.Services.AddAuthorizationBuilder()
    .AddPolicy("DeviceHmacPolicy", policy =>
        policy.AddAuthenticationSchemes(DeviceHmacAuthOptions.SchemeName)
              .RequireAuthenticatedUser())
    .AddEggmanScopePolicy("IoTOperatorPolicy", "iot:control");

builder.Services.AddDbContextFactory<IoTBridgeDbContext>((sp, options) =>
{
    var cfg = sp.GetRequiredService<IConfiguration>();
    var pgHost = cfg["Postgres:Host"];
    if (!string.IsNullOrWhiteSpace(pgHost))
    {
        var db = cfg["Postgres:Database"] ?? "iot_bridge";
        var user = cfg["Postgres:Username"] ?? "svc_iot_bridge";
        var pass = cfg["Postgres:Password"] ?? string.Empty;
        var ca = Environment.GetEnvironmentVariable("SSL_CERT_FILE") ?? "/etc/eggman/certs/ca.crt";
        options.UseNpgsql($"Host={pgHost};Database={db};Username={user};Password={pass};SSL Mode=VerifyFull;Root Certificate={ca}");
    }
    else
    {
        options.UseInMemoryDatabase("EggmanIoTBridgeDev");
    }
});

builder.Services.AddSingleton<IValidator<SensorReadingDto>, SensorReadingValidator>();
builder.Services.AddSingleton<IValidator<RfidVerifyRequest>, RfidVerifyRequestValidator>();
builder.Services.AddSingleton<IValidator<RackAirflowCommand>, RackAirflowCommandValidator>();
builder.Services.AddSingleton<IoTTelemetryService>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbFactory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<IoTBridgeDbContext>>();
    await using var db = await dbFactory.CreateDbContextAsync();
    await db.Database.EnsureCreatedAsync();
}

app.UseEggmanRequestBodySizeLimit(1 * 1024 * 1024);
app.UseAuthentication();
app.UseAuthorization();
app.MapEggmanHealthEndpoints();

// Physical Hardware Endpoints (TLS + HMAC-SHA256 + Timestamp + Nonce)
app.MapPost("/api/v1/devices/telemetry", async (
    SensorReadingDto reading,
    IValidator<SensorReadingDto> validator,
    IoTTelemetryService svc,
    CancellationToken ct) =>
{
    var validation = await validator.ValidateAsync(reading, ct);
    if (!validation.IsValid)
    {
        return Results.ValidationProblem(validation.ToDictionary());
    }
    await svc.IngestTelemetryAsync(reading, ct);
    return Results.Accepted();
}).RequireAuthorization("DeviceHmacPolicy");

app.MapPost("/api/v1/devices/rfid/verify", async (
    RfidVerifyRequest req,
    IValidator<RfidVerifyRequest> validator,
    IoTTelemetryService svc,
    CancellationToken ct) =>
{
    var validation = await validator.ValidateAsync(req, ct);
    if (!validation.IsValid)
    {
        return Results.ValidationProblem(validation.ToDictionary());
    }
    var verdict = await svc.VerifyRfidAsync(req, ct);
    return Results.Ok(verdict);
}).RequireAuthorization("DeviceHmacPolicy");

// Tailscale Operator Endpoints (Keycloak JWT + iot:control scope)
app.MapGet("/api/v1/rack/telemetry", (IoTTelemetryService svc) =>
    Results.Ok(svc.GetLatestReadings()))
    .RequireAuthorization("IoTOperatorPolicy");

app.MapPost("/api/v1/rack/airflow", async (
    RackAirflowCommand cmd,
    IValidator<RackAirflowCommand> validator,
    IoTTelemetryService svc,
    CancellationToken ct) =>
{
    var validation = await validator.ValidateAsync(cmd, ct);
    if (!validation.IsValid)
    {
        return Results.ValidationProblem(validation.ToDictionary());
    }
    await svc.SetRackAirflowAsync(cmd, ct);
    return Results.Accepted();
}).RequireAuthorization("IoTOperatorPolicy");

app.Run();
return 0;

public partial class Program { }
