extern alias GatewayAsm;
extern alias ReleaseHubAsm;

using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using Eggman.Contracts.Releases;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace Eggman.Platform.Tests;

public sealed class ChunkedUploadSecurityTests
{
    private const string ExpectedIssuer = "https://auth.eggmanstudios.me/realms/eggman-public";

    private sealed class UploadTestJwtAuthority : IDisposable
    {
        private readonly RSA _rsa = RSA.Create(2048);
        private readonly RSA _rogueRsa = RSA.Create(2048);
        private readonly JsonWebTokenHandler _handler = new();

        public RsaSecurityKey PublicKey { get; }

        public UploadTestJwtAuthority()
        {
            PublicKey = new RsaSecurityKey(_rsa) { KeyId = "eggman-chunk-test-key" };
        }

        public string IssueToken(
            string audience = "eggman-releasehub",
            string scope = "releases:publish",
            string sub = "eggman-releasehub-ci",
            string? issuer = null,
            DateTimeOffset? expiresAt = null,
            bool useRogueKey = false)
        {
            var signingRsa = useRogueKey ? _rogueRsa : _rsa;
            var key = new RsaSecurityKey(signingRsa) { KeyId = "eggman-chunk-test-key" };
            var now = DateTimeOffset.UtcNow;
            var exp = expiresAt ?? now.AddMinutes(10);
            var nbf = exp < now ? exp.AddMinutes(-5) : now.AddMinutes(-1);

            var descriptor = new SecurityTokenDescriptor
            {
                Issuer = issuer ?? ExpectedIssuer,
                Audience = audience,
                Claims = new Dictionary<string, object>
                {
                    ["sub"] = sub,
                    ["scope"] = scope,
                    ["azp"] = "eggman-releasehub-ci"
                },
                NotBefore = nbf.UtcDateTime,
                Expires = exp.UtcDateTime,
                IssuedAt = nbf.UtcDateTime,
                SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.RsaSha256)
            };

            return _handler.CreateToken(descriptor);
        }

        public void Dispose()
        {
            _rsa.Dispose();
            _rogueRsa.Dispose();
        }
    }

    private static WebApplicationFactory<TEntry> CreateFactory<TEntry>(
        UploadTestJwtAuthority authority,
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
                    ["Keycloak:Audience"] = "eggman-releasehub"
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
                        ValidAudience = "eggman-releasehub",
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

    private static async Task<(WebApplication App, string Url)> StartUploadEchoBackendAsync()
    {
        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.WebHost.ConfigureKestrel(k => k.Limits.MaxRequestBodySize = 70L * 1024 * 1024);
        var app = builder.Build();

        app.Map("/{**catchAll}", async (HttpContext ctx) =>
        {
            using var ms = new MemoryStream();
            await ctx.Request.Body.CopyToAsync(ms);
            return Results.Ok(new { echoedBytes = ms.Length });
        });

        await app.StartAsync();
        return (app, app.Urls.Single());
    }

    [Fact]
    public async Task ChunkedUpload_AssemblesChunksVerifiesSha256AndUpdatesAltStoreManifest()
    {
        var tempRoot = Path.Combine(Path.GetTempPath(), $"eggman-chunk-ok-{Guid.NewGuid():N}");
        Directory.CreateDirectory(tempRoot);

        try
        {
            using var authority = new UploadTestJwtAuthority();
            var publishJwt = authority.IssueToken(scope: "releases:publish");

            await using var factory = CreateFactory<ReleaseHubAsm::Program>(
                authority,
                new Dictionary<string, string?>
                {
                    ["ReleaseHub:StorageRoot"] = tempRoot,
                    ["Security:MaxChunkBodyBytes"] = "1048576"
                });

            var client = factory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", publishJwt);

            var payload = new byte[120_000];
            RandomNumberGenerator.Fill(payload);
            var expectedSha = Convert.ToHexStringLower(SHA256.HashData(payload));
            const string version = "2.4.0";
            var fileName = $"eggman-companion-{Guid.NewGuid():N}.ipa";

            var initReq = new InitChunkedUploadRequest(
                AppSlug: "eggman-companion",
                Version: version,
                Platform: "ios",
                FileName: fileName,
                TotalSizeBytes: payload.Length,
                TotalChunks: 3,
                ExpectedSha256: expectedSha,
                Description: "Signed AltStore chunked test build.");

            var initResp = await client.PostAsJsonAsync("/api/releases/uploads/init", initReq);
            Assert.Equal(HttpStatusCode.Created, initResp.StatusCode);
            var initBody = await initResp.Content.ReadFromJsonAsync<InitChunkedUploadResponse>();
            Assert.NotNull(initBody);

            var chunkSizes = new[] { 50_000, 50_000, 20_000 };
            int offset = 0;
            for (int idx = 0; idx < chunkSizes.Length; idx++)
            {
                var slice = payload.AsMemory(offset, chunkSizes[idx]).ToArray();
                offset += chunkSizes[idx];

                var putResp = await client.PutAsync(
                    $"/api/releases/uploads/{initBody.UploadId}/chunks/{idx}",
                    new ByteArrayContent(slice));
                Assert.Equal(HttpStatusCode.OK, putResp.StatusCode);

                // Retry chunk 1 idempotently to confirm resumable retry safety
                if (idx == 1)
                {
                    var retryResp = await client.PutAsync(
                        $"/api/releases/uploads/{initBody.UploadId}/chunks/{idx}",
                        new ByteArrayContent(slice));
                    Assert.Equal(HttpStatusCode.OK, retryResp.StatusCode);
                }
            }

            var completeResp = await client.PostAsync($"/api/releases/uploads/{initBody.UploadId}/complete", content: null);
            Assert.Equal(HttpStatusCode.Created, completeResp.StatusCode);
            var completeBody = await completeResp.Content.ReadFromJsonAsync<CompleteChunkedUploadResponse>();
            Assert.NotNull(completeBody);
            Assert.Equal("ipa", completeBody.Kind);
            Assert.Equal(expectedSha, completeBody.Sha256);
            Assert.Equal(payload.Length, completeBody.SizeBytes);

            var finalPath = Path.Combine(tempRoot, "ipa", fileName);
            Assert.True(File.Exists(finalPath));
            Assert.Equal(payload, await File.ReadAllBytesAsync(finalPath));
            Assert.False(Directory.Exists(Path.Combine(tempRoot, ".staging", initBody.UploadId.ToString("N"))));

            // Verify AltStore manifest reflects the new build cleanly
            client.DefaultRequestHeaders.Authorization = null;
            var manifest = await client.GetFromJsonAsync<AltStoreSourceDto>("/api/v1/altstore/source.json");
            Assert.NotNull(manifest);
            var companion = Assert.Single(manifest.Apps, a => a.BundleIdentifier == "me.eggmanstudios.companion");
            Assert.Contains(companion.Versions, v => v.Version == version && v.Sha256 == expectedSha && v.Size == payload.Length);

            // Verify public download returns identical bytes + SHA-256 header
            var dlResp = await client.GetAsync($"/api/v1/releases/ipa/{fileName}");
            Assert.Equal(HttpStatusCode.OK, dlResp.StatusCode);
            Assert.Equal(expectedSha, dlResp.Headers.GetValues("X-Checksum-Sha256").Single());
            Assert.Equal(payload, await dlResp.Content.ReadAsByteArrayAsync());
        }
        finally
        {
            Directory.Delete(tempRoot, recursive: true);
        }
    }

    [Fact]
    public async Task ChunkedUpload_ProxiedThroughYarpAllows60MbRouteWhileKeeping1MbCapElsewhere()
    {
        using var authority = new UploadTestJwtAuthority();
        var publishJwt = authority.IssueToken(scope: "releases:publish");
        var writeJwt = authority.IssueToken(scope: "releases:write");

        var (backendApp, backendUrl) = await StartUploadEchoBackendAsync();
        await using var backendScope = backendApp;

        // Uses real production defaults: 60 MiB on /api/releases/* vs 1 MiB on /api/v1/*
        await using var yarpFactory = CreateFactory<GatewayAsm::Program>(
            authority,
            new Dictionary<string, string?>
            {
                ["ReverseProxy:Clusters:releasehub-cluster:Destinations:releasehub:Address"] = backendUrl
            });

        var client = yarpFactory.CreateClient();
        var onePointFiveMb = new byte[1_572_864]; // 1.5 MiB (> 1 MiB, < 60 MiB)

        // 1. Chunked upload route /api/releases/uploads/{id}/chunks/0 allows 1.5 MiB cleanly through YARP
        var chunkReq = new HttpRequestMessage(HttpMethod.Put, $"/api/releases/uploads/{Guid.NewGuid()}/chunks/0")
        {
            Content = new ByteArrayContent(onePointFiveMb)
        };
        chunkReq.Headers.Host = "releases.eggmanstudios.me";
        chunkReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", publishJwt);
        var chunkResp = await client.SendAsync(chunkReq);
        Assert.Equal(HttpStatusCode.OK, chunkResp.StatusCode);

        // 2. Non-chunk API route /api/v1/releases stays tightly capped at 1 MiB (413)
        var legacyReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/releases")
        {
            Content = new ByteArrayContent(onePointFiveMb)
        };
        legacyReq.Headers.Host = "releases.eggmanstudios.me";
        legacyReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", writeJwt);
        var legacyResp = await client.SendAsync(legacyReq);
        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, legacyResp.StatusCode);
    }

    [Fact]
    public async Task ChunkedUpload_Sha256MismatchRejects422AndPurgesStagingImmediately()
    {
        var tempRoot = Path.Combine(Path.GetTempPath(), $"eggman-chunk-badsha-{Guid.NewGuid():N}");
        Directory.CreateDirectory(tempRoot);

        try
        {
            using var authority = new UploadTestJwtAuthority();
            var publishJwt = authority.IssueToken(scope: "releases:publish");

            await using var factory = CreateFactory<ReleaseHubAsm::Program>(
                authority,
                new Dictionary<string, string?>
                {
                    ["ReleaseHub:StorageRoot"] = tempRoot
                });

            var client = factory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", publishJwt);

            var data = new byte[4096];
            RandomNumberGenerator.Fill(data);
            var wrongSha = new string('f', 64);
            var fileName = $"corrupt-build-{Guid.NewGuid():N}.tar.gz";

            var initResp = await client.PostAsJsonAsync(
                "/api/releases/uploads/init",
                new InitChunkedUploadRequest("slunicka", "9.9.9", "linux", fileName, data.Length, 2, wrongSha));
            Assert.Equal(HttpStatusCode.Created, initResp.StatusCode);
            var initBody = await initResp.Content.ReadFromJsonAsync<InitChunkedUploadResponse>();
            Assert.NotNull(initBody);

            Assert.Equal(HttpStatusCode.OK, (await client.PutAsync(
                $"/api/releases/uploads/{initBody.UploadId}/chunks/0",
                new ByteArrayContent(data[..2048]))).StatusCode);
            Assert.Equal(HttpStatusCode.OK, (await client.PutAsync(
                $"/api/releases/uploads/{initBody.UploadId}/chunks/1",
                new ByteArrayContent(data[2048..]))).StatusCode);

            var completeResp = await client.PostAsync($"/api/releases/uploads/{initBody.UploadId}/complete", null);
            Assert.Equal(HttpStatusCode.UnprocessableEntity, completeResp.StatusCode);

            var sessionStaging = Path.Combine(tempRoot, ".staging", initBody.UploadId.ToString("N"));
            Assert.False(Directory.Exists(sessionStaging));
            Assert.False(File.Exists(Path.Combine(tempRoot, "games", fileName)));

            var dbFactory = factory.Services.GetRequiredService<IDbContextFactory<ReleaseHubAsm::Eggman.ReleaseHub.Data.ReleaseHubDbContext>>();
            await using var db = await dbFactory.CreateDbContextAsync();
            var session = await db.UploadSessions.FirstOrDefaultAsync(s => s.Id == initBody.UploadId);
            Assert.NotNull(session);
            Assert.Equal("Failed", session.Status);
        }
        finally
        {
            Directory.Delete(tempRoot, recursive: true);
        }
    }

    [Fact]
    public async Task ChunkedUpload_BlocksUnauthorizedWrongScopeAndOwnershipHijackAtYarpAndReleaseHub()
    {
        var tempRoot = Path.Combine(Path.GetTempPath(), $"eggman-chunk-auth-{Guid.NewGuid():N}");
        Directory.CreateDirectory(tempRoot);

        try
        {
            using var authority = new UploadTestJwtAuthority();
            var validPublishJwt = authority.IssueToken(scope: "releases:publish", sub: "publisher-a");
            var otherUserPublishJwt = authority.IssueToken(scope: "releases:publish", sub: "publisher-b");
            var writeOnlyJwt = authority.IssueToken(scope: "releases:write", sub: "publisher-a");
            var expiredJwt = authority.IssueToken(scope: "releases:publish", expiresAt: DateTimeOffset.UtcNow.AddMinutes(-5));
            var rogueJwt = authority.IssueToken(scope: "releases:publish", useRogueKey: true);

            var (backendApp, backendUrl) = await StartUploadEchoBackendAsync();
            await using var backendScope = backendApp;

            await using var yarpFactory = CreateFactory<GatewayAsm::Program>(
                authority,
                new Dictionary<string, string?>
                {
                    ["ReverseProxy:Clusters:releasehub-cluster:Destinations:releasehub:Address"] = backendUrl
                });
            var gwClient = yarpFactory.CreateClient();

            await using var hubFactory = CreateFactory<ReleaseHubAsm::Program>(
                authority,
                new Dictionary<string, string?>
                {
                    ["ReleaseHub:StorageRoot"] = tempRoot
                });
            var hubClient = hubFactory.CreateClient();

            var validInit = new InitChunkedUploadRequest(
                "protikod", "1.0.2", "windows", $"protikod-{Guid.NewGuid():N}.zip", 64, 1, new string('a', 64));

            async Task<HttpStatusCode> SendYarpAsync(HttpMethod method, string path, string? bearer, HttpContent? body = null)
            {
                var req = new HttpRequestMessage(method, path) { Content = body };
                req.Headers.Host = "releases.eggmanstudios.me";
                if (bearer is not null)
                {
                    req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearer);
                }
                using var r = await gwClient.SendAsync(req);
                return r.StatusCode;
            }

            // YARP blocks unauthenticated (401), bad tokens (401), and wrong-scope tokens (403)
            Assert.Equal(HttpStatusCode.Unauthorized, await SendYarpAsync(HttpMethod.Post, "/api/releases/uploads/init", null, JsonContent.Create(validInit)));
            Assert.Equal(HttpStatusCode.Unauthorized, await SendYarpAsync(HttpMethod.Post, "/api/releases/uploads/init", expiredJwt, JsonContent.Create(validInit)));
            Assert.Equal(HttpStatusCode.Unauthorized, await SendYarpAsync(HttpMethod.Post, "/api/releases/uploads/init", rogueJwt, JsonContent.Create(validInit)));
            Assert.Equal(HttpStatusCode.Forbidden, await SendYarpAsync(HttpMethod.Post, "/api/releases/uploads/init", writeOnlyJwt, JsonContent.Create(validInit)));
            Assert.Equal(HttpStatusCode.Forbidden, await SendYarpAsync(HttpMethod.Put, $"/api/releases/uploads/{Guid.NewGuid()}/chunks/0", writeOnlyJwt, new ByteArrayContent([1, 2])));
            Assert.Equal(HttpStatusCode.Forbidden, await SendYarpAsync(HttpMethod.Post, $"/api/releases/uploads/{Guid.NewGuid()}/complete", writeOnlyJwt));

            // Downstream ReleaseHub independently blocks unauthenticated (401) & wrong scope (403)
            Assert.Equal(HttpStatusCode.Unauthorized, (await hubClient.PostAsJsonAsync("/api/releases/uploads/init", validInit)).StatusCode);

            hubClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", writeOnlyJwt);
            Assert.Equal(HttpStatusCode.Forbidden, (await hubClient.PostAsJsonAsync("/api/releases/uploads/init", validInit)).StatusCode);

            // Session created by publisher-a cannot be written/completed by publisher-b (403)
            hubClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", validPublishJwt);
            var initResp = await hubClient.PostAsJsonAsync("/api/releases/uploads/init", validInit);
            Assert.Equal(HttpStatusCode.Created, initResp.StatusCode);
            var session = await initResp.Content.ReadFromJsonAsync<InitChunkedUploadResponse>();
            Assert.NotNull(session);

            hubClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", otherUserPublishJwt);
            Assert.Equal(HttpStatusCode.Forbidden, (await hubClient.PutAsync($"/api/releases/uploads/{session.UploadId}/chunks/0", new ByteArrayContent(new byte[64]))).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await hubClient.PostAsync($"/api/releases/uploads/{session.UploadId}/complete", null)).StatusCode);
        }
        finally
        {
            Directory.Delete(tempRoot, recursive: true);
        }
    }

    [Fact]
    public async Task ChunkedUpload_OversizedSingleChunkRejectedWith413AtYarpAndReleaseHub()
    {
        var tempRoot = Path.Combine(Path.GetTempPath(), $"eggman-chunk-413-{Guid.NewGuid():N}");
        Directory.CreateDirectory(tempRoot);

        try
        {
            using var authority = new UploadTestJwtAuthority();
            var publishJwt = authority.IssueToken(scope: "releases:publish");

            var (backendApp, backendUrl) = await StartUploadEchoBackendAsync();
            await using var backendScope = backendApp;

            // 1. YARP rejects sized + chunked > MaxReleaseUploadBodyBytes (2048 test cap) with 413
            await using (var gwFactory = CreateFactory<GatewayAsm::Program>(
                authority,
                new Dictionary<string, string?>
                {
                    ["Security:MaxReleaseUploadBodyBytes"] = "2048",
                    ["ReverseProxy:Clusters:releasehub-cluster:Destinations:releasehub:Address"] = backendUrl
                }))
            {
                var gwClient = gwFactory.CreateClient();
                var oversized = new byte[4096];

                var sizedReq = new HttpRequestMessage(HttpMethod.Put, $"/api/releases/uploads/{Guid.NewGuid()}/chunks/0")
                {
                    Content = new ByteArrayContent(oversized)
                };
                sizedReq.Headers.Host = "releases.eggmanstudios.me";
                sizedReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", publishJwt);
                Assert.Equal(HttpStatusCode.RequestEntityTooLarge, (await gwClient.SendAsync(sizedReq)).StatusCode);

                using var stream = new MemoryStream(oversized);
                var chunkedReq = new HttpRequestMessage(HttpMethod.Put, $"/api/releases/uploads/{Guid.NewGuid()}/chunks/0")
                {
                    Content = new StreamContent(stream)
                };
                chunkedReq.Headers.Host = "releases.eggmanstudios.me";
                chunkedReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", publishJwt);
                Assert.Equal(HttpStatusCode.RequestEntityTooLarge, (await gwClient.SendAsync(chunkedReq)).StatusCode);
            }

            // 2. ReleaseHub rejects sized + chunked > Security:MaxChunkBodyBytes (2048 test cap) with 413
            await using (var hubFactory = CreateFactory<ReleaseHubAsm::Program>(
                authority,
                new Dictionary<string, string?>
                {
                    ["ReleaseHub:StorageRoot"] = tempRoot,
                    ["Security:MaxChunkBodyBytes"] = "2048"
                }))
            {
                var hubClient = hubFactory.CreateClient();
                hubClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", publishJwt);

                var initResp = await hubClient.PostAsJsonAsync(
                    "/api/releases/uploads/init",
                    new InitChunkedUploadRequest("eggman-companion", "1.9.0", "ipa", $"big-{Guid.NewGuid():N}.ipa", 3072, 2, new string('b', 64)));
                Assert.Equal(HttpStatusCode.Created, initResp.StatusCode);
                var initBody = await initResp.Content.ReadFromJsonAsync<InitChunkedUploadResponse>();
                Assert.NotNull(initBody);

                var oversized = new byte[4096];
                Assert.Equal(HttpStatusCode.RequestEntityTooLarge, (await hubClient.PutAsync(
                    $"/api/releases/uploads/{initBody.UploadId}/chunks/0",
                    new ByteArrayContent(oversized))).StatusCode);

                using var ms = new MemoryStream(oversized);
                Assert.Equal(HttpStatusCode.RequestEntityTooLarge, (await hubClient.PutAsync(
                    $"/api/releases/uploads/{initBody.UploadId}/chunks/0",
                    new StreamContent(ms))).StatusCode);

                // Ensure no staged part or orphaned .tmp files were left behind
                var sessionDir = Path.Combine(tempRoot, ".staging", initBody.UploadId.ToString("N"));
                Assert.Empty(Directory.GetFiles(sessionDir));
            }
        }
        finally
        {
            Directory.Delete(tempRoot, recursive: true);
        }
    }

    [Fact]
    public async Task ChunkedUpload_CleanupWorkerPurgesAbandonedSessionsOlderThan2Hours()
    {
        var tempRoot = Path.Combine(Path.GetTempPath(), $"eggman-chunk-cleanup-{Guid.NewGuid():N}");
        Directory.CreateDirectory(tempRoot);

        try
        {
            using var authority = new UploadTestJwtAuthority();
            var publishJwt = authority.IssueToken(scope: "releases:publish");

            await using var factory = CreateFactory<ReleaseHubAsm::Program>(
                authority,
                new Dictionary<string, string?>
                {
                    ["ReleaseHub:StorageRoot"] = tempRoot
                });

            var client = factory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", publishJwt);

            var initResp = await client.PostAsJsonAsync(
                "/api/releases/uploads/init",
                new InitChunkedUploadRequest("slunicka", "1.1.0", "linux", $"abandoned-{Guid.NewGuid():N}.tar.gz", 1024, 2, new string('c', 64)));
            Assert.Equal(HttpStatusCode.Created, initResp.StatusCode);
            var initBody = await initResp.Content.ReadFromJsonAsync<InitChunkedUploadResponse>();
            Assert.NotNull(initBody);

            Assert.Equal(HttpStatusCode.OK, (await client.PutAsync(
                $"/api/releases/uploads/{initBody.UploadId}/chunks/0",
                new ByteArrayContent(new byte[512]))).StatusCode);

            var sessionDir = Path.Combine(tempRoot, ".staging", initBody.UploadId.ToString("N"));
            Assert.True(Directory.Exists(sessionDir));

            // Simulate aging the session past 2 hours (backdate CreatedAtUtc & ExpiresAtUtc by 3 hours)
            var dbFactory = factory.Services.GetRequiredService<IDbContextFactory<ReleaseHubAsm::Eggman.ReleaseHub.Data.ReleaseHubDbContext>>();
            await using (var db = await dbFactory.CreateDbContextAsync())
            {
                var session = await db.UploadSessions.FirstAsync(s => s.Id == initBody.UploadId);
                session.CreatedAtUtc = DateTimeOffset.UtcNow.AddHours(-3);
                session.ExpiresAtUtc = DateTimeOffset.UtcNow.AddHours(-1);
                await db.SaveChangesAsync();
            }

            var cleanupService = factory.Services.GetRequiredService<ReleaseHubAsm::Eggman.ReleaseHub.Services.ChunkedUploadService>();
            var purgedCount = await cleanupService.PurgeExpiredSessionsAsync();
            Assert.True(purgedCount >= 1);
            Assert.False(Directory.Exists(sessionDir));

            await using (var db = await dbFactory.CreateDbContextAsync())
            {
                var session = await db.UploadSessions.Include(s => s.Chunks).FirstAsync(s => s.Id == initBody.UploadId);
                Assert.Equal("Expired", session.Status);
                Assert.Empty(session.Chunks);
            }
        }
        finally
        {
            Directory.Delete(tempRoot, recursive: true);
        }
    }
}
