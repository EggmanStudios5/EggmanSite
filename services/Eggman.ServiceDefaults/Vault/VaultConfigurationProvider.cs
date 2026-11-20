using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Eggman.ServiceDefaults.Vault;

public sealed class VaultConfigurationOptions
{
    public string? Address { get; set; }
    public string? RoleIdFile { get; set; }
    public string? SecretIdFile { get; set; }
    public IReadOnlyList<string> KvSecretPaths { get; set; } = [];
    public string? DatabaseRole { get; set; }
    public string? RabbitMqRole { get; set; }
    public TimeSpan RefreshInterval { get; set; } = TimeSpan.FromMinutes(25);
}

public sealed class VaultConfigurationSource(VaultConfigurationOptions options) : IConfigurationSource
{
    public IConfigurationProvider Build(IConfigurationBuilder builder) => new VaultConfigurationProvider(options);
}

public sealed class VaultConfigurationProvider(VaultConfigurationOptions options) : ConfigurationProvider
{
    public override void Load() => LoadAsync(CancellationToken.None).GetAwaiter().GetResult();

    public async Task LoadAsync(CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(options.Address) ||
            string.IsNullOrWhiteSpace(options.RoleIdFile) ||
            string.IsNullOrWhiteSpace(options.SecretIdFile) ||
            !File.Exists(options.RoleIdFile) ||
            !File.Exists(options.SecretIdFile))
        {
            return;
        }

        try
        {
            var baseAddr = options.Address.TrimEnd('/');
            var roleId = (await File.ReadAllTextAsync(options.RoleIdFile, ct)).Trim();
            var secretId = (await File.ReadAllTextAsync(options.SecretIdFile, ct)).Trim();

            using var handler = ZeroTrustExtensions.CreateInternalCaHttpHandler();
            using var client = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(5) };

            using var loginResp = await client.PostAsJsonAsync(
                $"{baseAddr}/v1/auth/approle/login",
                new { role_id = roleId, secret_id = secretId },
                ct);
            if (!loginResp.IsSuccessStatusCode)
            {
                return;
            }

            using var loginDoc = await loginResp.Content.ReadFromJsonAsync<JsonDocument>(cancellationToken: ct);
            var token = loginDoc?.RootElement.GetProperty("auth").GetProperty("client_token").GetString();
            if (string.IsNullOrEmpty(token))
            {
                return;
            }

            var updated = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);

            foreach (var kvPath in options.KvSecretPaths)
            {
                var data = await ReadVaultEndpointAsync(client, baseAddr, token, kvPath, ct);
                if (data is { } elem)
                {
                    var payload = elem.TryGetProperty("data", out var nested) ? nested : elem;
                    foreach (var prop in payload.EnumerateObject())
                    {
                        updated[prop.Name.Replace("__", ":", StringComparison.Ordinal)] = prop.Value.ToString();
                    }
                }
            }

            if (!string.IsNullOrWhiteSpace(options.DatabaseRole))
            {
                var dbCreds = await ReadVaultEndpointAsync(client, baseAddr, token, $"database/creds/{options.DatabaseRole}", ct);
                if (dbCreds is { } elem)
                {
                    if (elem.TryGetProperty("username", out var u)) updated["Postgres:Username"] = u.GetString();
                    if (elem.TryGetProperty("password", out var p)) updated["Postgres:Password"] = p.GetString();
                }
            }

            if (!string.IsNullOrWhiteSpace(options.RabbitMqRole))
            {
                var rmqCreds = await ReadVaultEndpointAsync(client, baseAddr, token, $"rabbitmq/creds/{options.RabbitMqRole}", ct);
                if (rmqCreds is { } elem)
                {
                    if (elem.TryGetProperty("username", out var u)) updated["RabbitMq:Username"] = u.GetString();
                    if (elem.TryGetProperty("password", out var p)) updated["RabbitMq:Password"] = p.GetString();
                }
            }

            if (updated.Count > 0)
            {
                Data = updated;
                OnReload();
            }
        }
        catch
        {
            // Keep existing configuration if Vault is transiently unreachable; renewal service retries.
        }
    }

    private static async Task<JsonElement?> ReadVaultEndpointAsync(
        HttpClient client,
        string baseAddr,
        string token,
        string path,
        CancellationToken ct)
    {
        using var req = new HttpRequestMessage(HttpMethod.Get, $"{baseAddr}/v1/{path.TrimStart('/')}");
        req.Headers.Add("X-Vault-Token", token);
        using var resp = await client.SendAsync(req, ct);
        if (!resp.IsSuccessStatusCode)
        {
            return null;
        }
        using var doc = await resp.Content.ReadFromJsonAsync<JsonDocument>(cancellationToken: ct);
        if (doc is null || !doc.RootElement.TryGetProperty("data", out var data))
        {
            return null;
        }
        return data.Clone();
    }
}

public sealed class VaultLeaseRenewalService(
    IConfiguration configuration,
    VaultConfigurationOptions options,
    ILogger<VaultLeaseRenewalService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (string.IsNullOrWhiteSpace(options.Address) ||
            string.IsNullOrWhiteSpace(options.RoleIdFile) ||
            !File.Exists(options.RoleIdFile))
        {
            return;
        }

        using var timer = new PeriodicTimer(options.RefreshInterval);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                if (configuration is IConfigurationRoot root)
                {
                    foreach (var provider in root.Providers.OfType<VaultConfigurationProvider>())
                    {
                        await provider.LoadAsync(stoppingToken);
                    }
                }
            }
            catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
            {
                logger.LogWarning(ex, "Vault lease refresh cycle encountered an error.");
            }
        }
    }
}

public static class VaultConfigurationExtensions
{
    public static TBuilder AddEggmanVaultConfiguration<TBuilder>(
        this TBuilder builder,
        Action<VaultConfigurationOptions>? configure = null)
        where TBuilder : IHostApplicationBuilder
    {
        var opts = new VaultConfigurationOptions
        {
            Address = builder.Configuration["Vault:Address"],
            RoleIdFile = builder.Configuration["Vault:RoleIdFile"],
            SecretIdFile = builder.Configuration["Vault:SecretIdFile"],
            DatabaseRole = builder.Configuration["Vault:DatabaseRole"],
            RabbitMqRole = builder.Configuration["Vault:RabbitMqRole"]
        };
        configure?.Invoke(opts);

        builder.Configuration.Sources.Add(new VaultConfigurationSource(opts));
        builder.Services.AddSingleton(opts);
        builder.Services.AddHostedService<VaultLeaseRenewalService>();
        return builder;
    }
}
