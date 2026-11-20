extern alias GatewayAsm;
extern alias ReleaseHubAsm;
extern alias IoTBridgeAsm;

using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Eggman.Contracts.IoT;
using Eggman.Contracts.Releases;
using Eggman.ServiceDefaults.Logging;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace Eggman.Platform.Tests;

public sealed class ZeroTrustSecurityTests
{
    private const string ExpectedIssuer = "https://auth.eggmanstudios.me/realms/eggman-public";

    private sealed class TestJwtAuthority : IDisposable
    {
        private readonly RSA _rsa = RSA.Create(2048);
        private readonly RSA _rogueRsa = RSA.Create(2048);
        private readonly JsonWebTokenHandler _handler = new();

        public RsaSecurityKey PublicKey { get; }

        public TestJwtAuthority()
        {
            PublicKey = new RsaSecurityKey(_rsa) { KeyId = "eggman-test-key-1" };
        }

        public string IssueToken(
            string audience,
            string scope = "releases:write iot:control",
            string? issuer = null,
            DateTimeOffset? expiresAt = null,
            bool useRogueKey = false)
        {
            var signingRsa = useRogueKey ? _rogueRsa : _rsa;
            var key = new RsaSecurityKey(signingRsa) { KeyId = "eggman-test-key-1" };
            var now = DateTimeOffset.UtcNow;
            var exp = expiresAt ?? now.AddMinutes(10);
            var nbf = exp < now ? exp.AddMinutes(-5) : now.AddMinutes(-1);

            var claims = new Dictionary<string, object>
            {
                ["sub"] = "eggman-test-user-01",
                ["scope"] = scope,
                ["azp"] = "eggman-cli"
            };

            var descriptor = new SecurityTokenDescriptor
            {
                Issuer = issuer ?? ExpectedIssuer,
                Audience = audience,
                Claims = claims,
                NotBefore = nbf.UtcDateTime,
                Expires = exp.UtcDateTime,
                IssuedAt = nbf.UtcDateTime,
                SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.RsaSha256)
            };

            return _handler.CreateToken(descriptor);
        }

        public static string TamperPayload(string jwt)
        {
            var parts = jwt.Split('.');
            var fakePayload = Base64UrlEncoder.Encode(
                "{\"sub\":\"attacker\",\"scope\":\"releases:write iot:control admin\"}");
            return $"{parts[0]}.{fakePayload}.{parts[2]}";
        }

        public void Dispose()
        {
            _rsa.Dispose();
            _rogueRsa.Dispose();
        }
    }

    private static WebApplicationFactory<TEntry> CreateJwtHardenedFactory<TEntry>(
        TestJwtAuthority authority,
        string expectedAudience,
        Dictionary<string, string?>? extraConfig = null)
        where TEntry : class
    {
        return new WebApplicationFactory<TEntry>().WithWebHostBuilder(b =>
        {
            b.ConfigureAppConfiguration((_, cfg) =>
            {
                var dict = new Dictionary<string, string?>
                {
                    ["Keycloak:Authority"] = ExpectedIssuer,
                    ["Keycloak:Audience"] = expectedAudience
                };
                if (extraConfig is not null)
                {
                    foreach (var kv in extraConfig)
                    {
                        dict[kv.Key] = kv.Value;
                    }
                }
                cfg.AddInMemoryCollection(dict);
            });

            b.ConfigureServices(services =>
            {
                services.PostConfigure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, options =>
                {
                    var oidc = new OpenIdConnectConfiguration { Issuer = ExpectedIssuer };
                    oidc.SigningKeys.Add(authority.PublicKey);

                    options.Configuration = oidc;
                    options.ConfigurationManager = new StaticConfigurationManager<OpenIdConnectConfiguration>(oidc);
                    options.RequireHttpsMetadata = false;
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidIssuer = ExpectedIssuer,
                        ValidateAudience = true,
                        ValidAudience = expectedAudience,
                        ValidateLifetime = true,
                        RequireExpirationTime = true,
                        RequireSignedTokens = true,
                        ValidateIssuerSigningKey = true,
                        IssuerSigningKey = authority.PublicKey,
                        ValidAlgorithms = [SecurityAlgorithms.RsaSha256, SecurityAlgorithms.EcdsaSha256],
                        ClockSkew = TimeSpan.FromSeconds(5)
                    };
                });
            });
        });
    }

    private static async Task<(WebApplication App, string Url, ConcurrentQueue<IHeaderDictionary> CapturedHeaders)> StartEchoServerAsync()
    {
        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        var app = builder.Build();
        var captured = new ConcurrentQueue<IHeaderDictionary>();

        app.Map("/{**catchAll}", async (HttpContext ctx) =>
        {
            var clone = new HeaderDictionary();
            foreach (var kv in ctx.Request.Headers)
            {
                clone[kv.Key] = kv.Value;
            }
            captured.Enqueue(clone);
            using var ms = new MemoryStream();
            await ctx.Request.Body.CopyToAsync(ms);
            return Results.Ok(new { echoed = true, bytes = ms.Length });
        });

        await app.StartAsync();
        return (app, app.Urls.Single(), captured);
    }

    private static PublishReleaseRequest ValidReleasePayload() => new(
        Kind: "games",
        Slug: "slunicka",
        Version: "1.0.1",
        FileName: "slunicka-1.0.1.tar.gz",
        Sha256: new string('a', 64),
        Description: "Verified standalone build.");

    [Fact]
    public void PiiScrubber_RedactsTokensSecretsPasswordsAndEmails()
    {
        const string input = "Authorization: Bearer eyJhbGciOiJSUzI1NiJ9.payload.sig; X-Vault-Token=hvs.abc123; Password=SuperSecret!; user=test@eggmanstudios.me";
        var scrubbed = PiiScrubber.Scrub(input);

        Assert.DoesNotContain("eyJhbGciOiJSUzI1NiJ9", scrubbed);
        Assert.DoesNotContain("hvs.abc123", scrubbed);
        Assert.DoesNotContain("SuperSecret!", scrubbed);
        Assert.DoesNotContain("test@eggmanstudios.me", scrubbed);
        Assert.Contains("[REDACTED]", scrubbed);
        Assert.Contains("[REDACTED_EMAIL]", scrubbed);
    }

    [Fact]
    public void ReleaseValidator_RejectsTraversalAndInvalidSha256()
    {
        var validator = new ReleaseHubAsm::Eggman.ReleaseHub.Validators.PublishReleaseRequestValidator();
        var valid = ValidReleasePayload();
        Assert.True(validator.Validate(valid).IsValid);

        var invalid = valid with { FileName = "../etc/passwd", Sha256 = "not-hex" };
        Assert.False(validator.Validate(invalid).IsValid);
    }

    [Fact]
    public void IoTValidators_RejectOutOfRangeTelemetry()
    {
        var validator = new IoTBridgeAsm::Eggman.IoT.Bridge.Validators.SensorReadingValidator();
        var invalid = new SensorReadingDto("uno-r4-rack", "Rack A", 200.0, 45.0, 50, DateTimeOffset.UtcNow);
        Assert.False(validator.Validate(invalid).IsValid);

        var valid = invalid with { TemperatureCelsius = 34.5 };
        Assert.True(validator.Validate(valid).IsValid);
    }

    [Fact]
    public async Task ReleaseHub_CatalogRejectsTraversalAndComputesRealSha256()
    {
        var tempRoot = Path.Combine(Path.GetTempPath(), $"eggman-relhub-{Guid.NewGuid():N}");
        var gamesDir = Path.Combine(tempRoot, "games");
        Directory.CreateDirectory(gamesDir);
        var samplePath = Path.Combine(gamesDir, "slunicka-test.bin");
        await File.WriteAllBytesAsync(samplePath, Encoding.UTF8.GetBytes("eggman-release-payload"));

        try
        {
            await using var factory = new WebApplicationFactory<ReleaseHubAsm::Program>()
                .WithWebHostBuilder(b => b.ConfigureAppConfiguration((_, cfg) =>
                {
                    cfg.AddInMemoryCollection(new Dictionary<string, string?>
                    {
                        ["ReleaseHub:StorageRoot"] = tempRoot
                    });
                }));

            var catalog = factory.Services.GetRequiredService<ReleaseHubAsm::Eggman.ReleaseHub.Services.ArtifactCatalogService>();
            Assert.Null(catalog.ResolveArtifactPath("games", "../../etc/passwd"));
            Assert.Null(catalog.ResolveArtifactPath("invalid-kind", "slunicka-test.bin"));
            Assert.NotNull(catalog.ResolveArtifactPath("games", "slunicka-test.bin"));

            var client = factory.CreateClient();
            var resp = await client.GetAsync("/api/v1/releases/games/slunicka-test.bin");
            Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
            Assert.True(resp.Headers.TryGetValues("X-Checksum-Sha256", out var hashes));
            Assert.Equal(64, hashes.Single().Length);
        }
        finally
        {
            Directory.Delete(tempRoot, recursive: true);
        }
    }

    [Theory]
    [InlineData("/admin")]
    [InlineData("http://localhost//admin")]
    [InlineData("/admin/master/console")]
    [InlineData("/realms/master")]
    [InlineData("/metrics")]
    [InlineData("/health/ready")]
    [InlineData("/socket.io/")]
    [InlineData("/swagger/index.html")]
    [InlineData("/.env")]
    [InlineData("/.git/config")]
    [InlineData("/api/v1/releases/..%2f..%2fetc/passwd")]
    public async Task GatewayYarp_BlocksAdminAndInternalEndpointsWith403(string blockedPath)
    {
        await using var factory = new WebApplicationFactory<GatewayAsm::Program>();
        var client = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

        var resp = await client.GetAsync(blockedPath);
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task GatewayYarp_DefaultDenyReturns404ForUnknownRoute()
    {
        await using var factory = new WebApplicationFactory<GatewayAsm::Program>();
        var client = factory.CreateClient();
        var req = new HttpRequestMessage(HttpMethod.Get, "/unknown/path");
        req.Headers.Host = "unlisted.eggmanstudios.me";

        var resp = await client.SendAsync(req);
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    [Fact]
    public async Task GatewayYarp_ProtectedRouteEnforcesFullAdversarialJwtMatrix()
    {
        using var authority = new TestJwtAuthority();
        var (echoApp, echoUrl, _) = await StartEchoServerAsync();
        await using var echoDisposable = echoApp;

        await using var factory = CreateJwtHardenedFactory<GatewayAsm::Program>(
            authority,
            "eggman-releasehub",
            new Dictionary<string, string?>
            {
                ["ReverseProxy:Clusters:releasehub-cluster:Destinations:releasehub:Address"] = echoUrl
            });

        var client = factory.CreateClient();

        async Task<HttpStatusCode> SendReleasePostAsync(string? bearer)
        {
            var req = new HttpRequestMessage(HttpMethod.Post, "/api/v1/releases")
            {
                Content = JsonContent.Create(ValidReleasePayload())
            };
            req.Headers.Host = "releases.eggmanstudios.me";
            if (bearer is not null)
            {
                req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearer);
            }
            using var resp = await client.SendAsync(req);
            return resp.StatusCode;
        }

        Assert.Equal(HttpStatusCode.Unauthorized, await SendReleasePostAsync(null));
        Assert.Equal(HttpStatusCode.Unauthorized, await SendReleasePostAsync(
            authority.IssueToken("eggman-releasehub", expiresAt: DateTimeOffset.UtcNow.AddMinutes(-10))));
        Assert.Equal(HttpStatusCode.Unauthorized, await SendReleasePostAsync(
            authority.IssueToken("eggman-releasehub", useRogueKey: true)));
        Assert.Equal(HttpStatusCode.Unauthorized, await SendReleasePostAsync(
            TestJwtAuthority.TamperPayload(authority.IssueToken("eggman-releasehub"))));
        Assert.Equal(HttpStatusCode.Unauthorized, await SendReleasePostAsync(
            authority.IssueToken("wrong-audience")));
        Assert.Equal(HttpStatusCode.Unauthorized, await SendReleasePostAsync(
            authority.IssueToken("eggman-releasehub", issuer: "https://evil.example/realms/fake")));
        Assert.Equal(HttpStatusCode.Forbidden, await SendReleasePostAsync(
            authority.IssueToken("eggman-releasehub", scope: "profile email")));
        Assert.Equal(HttpStatusCode.OK, await SendReleasePostAsync(
            authority.IssueToken("eggman-releasehub", scope: "releases:write")));
    }

    [Fact]
    public async Task DownstreamServices_IndependentlyEnforceFullAdversarialJwtMatrix()
    {
        using var authority = new TestJwtAuthority();

        await using var relFactory = CreateJwtHardenedFactory<ReleaseHubAsm::Program>(authority, "eggman-releasehub");
        var relClient = relFactory.CreateClient();

        async Task<HttpStatusCode> SendDirectReleaseAsync(string? bearer)
        {
            var req = new HttpRequestMessage(HttpMethod.Post, "/api/v1/releases")
            {
                Content = JsonContent.Create(ValidReleasePayload())
            };
            if (bearer is not null)
            {
                req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearer);
            }
            using var resp = await relClient.SendAsync(req);
            return resp.StatusCode;
        }

        Assert.Equal(HttpStatusCode.Unauthorized, await SendDirectReleaseAsync(null));
        Assert.Equal(HttpStatusCode.Unauthorized, await SendDirectReleaseAsync(
            authority.IssueToken("eggman-releasehub", expiresAt: DateTimeOffset.UtcNow.AddMinutes(-10))));
        Assert.Equal(HttpStatusCode.Unauthorized, await SendDirectReleaseAsync(
            authority.IssueToken("eggman-releasehub", useRogueKey: true)));
        Assert.Equal(HttpStatusCode.Unauthorized, await SendDirectReleaseAsync(
            TestJwtAuthority.TamperPayload(authority.IssueToken("eggman-releasehub"))));
        Assert.Equal(HttpStatusCode.Unauthorized, await SendDirectReleaseAsync(
            authority.IssueToken("eggman-iot-bridge")));
        Assert.Equal(HttpStatusCode.Unauthorized, await SendDirectReleaseAsync(
            authority.IssueToken("eggman-releasehub", issuer: "https://attacker.tld/realms/fake")));
        Assert.Equal(HttpStatusCode.Forbidden, await SendDirectReleaseAsync(
            authority.IssueToken("eggman-releasehub", scope: "iot:control")));
        Assert.Equal(HttpStatusCode.Created, await SendDirectReleaseAsync(
            authority.IssueToken("eggman-releasehub", scope: "releases:write")));

        await using var iotFactory = CreateJwtHardenedFactory<IoTBridgeAsm::Program>(authority, "eggman-iot-bridge");
        var iotClient = iotFactory.CreateClient();

        async Task<HttpStatusCode> SendDirectIoTTelemetryGetAsync(string? bearer)
        {
            var req = new HttpRequestMessage(HttpMethod.Get, "/api/v1/rack/telemetry");
            if (bearer is not null)
            {
                req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearer);
            }
            using var resp = await iotClient.SendAsync(req);
            return resp.StatusCode;
        }

        Assert.Equal(HttpStatusCode.Unauthorized, await SendDirectIoTTelemetryGetAsync(null));
        Assert.Equal(HttpStatusCode.Unauthorized, await SendDirectIoTTelemetryGetAsync(
            authority.IssueToken("eggman-iot-bridge", expiresAt: DateTimeOffset.UtcNow.AddMinutes(-10))));
        Assert.Equal(HttpStatusCode.Unauthorized, await SendDirectIoTTelemetryGetAsync(
            authority.IssueToken("eggman-iot-bridge", useRogueKey: true)));
        Assert.Equal(HttpStatusCode.Unauthorized, await SendDirectIoTTelemetryGetAsync(
            TestJwtAuthority.TamperPayload(authority.IssueToken("eggman-iot-bridge"))));
        Assert.Equal(HttpStatusCode.Unauthorized, await SendDirectIoTTelemetryGetAsync(
            authority.IssueToken("eggman-releasehub")));
        Assert.Equal(HttpStatusCode.Unauthorized, await SendDirectIoTTelemetryGetAsync(
            authority.IssueToken("eggman-iot-bridge", issuer: "https://attacker.tld/realms/fake")));
        Assert.Equal(HttpStatusCode.Forbidden, await SendDirectIoTTelemetryGetAsync(
            authority.IssueToken("eggman-iot-bridge", scope: "releases:write")));
        Assert.Equal(HttpStatusCode.OK, await SendDirectIoTTelemetryGetAsync(
            authority.IssueToken("eggman-iot-bridge", scope: "iot:control")));
    }

    [Fact]
    public async Task SpoofedIdentityAndProxyHeaders_AreStrippedAtYarpAndIgnoredDownstream()
    {
        var (echoApp, echoUrl, captured) = await StartEchoServerAsync();
        await using var echoDisposable = echoApp;

        await using var gatewayFactory = new WebApplicationFactory<GatewayAsm::Program>()
            .WithWebHostBuilder(b => b.ConfigureAppConfiguration((_, cfg) =>
            {
                cfg.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["ReverseProxy:Clusters:landing-cluster:Destinations:landing:Address"] = echoUrl
                });
            }));

        var gwClient = gatewayFactory.CreateClient();
        var req = new HttpRequestMessage(HttpMethod.Get, "/about");
        req.Headers.Host = "eggmanstudios.me";

        string[] spoofedHeaders =
        [
            "X-User-Id",
            "X-Roles",
            "X-Real-IP",
            "X-Forwarded-For",
            "X-Forwarded-User",
            "X-Remote-User",
            "X-Auth-User",
            "X-Original-URL",
            "X-Rewrite-URL",
            "X-Eggman-Internal-Admin"
        ];
        foreach (var h in spoofedHeaders)
        {
            req.Headers.Add(h, "spoofed-admin-value");
        }

        var resp = await gwClient.SendAsync(req);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.True(captured.TryDequeue(out var downstreamHeaders));
        foreach (var h in spoofedHeaders)
        {
            Assert.False(downstreamHeaders.ContainsKey(h), $"Spoofed header '{h}' leaked downstream!");
        }

        // Downstream microservices still reject requests with spoofed identity headers and no valid JWT
        await using var relFactory = new WebApplicationFactory<ReleaseHubAsm::Program>();
        var relReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/releases")
        {
            Content = JsonContent.Create(ValidReleasePayload())
        };
        foreach (var h in spoofedHeaders)
        {
            relReq.Headers.Add(h, "spoofed-admin-value");
        }
        var relResp = await relFactory.CreateClient().SendAsync(relReq);
        Assert.Equal(HttpStatusCode.Unauthorized, relResp.StatusCode);

        await using var iotFactory = new WebApplicationFactory<IoTBridgeAsm::Program>();
        var iotReq = new HttpRequestMessage(HttpMethod.Get, "/api/v1/rack/telemetry");
        foreach (var h in spoofedHeaders)
        {
            iotReq.Headers.Add(h, "spoofed-admin-value");
        }
        var iotResp = await iotFactory.CreateClient().SendAsync(iotReq);
        Assert.Equal(HttpStatusCode.Unauthorized, iotResp.StatusCode);
    }

    [Fact]
    public async Task GatewayYarp_RateLimitingTriggers429UnderBurstTraffic()
    {
        var (echoApp, echoUrl, _) = await StartEchoServerAsync();
        await using var echoDisposable = echoApp;

        await using var factory = new WebApplicationFactory<GatewayAsm::Program>()
            .WithWebHostBuilder(b => b.ConfigureAppConfiguration((_, cfg) =>
            {
                cfg.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["RateLimiting:GlobalPermitLimit"] = "4",
                    ["RateLimiting:PublicWebPermitLimit"] = "4",
                    ["RateLimiting:WindowSeconds"] = "60",
                    ["ReverseProxy:Clusters:landing-cluster:Destinations:landing:Address"] = echoUrl
                });
            }));

        var client = factory.CreateClient();
        var statuses = new List<HttpStatusCode>();
        for (int i = 0; i < 7; i++)
        {
            var req = new HttpRequestMessage(HttpMethod.Get, "/");
            req.Headers.Host = "eggmanstudios.me";
            using var resp = await client.SendAsync(req);
            statuses.Add(resp.StatusCode);
        }

        Assert.All(statuses.Take(4), s => Assert.Equal(HttpStatusCode.OK, s));
        Assert.Contains(HttpStatusCode.TooManyRequests, statuses.Skip(4));
    }

    [Fact]
    public async Task Endpoints_RejectMalformedWith400AndOversizedWith413()
    {
        using var authority = new TestJwtAuthority();
        var releaseJwt = authority.IssueToken("eggman-releasehub", scope: "releases:write");
        var iotJwt = authority.IssueToken("eggman-iot-bridge", scope: "iot:control");

        var (echoApp, echoUrl, _) = await StartEchoServerAsync();
        await using var echoDisposable = echoApp;

        // 1. YARP: 413 on Content-Length > cap AND 413 on chunked stream > cap
        await using (var gwFactory = CreateJwtHardenedFactory<GatewayAsm::Program>(
            authority,
            "eggman-releasehub",
            new Dictionary<string, string?>
            {
                ["Security:MaxApiRequestBodyBytes"] = "512",
                ["Security:MaxRequestBodyBytes"] = "512",
                ["ReverseProxy:Clusters:releasehub-cluster:Destinations:releasehub:Address"] = echoUrl
            }))
        {
            var gwClient = gwFactory.CreateClient();
            var bigJson = new string('x', 2048);

            var sizedReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/releases")
            {
                Content = new StringContent(bigJson, Encoding.UTF8, "application/json")
            };
            sizedReq.Headers.Host = "releases.eggmanstudios.me";
            sizedReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", releaseJwt);
            var sizedResp = await gwClient.SendAsync(sizedReq);
            Assert.Equal(HttpStatusCode.RequestEntityTooLarge, sizedResp.StatusCode);

            using var chunkedStream = new MemoryStream(Encoding.UTF8.GetBytes(bigJson));
            var chunkedReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/releases")
            {
                Content = new StreamContent(chunkedStream)
            };
            chunkedReq.Content.Headers.ContentType = new MediaTypeHeaderValue("application/json");
            chunkedReq.Headers.Host = "releases.eggmanstudios.me";
            chunkedReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", releaseJwt);
            var chunkedResp = await gwClient.SendAsync(chunkedReq);
            Assert.Equal(HttpStatusCode.RequestEntityTooLarge, chunkedResp.StatusCode);
        }

        // 2. ReleaseHub: 400 malformed/invalid JSON & 413 oversized payload
        await using (var relFactory = CreateJwtHardenedFactory<ReleaseHubAsm::Program>(
            authority,
            "eggman-releasehub",
            new Dictionary<string, string?>
            {
                ["Security:MaxRequestBodyBytes"] = "512",
                ["Security:MaxApiRequestBodyBytes"] = "512"
            }))
        {
            var relClient = relFactory.CreateClient();

            var malformedReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/releases")
            {
                Content = new StringContent("{malformed-json", Encoding.UTF8, "application/json")
            };
            malformedReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", releaseJwt);
            Assert.Equal(HttpStatusCode.BadRequest, (await relClient.SendAsync(malformedReq)).StatusCode);

            var invalidDtoReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/releases")
            {
                Content = JsonContent.Create(ValidReleasePayload() with { Sha256 = "bad-hash" })
            };
            invalidDtoReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", releaseJwt);
            Assert.Equal(HttpStatusCode.BadRequest, (await relClient.SendAsync(invalidDtoReq)).StatusCode);

            using var oversizeStream = new MemoryStream(Encoding.UTF8.GetBytes(new string('b', 2048)));
            var oversizeReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/releases")
            {
                Content = new StreamContent(oversizeStream)
            };
            oversizeReq.Content.Headers.ContentType = new MediaTypeHeaderValue("application/json");
            oversizeReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", releaseJwt);
            Assert.Equal(HttpStatusCode.RequestEntityTooLarge, (await relClient.SendAsync(oversizeReq)).StatusCode);
        }

        // 3. IoT.Bridge: 400 malformed/invalid JSON & 413 oversized payload
        await using (var iotFactory = CreateJwtHardenedFactory<IoTBridgeAsm::Program>(
            authority,
            "eggman-iot-bridge",
            new Dictionary<string, string?>
            {
                ["Security:MaxRequestBodyBytes"] = "512",
                ["Security:MaxApiRequestBodyBytes"] = "512"
            }))
        {
            var iotClient = iotFactory.CreateClient();

            var malformedReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/rack/airflow")
            {
                Content = new StringContent("{broken", Encoding.UTF8, "application/json")
            };
            malformedReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", iotJwt);
            Assert.Equal(HttpStatusCode.BadRequest, (await iotClient.SendAsync(malformedReq)).StatusCode);

            var invalidDtoReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/rack/airflow")
            {
                Content = JsonContent.Create(new RackAirflowCommand("mega-01", 999, "invalid", DateTimeOffset.UtcNow))
            };
            invalidDtoReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", iotJwt);
            Assert.Equal(HttpStatusCode.BadRequest, (await iotClient.SendAsync(invalidDtoReq)).StatusCode);

            var oversizeReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/rack/airflow")
            {
                Content = new StringContent(new string('z', 2048), Encoding.UTF8, "application/json")
            };
            oversizeReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", iotJwt);
            Assert.Equal(HttpStatusCode.RequestEntityTooLarge, (await iotClient.SendAsync(oversizeReq)).StatusCode);
        }
    }

    [Fact]
    public async Task IoTBridge_HmacAuthAcceptsValidAndRejectsTamperedOrReplayed()
    {
        const string sharedSecret = "test-only-hmac-secret-32-chars-minimum!!";
        await using var factory = new WebApplicationFactory<IoTBridgeAsm::Program>()
            .WithWebHostBuilder(b => b.ConfigureAppConfiguration((_, cfg) =>
            {
                cfg.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["IoT:HmacSharedSecret"] = sharedSecret
                });
            }));

        var client = factory.CreateClient();
        var dto = new SensorReadingDto("mega-rack-01", "EliteDesk Rack", 31.2, 42.0, 55, DateTimeOffset.UtcNow);
        var json = System.Text.Json.JsonSerializer.Serialize(dto);
        var ts = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
        var nonce = Guid.NewGuid().ToString("N");

        static string Sign(string secret, string method, string path, string timestamp, string nonceVal, string body)
        {
            var bodyHash = Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(body)));
            var canonical = $"{method}\n{path}\n{timestamp}\n{nonceVal}\n{bodyHash}";
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
            return Convert.ToHexStringLower(hmac.ComputeHash(Encoding.UTF8.GetBytes(canonical)));
        }

        HttpRequestMessage BuildSignedRequest(string bodyPayload, string timestamp, string nonceVal, string sig)
        {
            var r = new HttpRequestMessage(HttpMethod.Post, "/api/v1/devices/telemetry")
            {
                Content = new StringContent(bodyPayload, Encoding.UTF8, "application/json")
            };
            r.Headers.Add("X-Eggman-Device-Id", "mega-rack-01");
            r.Headers.Add("X-Eggman-Timestamp", timestamp);
            r.Headers.Add("X-Eggman-Nonce", nonceVal);
            r.Headers.Add("X-Eggman-Signature", sig);
            return r;
        }

        var validSig = Sign(sharedSecret, "POST", "/api/v1/devices/telemetry", ts, nonce, json);
        Assert.Equal(HttpStatusCode.Accepted, (await client.SendAsync(BuildSignedRequest(json, ts, nonce, validSig))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.SendAsync(BuildSignedRequest(json, ts, nonce, validSig))).StatusCode);

        var freshNonce = Guid.NewGuid().ToString("N");
        var sigForOriginal = Sign(sharedSecret, "POST", "/api/v1/devices/telemetry", ts, freshNonce, json);
        var tamperedJson = json.Replace("31.2", "99.9");
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.SendAsync(BuildSignedRequest(tamperedJson, ts, freshNonce, sigForOriginal))).StatusCode);

        var staleTs = DateTimeOffset.UtcNow.AddMinutes(-10).ToUnixTimeSeconds().ToString();
        var staleNonce = Guid.NewGuid().ToString("N");
        var staleSig = Sign(sharedSecret, "POST", "/api/v1/devices/telemetry", staleTs, staleNonce, json);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.SendAsync(BuildSignedRequest(json, staleTs, staleNonce, staleSig))).StatusCode);
    }
}
