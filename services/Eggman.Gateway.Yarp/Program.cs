using System.Collections.Concurrent;
using System.Diagnostics.Metrics;
using System.Net;
using System.Threading.RateLimiting;
using Eggman.Contracts.Events;
using Eggman.ServiceDefaults;
using Eggman.ServiceDefaults.Messaging;
using Eggman.ServiceDefaults.Vault;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Yarp.ReverseProxy.Forwarder;
using Yarp.ReverseProxy.Transforms;

if (args.Contains("--healthcheck", StringComparer.OrdinalIgnoreCase))
{
    return await ZeroTrustExtensions.RunSelfHealthCheckAsync("http://127.0.0.1:8080/health/live");
}

var builder = WebApplication.CreateBuilder(args);

var configuredMaxRequestBytes = builder.Configuration.GetValue<long?>("Security:MaxRequestBodyBytes") ?? 10 * 1024 * 1024;
builder.WebHost.ConfigureKestrel(kestrel =>
{
    kestrel.Limits.MaxRequestBodySize = configuredMaxRequestBytes;
    kestrel.Limits.RequestHeadersTimeout = TimeSpan.FromSeconds(15);
    kestrel.AddServerHeader = false;
});

builder.AddEggmanVaultConfiguration();
builder.AddEggmanZeroTrustDefaults();
builder.Services.AddEggmanKeycloakJwtAuth(builder.Configuration);

builder.Services.AddAuthorizationBuilder()
    .AddEggmanScopePolicy("ReleaseWritePolicy", "releases:write");

builder.Services.AddCors(options =>
{
    options.AddPolicy("EggmanPublicCors", policy =>
        policy.WithOrigins(
                "https://eggmanstudios.me",
                "https://docs.eggmanstudios.me",
                "https://releases.eggmanstudios.me",
                "https://altstore.eggmanstudios.me")
              .WithMethods("GET", "HEAD", "POST", "OPTIONS")
              .WithHeaders("Authorization", "Content-Type"));
});

static string GetClientPartitionKey(HttpContext ctx)
{
    var ip = ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    var sub = ctx.User.FindFirst("sub")?.Value;
    return string.IsNullOrWhiteSpace(sub) ? $"ip:{ip}" : $"user:{sub}:{ip}";
}

builder.Services.AddRateLimiter();
builder.Services.AddOptions<RateLimiterOptions>()
    .Configure<IConfiguration>((options, cfg) =>
    {
        var windowSeconds = Math.Max(1, cfg.GetValue<int?>("RateLimiting:WindowSeconds") ?? 60);
        var globalPermitLimit = Math.Max(1, cfg.GetValue<int?>("RateLimiting:GlobalPermitLimit") ?? 120);
        var publicWebLimit = Math.Max(1, cfg.GetValue<int?>("RateLimiting:PublicWebPermitLimit") ?? 120);
        var publicApiLimit = Math.Max(1, cfg.GetValue<int?>("RateLimiting:PublicApiPermitLimit") ?? 60);
        var authStrictLimit = Math.Max(1, cfg.GetValue<int?>("RateLimiting:AuthStrictPermitLimit") ?? 20);
        var rateWindow = TimeSpan.FromSeconds(windowSeconds);

        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

        options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
        {
            if (ctx.Request.Path.StartsWithSegments("/health/live", StringComparison.OrdinalIgnoreCase))
            {
                return RateLimitPartition.GetNoLimiter("health");
            }
            return RateLimitPartition.GetFixedWindowLimiter(
                $"global:{GetClientPartitionKey(ctx)}",
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = globalPermitLimit,
                    Window = rateWindow,
                    QueueLimit = 0,
                    AutoReplenishment = true
                });
        });

        options.AddPolicy("public-web", ctx =>
            RateLimitPartition.GetFixedWindowLimiter(
                GetClientPartitionKey(ctx),
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = publicWebLimit,
                    Window = rateWindow,
                    QueueLimit = 0,
                    AutoReplenishment = true
                }));
        options.AddPolicy("public-api", ctx =>
            RateLimitPartition.GetFixedWindowLimiter(
                GetClientPartitionKey(ctx),
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = publicApiLimit,
                    Window = rateWindow,
                    QueueLimit = 0,
                    AutoReplenishment = true
                }));
        options.AddPolicy("auth-strict", ctx =>
            RateLimitPartition.GetFixedWindowLimiter(
                ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = authStrictLimit,
                    Window = rateWindow,
                    QueueLimit = 0,
                    AutoReplenishment = true
                }));
    });

// Trust forwarded headers strictly from net_public_ingress (cloudflared 172.28.2.0/28)
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedHost;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
    options.KnownNetworks.Add(new Microsoft.AspNetCore.HttpOverrides.IPNetwork(IPAddress.Parse("172.28.2.0"), 28));
});

builder.Services.AddSingleton<IForwarderHttpClientFactory, InternalCaForwarderHttpClientFactory>();
builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"))
    .AddTransforms(builderContext =>
    {
        builderContext.AddRequestTransform(transformContext =>
        {
            var proxyHeaders = transformContext.ProxyRequest.Headers;
            foreach (var key in proxyHeaders.Select(h => h.Key).ToArray())
            {
                if (IsSpoofableIdentityOrProxyHeader(key))
                {
                    proxyHeaders.Remove(key);
                }
            }
            return ValueTask.CompletedTask;
        });
    });

var app = builder.Build();

var gatewayMeter = new Meter("Eggman.Gateway.Yarp");
var authFailureCounter = gatewayMeter.CreateCounter<long>("eggman_gateway_auth_failures_total");
var recentAuthFailures = new ConcurrentQueue<DateTimeOffset>();
var lastSpikeAlert = DateTimeOffset.MinValue;

// 1. Outer security-headers & auth-failure telemetry wrapper
app.Use(async (ctx, next) =>
{
    var respHeaders = ctx.Response.Headers;
    respHeaders["X-Content-Type-Options"] = "nosniff";
    respHeaders["X-Frame-Options"] = "DENY";
    respHeaders["Referrer-Policy"] = "strict-origin-when-cross-origin";
    respHeaders["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
    respHeaders["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload";

    if (!ctx.Request.Host.Host.Equals("auth.eggmanstudios.me", StringComparison.OrdinalIgnoreCase))
    {
        respHeaders["Content-Security-Policy"] =
            "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://releases.eggmanstudios.me https://auth.eggmanstudios.me; object-src 'none'; frame-ancestors 'none'; base-uri 'self'";
    }

    await next();

    if (ctx.Response.StatusCode is StatusCodes.Status401Unauthorized or StatusCodes.Status403Forbidden)
    {
        authFailureCounter.Add(1);
        var now = DateTimeOffset.UtcNow;
        recentAuthFailures.Enqueue(now);
        while (recentAuthFailures.TryPeek(out var oldest) && (now - oldest).TotalSeconds > 60)
        {
            recentAuthFailures.TryDequeue(out _);
        }
        if (recentAuthFailures.Count >= 20 && (now - lastSpikeAlert).TotalMinutes >= 5)
        {
            lastSpikeAlert = now;
            var publisher = ctx.RequestServices.GetService<TlsRabbitMqPublisher>();
            if (publisher is not null)
            {
                _ = publisher.PublishAsync(
                    "eggman.public.events",
                    "gateway.auth.spike",
                    new SecurityAuditEvent(
                        "Eggman.Gateway.Yarp",
                        "AuthFailureSpike",
                        ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                        $"401/403 count={recentAuthFailures.Count}",
                        now),
                    ct: CancellationToken.None);
            }
        }
    }
});

// 2. Request body size caps (10 MiB overall, 1 MiB for /api/ & /realms/)
app.UseEggmanRequestBodySizeLimit(10 * 1024 * 1024, apiMaxBytes: 1 * 1024 * 1024);

// 3. Strip untrusted forwarding headers BEFORE UseForwardedHeaders, then strip all spoofable headers AFTER
app.Use(async (ctx, next) =>
{
    if (!IsTrustedCloudflaredProxy(ctx.Connection.RemoteIpAddress))
    {
        string[] untrustedForwarding = ["X-Forwarded-For", "X-Forwarded-Host", "X-Forwarded-Proto", "Forwarded", "CF-Connecting-IP", "X-Real-IP"];
        foreach (var key in ctx.Request.Headers.Keys.ToArray())
        {
            if (untrustedForwarding.Any(h => h.Equals(key, StringComparison.OrdinalIgnoreCase)))
            {
                ctx.Request.Headers.Remove(key);
            }
        }
    }
    await next();
});

app.UseForwardedHeaders();

app.Use(async (ctx, next) =>
{
    foreach (var key in ctx.Request.Headers.Keys.ToArray())
    {
        if (IsSpoofableIdentityOrProxyHeader(key))
        {
            ctx.Request.Headers.Remove(key);
        }
    }
    await next();
});

// 4-7. Routing -> Cors -> Authentication -> RateLimiter (enables per-user sub partitioning)
app.UseRouting();
app.UseCors("EggmanPublicCors");
app.UseAuthentication();
app.UseRateLimiter();

// 8. Blocked-path, traversal & status read-only guard
app.Use(async (ctx, next) =>
{
    var host = ctx.Request.Host.Host;
    var path = ctx.Request.Path.Value ?? string.Empty;
    var normalizedPath = "/" + path.TrimStart('/');
    var featureRawTarget = ctx.Features.Get<IHttpRequestFeature>()?.RawTarget;
    var rawTarget = string.IsNullOrEmpty(featureRawTarget) ? path : featureRawTarget;

    static bool HasTraversalOrEncodingAbuse(string value) =>
        value.Contains("..", StringComparison.Ordinal) ||
        value.Contains("%2e", StringComparison.OrdinalIgnoreCase) ||
        value.Contains("%2f", StringComparison.OrdinalIgnoreCase) ||
        value.Contains('\\', StringComparison.Ordinal);

    bool isBlockedPath =
        normalizedPath.StartsWith("/admin", StringComparison.OrdinalIgnoreCase) ||
        normalizedPath.StartsWith("/realms/master", StringComparison.OrdinalIgnoreCase) ||
        normalizedPath.StartsWith("/socket.io", StringComparison.OrdinalIgnoreCase) ||
        normalizedPath.StartsWith("/dashboard", StringComparison.OrdinalIgnoreCase) ||
        normalizedPath.StartsWith("/settings", StringComparison.OrdinalIgnoreCase) ||
        normalizedPath.StartsWith("/swagger", StringComparison.OrdinalIgnoreCase) ||
        normalizedPath.StartsWith("/.env", StringComparison.OrdinalIgnoreCase) ||
        normalizedPath.StartsWith("/.git", StringComparison.OrdinalIgnoreCase) ||
        HasTraversalOrEncodingAbuse(path) ||
        HasTraversalOrEncodingAbuse(normalizedPath) ||
        HasTraversalOrEncodingAbuse(rawTarget) ||
        ((normalizedPath.StartsWith("/metrics", StringComparison.OrdinalIgnoreCase) ||
          normalizedPath.StartsWith("/health/ready", StringComparison.OrdinalIgnoreCase)) &&
         !ZeroTrustExtensions.IsInternalRequest(ctx));

    if (isBlockedPath)
    {
        ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
        await ctx.Response.WriteAsync("Forbidden by Zero Trust Gateway Policy.");
        return;
    }

    if (host.Equals("status.eggmanstudios.me", StringComparison.OrdinalIgnoreCase) &&
        !HttpMethods.IsGet(ctx.Request.Method) &&
        !HttpMethods.IsHead(ctx.Request.Method))
    {
        ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
        await ctx.Response.WriteAsync("Read-only public status endpoint.");
        return;
    }

    await next();
});

// 9-10. Authorization -> Endpoints
app.UseAuthorization();
app.MapEggmanHealthEndpoints();
app.MapReverseProxy();

app.Run();
return 0;

static bool IsTrustedCloudflaredProxy(IPAddress? ip)
{
    if (ip is null)
    {
        return false;
    }
    if (ip.IsIPv4MappedToIPv6)
    {
        ip = ip.MapToIPv4();
    }
    var bytes = ip.GetAddressBytes();
    return bytes.Length == 4 && bytes[0] == 172 && bytes[1] == 28 && bytes[2] == 2 && bytes[3] < 16;
}

static bool IsSpoofableIdentityOrProxyHeader(string headerName)
{
    if (headerName.StartsWith("X-Eggman-Internal-", StringComparison.OrdinalIgnoreCase))
    {
        return true;
    }
    string[] exact =
    [
        "X-User-Id",
        "X-Roles",
        "X-User-Roles",
        "X-Real-IP",
        "X-Client-IP",
        "X-Forwarded-For",
        "X-Forwarded-User",
        "X-Forwarded-Groups",
        "X-Forwarded-Email",
        "X-Forwarded-Preferred-Username",
        "X-Remote-User",
        "X-Auth-User",
        "X-Original-URL",
        "X-Rewrite-URL"
    ];
    return exact.Any(h => h.Equals(headerName, StringComparison.OrdinalIgnoreCase));
}

public partial class Program { }

file sealed class InternalCaForwarderHttpClientFactory : ForwarderHttpClientFactory
{
    protected override HttpMessageHandler WrapHandler(ForwarderHttpClientContext context, HttpMessageHandler handler)
    {
        if (handler is SocketsHttpHandler socketsHandler)
        {
            using var caTemplate = ZeroTrustExtensions.CreateInternalCaHttpHandler();
            if (caTemplate.SslOptions.RemoteCertificateValidationCallback is not null)
            {
                socketsHandler.SslOptions.RemoteCertificateValidationCallback =
                    caTemplate.SslOptions.RemoteCertificateValidationCallback;
            }
        }
        return base.WrapHandler(context, handler);
    }
}
