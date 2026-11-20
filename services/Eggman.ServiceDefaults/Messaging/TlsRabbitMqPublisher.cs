using System.ComponentModel.DataAnnotations;
using System.Net.Security;
using System.Security.Authentication;
using System.Security.Cryptography.X509Certificates;
using System.Text.Json;
using Eggman.ServiceDefaults.Vault;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;

namespace Eggman.ServiceDefaults.Messaging;

public sealed class TlsRabbitMqPublisher : IAsyncDisposable
{
    private readonly IConfiguration _config;
    private readonly VaultAppRoleClient _vault;
    private readonly ILogger<TlsRabbitMqPublisher> _logger;
    private readonly SemaphoreSlim _connLock = new(1, 1);
    private IConnection? _connection;

    public TlsRabbitMqPublisher(
        IConfiguration config,
        VaultAppRoleClient vault,
        ILogger<TlsRabbitMqPublisher> logger)
    {
        _config = config;
        _vault = vault;
        _logger = logger;
    }

    public async Task<bool> PublishAsync<T>(
        string exchange,
        string routingKey,
        T payload,
        string? vaultSecretPath = null,
        CancellationToken ct = default)
    {
        if (payload is null)
        {
            return false;
        }

        var validationErrors = new List<ValidationResult>();
        if (!Validator.TryValidateObject(payload, new ValidationContext(payload), validationErrors, validateAllProperties: true))
        {
            _logger.LogWarning(
                "Rejected invalid RabbitMQ contract {ContractType}: {Error}",
                typeof(T).Name,
                string.Join("; ", validationErrors.Select(e => e.ErrorMessage)));
            return false;
        }

        var host = _config["RabbitMq:Host"];
        if (string.IsNullOrWhiteSpace(host))
        {
            return false;
        }

        try
        {
            var conn = await EnsureConnectionAsync(host, vaultSecretPath, ct);
            if (conn is null)
            {
                return false;
            }

            await using var channel = await conn.CreateChannelAsync(cancellationToken: ct);
            var json = JsonSerializer.SerializeToUtf8Bytes(payload);
            var props = new BasicProperties
            {
                ContentType = "application/json",
                DeliveryMode = DeliveryModes.Persistent,
                Timestamp = new AmqpTimestamp(DateTimeOffset.UtcNow.ToUnixTimeSeconds())
            };

            await channel.BasicPublishAsync(
                exchange: exchange,
                routingKey: routingKey,
                mandatory: false,
                basicProperties: props,
                body: json,
                cancellationToken: ct);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "RabbitMQ TLS publish failed for {Exchange}/{RoutingKey}", exchange, routingKey);
            return false;
        }
    }

    private async Task<IConnection?> EnsureConnectionAsync(string host, string? vaultSecretPath, CancellationToken ct)
    {
        if (_connection is { IsOpen: true })
        {
            return _connection;
        }

        await _connLock.WaitAsync(ct);
        try
        {
            if (_connection is { IsOpen: true })
            {
                return _connection;
            }

            var username = _config["RabbitMq:Username"] ?? string.Empty;
            var password = _config["RabbitMq:Password"] ?? string.Empty;

            if ((string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password)) &&
                !string.IsNullOrWhiteSpace(vaultSecretPath))
            {
                var secret = await _vault.ReadKvSecretAsync(vaultSecretPath, ct);
                if (secret is { } s)
                {
                    if (s.TryGetProperty("username", out var u)) username = u.GetString() ?? username;
                    if (s.TryGetProperty("password", out var p)) password = p.GetString() ?? password;
                }
            }

            if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
            {
                _logger.LogWarning("RabbitMQ credentials unavailable; skipping AMQPS connection.");
                return null;
            }

            var factory = new ConnectionFactory
            {
                HostName = host,
                Port = int.TryParse(_config["RabbitMq:Port"], out var port) ? port : 5671,
                VirtualHost = _config["RabbitMq:VirtualHost"] ?? "/",
                UserName = username,
                Password = password,
                Ssl = new SslOption
                {
                    Enabled = true,
                    ServerName = host,
                    Version = SslProtocols.Tls13,
                    AcceptablePolicyErrors = SslPolicyErrors.None
                }
            };

            var caPath = Environment.GetEnvironmentVariable("SSL_CERT_FILE");
            if (!string.IsNullOrWhiteSpace(caPath) && File.Exists(caPath))
            {
                factory.Ssl.Certs = new X509CertificateCollection { X509CertificateLoader.LoadCertificateFromFile(caPath) };
            }

            _connection = await factory.CreateConnectionAsync(ct);
            return _connection;
        }
        finally
        {
            _connLock.Release();
        }
    }

    public async ValueTask DisposeAsync()
    {
        if (_connection is not null)
        {
            await _connection.DisposeAsync();
        }
        _connLock.Dispose();
    }
}
