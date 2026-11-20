using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Eggman.ServiceDefaults.Vault;

public sealed class VaultAppRoleClient
{
    private readonly IConfiguration _config;
    private readonly ILogger<VaultAppRoleClient> _logger;
    private readonly SemaphoreSlim _tokenLock = new(1, 1);
    private string? _cachedToken;
    private DateTimeOffset _tokenExpiresAt = DateTimeOffset.MinValue;

    public VaultAppRoleClient(IConfiguration config, ILogger<VaultAppRoleClient> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task<JsonElement?> ReadKvSecretAsync(string mountAndPath, CancellationToken ct = default)
    {
        var token = await GetClientTokenAsync(ct);
        if (string.IsNullOrEmpty(token))
        {
            return null;
        }

        var vaultAddr = _config["Vault:Address"]?.TrimEnd('/');
        if (string.IsNullOrWhiteSpace(vaultAddr))
        {
            return null;
        }

        using var handler = ZeroTrustExtensions.CreateInternalCaHttpHandler();
        using var client = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(5) };
        using var req = new HttpRequestMessage(HttpMethod.Get, $"{vaultAddr}/v1/{mountAndPath.TrimStart('/')}");
        req.Headers.Add("X-Vault-Token", token);

        using var resp = await client.SendAsync(req, ct);
        if (!resp.IsSuccessStatusCode)
        {
            _logger.LogWarning("Vault KV read failed with status {StatusCode}", (int)resp.StatusCode);
            return null;
        }

        using var doc = await resp.Content.ReadFromJsonAsync<JsonDocument>(cancellationToken: ct);
        if (doc is null)
        {
            return null;
        }

        if (doc.RootElement.TryGetProperty("data", out var outer) &&
            outer.TryGetProperty("data", out var inner))
        {
            return inner.Clone();
        }
        return doc.RootElement.Clone();
    }

    private async Task<string?> GetClientTokenAsync(CancellationToken ct)
    {
        await _tokenLock.WaitAsync(ct);
        try
        {
            if (!string.IsNullOrEmpty(_cachedToken) && DateTimeOffset.UtcNow < _tokenExpiresAt)
            {
                return _cachedToken;
            }

            var vaultAddr = _config["Vault:Address"]?.TrimEnd('/');
            var roleIdFile = _config["Vault:RoleIdFile"];
            var secretIdFile = _config["Vault:SecretIdFile"];

            if (string.IsNullOrWhiteSpace(vaultAddr) ||
                string.IsNullOrWhiteSpace(roleIdFile) ||
                string.IsNullOrWhiteSpace(secretIdFile) ||
                !File.Exists(roleIdFile) ||
                !File.Exists(secretIdFile))
            {
                return null;
            }

            var roleId = (await File.ReadAllTextAsync(roleIdFile, ct)).Trim();
            var secretId = (await File.ReadAllTextAsync(secretIdFile, ct)).Trim();

            using var handler = ZeroTrustExtensions.CreateInternalCaHttpHandler();
            using var client = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(5) };
            using var resp = await client.PostAsJsonAsync(
                $"{vaultAddr}/v1/auth/approle/login",
                new { role_id = roleId, secret_id = secretId },
                ct);

            if (!resp.IsSuccessStatusCode)
            {
                _logger.LogError("Vault AppRole login rejected with status {StatusCode}", (int)resp.StatusCode);
                return null;
            }

            using var doc = await resp.Content.ReadFromJsonAsync<JsonDocument>(cancellationToken: ct);
            if (doc is null || !doc.RootElement.TryGetProperty("auth", out var auth))
            {
                return null;
            }

            _cachedToken = auth.GetProperty("client_token").GetString();
            var leaseSec = auth.GetProperty("lease_duration").GetInt32();
            _tokenExpiresAt = DateTimeOffset.UtcNow.AddSeconds(Math.Max(60, leaseSec - 60));
            return _cachedToken;
        }
        finally
        {
            _tokenLock.Release();
        }
    }
}
