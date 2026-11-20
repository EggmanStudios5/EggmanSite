using Eggman.Contracts.Events;
using Eggman.Contracts.Releases;
using Eggman.ReleaseHub.Data;
using Eggman.ReleaseHub.Services;
using Eggman.ReleaseHub.Validators;
using Eggman.ServiceDefaults;
using Eggman.ServiceDefaults.Messaging;
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
    opts.DatabaseRole ??= "releasehub-role";
    opts.RabbitMqRole ??= "releasehub-pub";
});
builder.AddEggmanZeroTrustDefaults();
builder.Services.AddEggmanKeycloakJwtAuth(builder.Configuration, "eggman-releasehub");

// Independent downstream JWT validation — never rely solely on YARP
builder.Services.AddAuthorizationBuilder()
    .AddEggmanScopePolicy("ReleasesWrite", "releases:write");

builder.Services.AddDbContextFactory<ReleaseHubDbContext>((sp, options) =>
{
    var cfg = sp.GetRequiredService<IConfiguration>();
    var pgHost = cfg["Postgres:Host"];
    if (!string.IsNullOrWhiteSpace(pgHost))
    {
        var db = cfg["Postgres:Database"] ?? "releasehub";
        var user = cfg["Postgres:Username"] ?? "svc_releasehub";
        var pass = cfg["Postgres:Password"] ?? string.Empty;
        var ca = Environment.GetEnvironmentVariable("SSL_CERT_FILE") ?? "/etc/eggman/certs/ca.crt";
        options.UseNpgsql($"Host={pgHost};Database={db};Username={user};Password={pass};SSL Mode=VerifyFull;Root Certificate={ca}");
    }
    else
    {
        options.UseInMemoryDatabase("EggmanReleaseHubDev");
    }
});

builder.Services.AddSingleton<IValidator<PublishReleaseRequest>, PublishReleaseRequestValidator>();
builder.Services.AddSingleton<ArtifactCatalogService>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbFactory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<ReleaseHubDbContext>>();
    await using var db = await dbFactory.CreateDbContextAsync();
    await db.Database.EnsureCreatedAsync();
}

app.UseEggmanRequestBodySizeLimit(1 * 1024 * 1024);
app.UseAuthentication();
app.UseAuthorization();
app.MapEggmanHealthEndpoints();

app.MapGet("/api/v1/altstore/source.json", async (ArtifactCatalogService catalog, CancellationToken ct) =>
    Results.Ok(await catalog.BuildAltStoreSourceAsync(ct))).AllowAnonymous();

app.MapGet("/api/v1/firmware", async (ArtifactCatalogService catalog, CancellationToken ct) =>
    Results.Ok(await catalog.GetFirmwareManifestsAsync(ct))).AllowAnonymous();

app.MapGet("/api/v1/games", async (ArtifactCatalogService catalog, CancellationToken ct) =>
    Results.Ok(await catalog.GetGameBuildsAsync(ct))).AllowAnonymous();

app.MapGet("/api/v1/releases/{kind}/{fileName}", async (
    string kind,
    string fileName,
    ArtifactCatalogService catalog,
    HttpContext ctx,
    CancellationToken ct) =>
{
    var fullPath = catalog.ResolveArtifactPath(kind, fileName);
    if (fullPath is null || !File.Exists(fullPath))
    {
        return Results.NotFound(new { error = "Release artifact not found." });
    }

    var sha256 = await ArtifactCatalogService.ComputeFileSha256Async(fullPath, ct);
    ctx.Response.Headers["X-Checksum-Sha256"] = sha256;
    ctx.Response.Headers["X-Content-Type-Options"] = "nosniff";
    return Results.File(fullPath, "application/octet-stream", fileName);
}).AllowAnonymous();

app.MapPost("/api/v1/releases", async (
    PublishReleaseRequest req,
    IValidator<PublishReleaseRequest> validator,
    ArtifactCatalogService catalog,
    TlsRabbitMqPublisher publisher,
    HttpContext ctx,
    CancellationToken ct) =>
{
    var validation = await validator.ValidateAsync(req, ct);
    if (!validation.IsValid)
    {
        return Results.ValidationProblem(validation.ToDictionary());
    }

    var entry = await catalog.RegisterReleaseAsync(req, ct);
    var actor = ctx.User.FindFirst("sub")?.Value ?? "unknown";

    await publisher.PublishAsync(
        exchange: "eggman.public.events",
        routingKey: $"release.published.{entry.Kind}",
        payload: new ReleasePublishedEvent(
            ArtifactId: $"{entry.Kind}/{entry.FileName}",
            Channel: entry.Kind,
            Version: entry.Version,
            Sha256: entry.Sha256,
            PublishedAtUtc: entry.ReleasedAtUtc),
        vaultSecretPath: "secret/data/public/releasehub/rabbitmq",
        ct: ct);

    await publisher.PublishAsync(
        exchange: "eggman.public.events",
        routingKey: "release.audit",
        payload: new SecurityAuditEvent("Eggman.ReleaseHub", "ReleasePublished", actor, "Success", DateTimeOffset.UtcNow),
        vaultSecretPath: "secret/data/public/releasehub/rabbitmq",
        ct: ct);

    return Results.Created($"/api/v1/releases/{entry.Kind}/{entry.FileName}", entry);
}).RequireAuthorization("ReleasesWrite");

app.Run();
return 0;

public partial class Program { }
