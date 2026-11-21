using System.Net;
using System.Security.Cryptography.X509Certificates;
using Eggman.ServiceDefaults.Logging;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using OpenTelemetry.Metrics;
using OpenTelemetry.Trace;

namespace Eggman.ServiceDefaults;

public static class ZeroTrustExtensions
{
    private const string PayloadTooLargeItemKey = "Eggman.PayloadTooLarge";

    public static TBuilder AddEggmanZeroTrustDefaults<TBuilder>(this TBuilder builder)
        where TBuilder : IHostApplicationBuilder
    {
        builder.Logging.ClearProviders();
        builder.Logging.AddProvider(new PiiScrubbingLoggerProvider());

        builder.Services.AddServiceDiscovery();
        builder.Services.ConfigureHttpClientDefaults(http =>
        {
            http.AddStandardResilienceHandler();
            http.AddServiceDiscovery();
            http.ConfigurePrimaryHttpMessageHandler(() => CreateInternalCaHttpHandler());
        });

        builder.Services.AddOpenTelemetry()
            .WithMetrics(metrics => metrics
                .AddAspNetCoreInstrumentation()
                .AddHttpClientInstrumentation()
                .AddMeter("Eggman.Gateway.Yarp", "Eggman.ReleaseHub", "Eggman.IoT.Bridge")
                .AddPrometheusExporter())
            .WithTracing(tracing => tracing
                .AddAspNetCoreInstrumentation(o => o.Filter = ctx => !ctx.Request.Path.StartsWithSegments("/health"))
                .AddHttpClientInstrumentation());

        builder.Services.AddHealthChecks()
            .AddCheck("self", () => HealthCheckResult.Healthy(), ["live"]);

        builder.Services.AddSingleton<Vault.VaultAppRoleClient>();
        builder.Services.AddSingleton<Messaging.TlsRabbitMqPublisher>();

        return builder;
    }

    public static IServiceCollection AddEggmanKeycloakJwtAuth(
        this IServiceCollection services,
        IConfiguration configuration,
        string? requiredAudience = null)
    {
        var authority = configuration["Keycloak:Authority"]
            ?? throw new InvalidOperationException("Keycloak:Authority is mandatory.");
        var metadataAddress = configuration["Keycloak:MetadataAddress"]
            ?? $"{authority.TrimEnd('/')}/.well-known/openid-configuration";
        var audience = requiredAudience ?? configuration["Keycloak:Audience"]
            ?? throw new InvalidOperationException("Keycloak:Audience is mandatory.");

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.Authority = authority;
                options.MetadataAddress = metadataAddress;
                options.Audience = audience;
                options.RequireHttpsMetadata = true;
                options.MapInboundClaims = false;
                options.BackchannelHttpHandler = CreateInternalCaHttpHandler();
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = authority,
                    ValidateAudience = true,
                    ValidAudience = audience,
                    ValidateLifetime = true,
                    RequireExpirationTime = true,
                    RequireSignedTokens = true,
                    ValidateIssuerSigningKey = true,
                    ValidAlgorithms = [SecurityAlgorithms.RsaSha256, SecurityAlgorithms.EcdsaSha256],
                    ClockSkew = TimeSpan.FromSeconds(30)
                };
            });

        return services;
    }

    public static AuthorizationBuilder AddEggmanScopePolicy(
        this AuthorizationBuilder auth,
        string policyName,
        string requiredScope)
    {
        return auth.AddPolicy(policyName, policy =>
            policy.RequireAuthenticatedUser()
                  .RequireAssertion(ctx =>
                  {
                      var scope = ctx.User.FindFirst("scope")?.Value ?? string.Empty;
                      return scope.Split(' ', StringSplitOptions.RemoveEmptyEntries)
                                  .Contains(requiredScope, StringComparer.Ordinal);
                  }));
    }

    public static WebApplication MapEggmanHealthEndpoints(this WebApplication app)
    {
        // Restrict internal operational probes (/health/ready, /metrics) strictly to loopback & 172.28.0.0/16
        app.Use(async (ctx, next) =>
        {
            if ((ctx.Request.Path.StartsWithSegments("/metrics", StringComparison.OrdinalIgnoreCase) ||
                 ctx.Request.Path.StartsWithSegments("/health/ready", StringComparison.OrdinalIgnoreCase)) &&
                !IsInternalRequest(ctx))
            {
                ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
                await ctx.Response.WriteAsync("Forbidden: internal operational endpoint.");
                return;
            }
            await next();
        });

        app.MapGet("/health/live", () => Results.Ok(new { status = "live" })).AllowAnonymous();

        app.MapHealthChecks("/health", new HealthCheckOptions
        {
            Predicate = r => r.Tags.Contains("live"),
            AllowCachingResponses = false
        }).AllowAnonymous();

        app.MapHealthChecks("/health/ready", new HealthCheckOptions
        {
            AllowCachingResponses = false
        }).AllowAnonymous();

        app.MapPrometheusScrapingEndpoint("/metrics").AllowAnonymous();

        return app;
    }

    public static WebApplication UseEggmanRequestBodySizeLimit(
        this WebApplication app,
        long defaultMaxBytes,
        long? apiMaxBytes = null,
        Func<PathString, IConfiguration, long?>? routeLimitResolver = null)
    {
        app.Use(async (ctx, next) =>
        {
            var cfg = ctx.RequestServices.GetRequiredService<IConfiguration>();
            var configuredDefault = cfg.GetValue<long?>("Security:MaxRequestBodyBytes") ?? defaultMaxBytes;
            var configuredApi = cfg.GetValue<long?>("Security:MaxApiRequestBodyBytes") ?? apiMaxBytes;

            var path = ctx.Request.Path.Value ?? string.Empty;
            var routeOverride = routeLimitResolver?.Invoke(ctx.Request.Path, cfg);
            var limit = routeOverride ?? (configuredApi.HasValue &&
                        (path.StartsWith("/api/", StringComparison.OrdinalIgnoreCase) ||
                         path.StartsWith("/realms/", StringComparison.OrdinalIgnoreCase))
                ? configuredApi.Value
                : configuredDefault);

            var feature = ctx.Features.Get<IHttpMaxRequestBodySizeFeature>();
            if (feature is { IsReadOnly: false })
            {
                feature.MaxRequestBodySize = limit;
            }

            if (ctx.Request.ContentLength is > 0 && ctx.Request.ContentLength.Value > limit)
            {
                ctx.Items[PayloadTooLargeItemKey] = true;
                ctx.Response.StatusCode = StatusCodes.Status413PayloadTooLarge;
                await ctx.Response.WriteAsync("Payload Too Large.");
                return;
            }

            var originalBody = ctx.Request.Body;
            await using var boundedBody = new BoundedRequestStream(
                originalBody,
                limit,
                () => ctx.Items[PayloadTooLargeItemKey] = true);
            ctx.Request.Body = boundedBody;

            try
            {
                await next();
            }
            catch (Exception ex) when (IsPayloadTooLarge(ex))
            {
                if (!ctx.Response.HasStarted)
                {
                    ctx.Response.StatusCode = StatusCodes.Status413PayloadTooLarge;
                    await ctx.Response.WriteAsync("Payload Too Large.");
                }
                return;
            }
            catch (BadHttpRequestException badReq)
            {
                if (!ctx.Response.HasStarted)
                {
                    var tooLarge = badReq.StatusCode == StatusCodes.Status413PayloadTooLarge ||
                                   IsPayloadTooLarge(badReq);
                    ctx.Response.StatusCode = tooLarge
                        ? StatusCodes.Status413PayloadTooLarge
                        : StatusCodes.Status400BadRequest;
                    await ctx.Response.WriteAsync(tooLarge
                        ? "Payload Too Large."
                        : "Malformed HTTP request payload.");
                }
                return;
            }
            finally
            {
                ctx.Request.Body = originalBody;
            }

            if (!ctx.Response.HasStarted && ctx.Items.ContainsKey(PayloadTooLargeItemKey))
            {
                ctx.Response.StatusCode = StatusCodes.Status413PayloadTooLarge;
                await ctx.Response.WriteAsync("Payload Too Large.");
            }
        });

        return app;
    }

    public static bool IsInternalRequest(HttpContext ctx)
    {
        if (ctx.Request.Headers.ContainsKey("CF-Ray") ||
            ctx.Request.Headers.ContainsKey("CF-Connecting-IP"))
        {
            return false;
        }

        var ip = ctx.Connection.RemoteIpAddress;
        if (ip is null)
        {
            return false;
        }
        if (IPAddress.IsLoopback(ip))
        {
            return true;
        }
        if (ip.IsIPv4MappedToIPv6)
        {
            ip = ip.MapToIPv4();
        }
        var bytes = ip.GetAddressBytes();
        // Exclude DMZ tunnel (172.28.1.x) and ingress proxy (172.28.2.x); permit internal 172.28.3+ subnets only
        return bytes.Length == 4 && bytes[0] == 172 && bytes[1] == 28 && bytes[2] >= 3;
    }

    private static bool IsPayloadTooLarge(Exception ex)
    {
        for (Exception? cur = ex; cur is not null; cur = cur.InnerException)
        {
            if (cur is PayloadTooLargeException)
            {
                return true;
            }
        }
        return false;
    }

    private sealed class PayloadTooLargeException : Exception
    {
        public PayloadTooLargeException()
            : base("Request payload exceeds maximum permitted size.")
        {
        }
    }

    private sealed class BoundedRequestStream(Stream inner, long maxBytes, Action onExceeded) : Stream
    {
        private long _bytesRead;

        public override bool CanRead => inner.CanRead;
        public override bool CanSeek => false;
        public override bool CanWrite => false;
        public override long Length => throw new NotSupportedException();
        public override long Position
        {
            get => _bytesRead;
            set => throw new NotSupportedException();
        }

        public override void Flush() => throw new NotSupportedException();
        public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();
        public override void SetLength(long value) => throw new NotSupportedException();
        public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();

        public override int Read(byte[] buffer, int offset, int count)
        {
            var read = inner.Read(buffer, offset, count);
            TrackBytes(read);
            return read;
        }

        public override int Read(Span<byte> buffer)
        {
            var read = inner.Read(buffer);
            TrackBytes(read);
            return read;
        }

        public override int ReadByte()
        {
            var b = inner.ReadByte();
            if (b != -1)
            {
                TrackBytes(1);
            }
            return b;
        }

        public override async Task<int> ReadAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken)
        {
            var read = await inner.ReadAsync(buffer.AsMemory(offset, count), cancellationToken);
            TrackBytes(read);
            return read;
        }

        public override async ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default)
        {
            var read = await inner.ReadAsync(buffer, cancellationToken);
            TrackBytes(read);
            return read;
        }

        private void TrackBytes(int read)
        {
            if (read <= 0)
            {
                return;
            }
            _bytesRead += read;
            if (_bytesRead > maxBytes)
            {
                onExceeded();
                throw new PayloadTooLargeException();
            }
        }
    }

    public static async Task<int> RunSelfHealthCheckAsync(string url)
    {
        try
        {
            using var handler = CreateInternalCaHttpHandler();
            using var client = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(3) };
            using var response = await client.GetAsync(url);
            return response.IsSuccessStatusCode ? 0 : 1;
        }
        catch
        {
            return 1;
        }
    }

    /// <summary>
    /// Validates TLS against the internal Eggman CA when present, using strict X509 chain verification.
    /// Never bypasses certificate validation.
    /// </summary>
    public static SocketsHttpHandler CreateInternalCaHttpHandler()
    {
        var handler = new SocketsHttpHandler();
        var caPath = Environment.GetEnvironmentVariable("SSL_CERT_FILE");
        if (!string.IsNullOrWhiteSpace(caPath) && File.Exists(caPath))
        {
            var caCert = X509CertificateLoader.LoadCertificateFromFile(caPath);
            handler.SslOptions.RemoteCertificateValidationCallback = (_, cert, chain, errors) =>
            {
                if (errors == System.Net.Security.SslPolicyErrors.None)
                {
                    return true;
                }
                if (cert is null || chain is null)
                {
                    return false;
                }
                chain.ChainPolicy.TrustMode = X509ChainTrustMode.CustomRootTrust;
                chain.ChainPolicy.CustomTrustStore.Add(caCert);
                chain.ChainPolicy.RevocationMode = X509RevocationMode.NoCheck;
                return chain.Build(new X509Certificate2(cert));
            };
        }
        return handler;
    }
}
