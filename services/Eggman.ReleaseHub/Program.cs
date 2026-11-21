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
var configuredMaxChunkBytes = builder.Configuration.GetValue<long?>("Security:MaxChunkBodyBytes") ?? 55L * 1024 * 1024;
builder.WebHost.ConfigureKestrel(kestrel =>
{
    kestrel.Limits.MaxRequestBodySize = Math.Max(configuredMaxRequestBytes, configuredMaxChunkBytes);
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
    .AddEggmanScopePolicy("ReleasesWrite", "releases:write")
    .AddEggmanScopePolicy("ReleasePublishPolicy", "releases:publish");

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
builder.Services.AddSingleton<IValidator<InitChunkedUploadRequest>, InitChunkedUploadRequestValidator>();
builder.Services.AddSingleton<ArtifactCatalogService>();
builder.Services.AddSingleton<ChunkedUploadService>();
builder.Services.AddHostedService<UploadCleanupWorker>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbFactory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<ReleaseHubDbContext>>();
    await using var db = await dbFactory.CreateDbContextAsync();
    await db.Database.EnsureCreatedAsync();

    if (db.Database.IsNpgsql())
    {
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE release_artifacts ADD COLUMN IF NOT EXISTS platform VARCHAR(32) NOT NULL DEFAULT 'Cross-Platform';
            CREATE TABLE IF NOT EXISTS upload_sessions (
                "Id" uuid PRIMARY KEY,
                "AppSlug" varchar(64) NOT NULL,
                "Kind" varchar(16) NOT NULL,
                "Platform" varchar(32) NOT NULL,
                "Version" varchar(32) NOT NULL,
                "FileName" varchar(128) NOT NULL,
                "Description" varchar(500) NOT NULL,
                "TotalSizeBytes" bigint NOT NULL,
                "TotalChunks" integer NOT NULL,
                "ExpectedSha256" varchar(64) NOT NULL,
                "Status" varchar(16) NOT NULL,
                "CreatedBySub" varchar(128) NOT NULL,
                "CreatedAtUtc" timestamp with time zone NOT NULL,
                "ExpiresAtUtc" timestamp with time zone NOT NULL,
                "CompletedAtUtc" timestamp with time zone NULL
            );
            CREATE INDEX IF NOT EXISTS "IX_upload_sessions_Status_ExpiresAtUtc" ON upload_sessions ("Status", "ExpiresAtUtc");
            CREATE TABLE IF NOT EXISTS upload_chunks (
                "Id" bigserial PRIMARY KEY,
                "UploadSessionId" uuid NOT NULL REFERENCES upload_sessions ("Id") ON DELETE CASCADE,
                "ChunkIndex" integer NOT NULL,
                "SizeBytes" bigint NOT NULL,
                "Sha256" varchar(64) NOT NULL,
                "ReceivedAtUtc" timestamp with time zone NOT NULL
            );
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_upload_chunks_UploadSessionId_ChunkIndex" ON upload_chunks ("UploadSessionId", "ChunkIndex");
            """);
    }
}

app.UseEggmanRequestBodySizeLimit(
    defaultMaxBytes: 1L * 1024 * 1024,
    apiMaxBytes: 1L * 1024 * 1024,
    routeLimitResolver: (path, cfg) =>
    {
        var val = path.Value ?? string.Empty;
        if (val.StartsWith("/api/releases/uploads/", StringComparison.OrdinalIgnoreCase) &&
            val.Contains("/chunks/", StringComparison.OrdinalIgnoreCase))
        {
            return cfg.GetValue<long?>("Security:MaxChunkBodyBytes") ?? 55L * 1024 * 1024;
        }
        return null;
    });
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

app.MapPost("/api/releases/uploads/init", async (
    InitChunkedUploadRequest req,
    IValidator<InitChunkedUploadRequest> validator,
    ChunkedUploadService uploads,
    HttpContext ctx,
    CancellationToken ct) =>
{
    var validation = await validator.ValidateAsync(req, ct);
    if (!validation.IsValid)
    {
        return Results.ValidationProblem(validation.ToDictionary());
    }

    var result = await uploads.InitSessionAsync(req, GetActorSub(ctx), ct);
    return result.StatusCode == StatusCodes.Status201Created && result.Payload is InitChunkedUploadResponse initResp
        ? Results.Created($"/api/releases/uploads/{initResp.UploadId}", initResp)
        : Results.Json(result.Payload, statusCode: result.StatusCode);
}).RequireAuthorization("ReleasePublishPolicy");

app.MapPut("/api/releases/uploads/{uploadId:guid}/chunks/{chunkIndex:int}", async (
    Guid uploadId,
    int chunkIndex,
    ChunkedUploadService uploads,
    HttpContext ctx,
    CancellationToken ct) =>
{
    var result = await uploads.StoreChunkAsync(uploadId, chunkIndex, ctx.Request.Body, GetActorSub(ctx), ct);
    return Results.Json(result.Payload, statusCode: result.StatusCode);
}).RequireAuthorization("ReleasePublishPolicy");

app.MapPost("/api/releases/uploads/{uploadId:guid}/complete", async (
    Guid uploadId,
    ChunkedUploadService uploads,
    HttpContext ctx,
    CancellationToken ct) =>
{
    var result = await uploads.CompleteSessionAsync(uploadId, GetActorSub(ctx), ct);
    return result.StatusCode == StatusCodes.Status201Created && result.Payload is CompleteChunkedUploadResponse done
        ? Results.Created($"/api/v1/releases/{done.Kind}/{done.FileName}", done)
        : Results.Json(result.Payload, statusCode: result.StatusCode);
}).RequireAuthorization("ReleasePublishPolicy");

app.Run();
return 0;

static string GetActorSub(HttpContext ctx) =>
    ctx.User.FindFirst("sub")?.Value
    ?? ctx.User.FindFirst("azp")?.Value
    ?? "unknown";

public partial class Program { }
