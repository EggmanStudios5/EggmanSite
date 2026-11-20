using System.Collections.Concurrent;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace Eggman.IoT.Bridge.Security;

public sealed class DeviceHmacAuthOptions : AuthenticationSchemeOptions
{
    public const string SchemeName = "DeviceHmac";
}

/// <summary>
/// Authenticates Arduino UNO R4, Arduino Mega, and ESP32 RFID hardware nodes using
/// HMAC-SHA256 signatures, +/-60s timestamp bounds, and replay-blocking nonces.
/// Never trusts source IP or hostname alone.
/// </summary>
public sealed class DeviceHmacAuthHandler : AuthenticationHandler<DeviceHmacAuthOptions>
{
    private static readonly ConcurrentDictionary<string, DateTimeOffset> SeenNonces = new(StringComparer.Ordinal);
    private readonly IConfiguration _config;

    public DeviceHmacAuthHandler(
        IOptionsMonitor<DeviceHmacAuthOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        IConfiguration config)
        : base(options, logger, encoder)
    {
        _config = config;
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var sharedSecret = _config["IoT:HmacSharedSecret"];
        if (string.IsNullOrWhiteSpace(sharedSecret) || sharedSecret.StartsWith("CHANGE_ME", StringComparison.Ordinal))
        {
            return AuthenticateResult.Fail("IoT HMAC secret not configured.");
        }

        if (!Request.Headers.TryGetValue("X-Eggman-Device-Id", out var deviceId) ||
            !Request.Headers.TryGetValue("X-Eggman-Timestamp", out var tsRaw) ||
            !Request.Headers.TryGetValue("X-Eggman-Nonce", out var nonce) ||
            !Request.Headers.TryGetValue("X-Eggman-Signature", out var sigHex))
        {
            return AuthenticateResult.Fail("Missing required Zero Trust device authentication headers.");
        }

        if (!long.TryParse(tsRaw.ToString(), out var unixSec))
        {
            return AuthenticateResult.Fail("Invalid timestamp header.");
        }

        var maxSkew = int.TryParse(_config["IoT:MaxClockSkewSeconds"], out var s) ? s : 60;
        var now = DateTimeOffset.UtcNow;
        var delta = Math.Abs((now - DateTimeOffset.FromUnixTimeSeconds(unixSec)).TotalSeconds);
        if (delta > maxSkew)
        {
            return AuthenticateResult.Fail("Stale device timestamp.");
        }

        var nonceKey = $"{deviceId}:{nonce}";
        PruneExpiredNonces(now, maxSkew);
        if (SeenNonces.ContainsKey(nonceKey))
        {
            return AuthenticateResult.Fail("Replay attack detected (duplicate nonce).");
        }

        Request.EnableBuffering();
        using var reader = new StreamReader(Request.Body, Encoding.UTF8, leaveOpen: true);
        var body = await reader.ReadToEndAsync();
        Request.Body.Position = 0;

        var bodyHashHex = Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(body)));
        var canonical = $"{Request.Method.ToUpperInvariant()}\n{Request.Path.Value}\n{tsRaw}\n{nonce}\n{bodyHashHex}";

        byte[] expectedMac;
        using (var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(sharedSecret)))
        {
            expectedMac = hmac.ComputeHash(Encoding.UTF8.GetBytes(canonical));
        }

        byte[] providedMac;
        try
        {
            providedMac = Convert.FromHexString(sigHex.ToString().Trim());
        }
        catch
        {
            return AuthenticateResult.Fail("Malformed HMAC signature encoding.");
        }

        if (providedMac.Length != expectedMac.Length ||
            !CryptographicOperations.FixedTimeEquals(expectedMac, providedMac))
        {
            return AuthenticateResult.Fail("HMAC signature mismatch.");
        }

        if (!SeenNonces.TryAdd(nonceKey, now.AddSeconds(maxSkew * 2)))
        {
            return AuthenticateResult.Fail("Replay attack detected (concurrent duplicate nonce).");
        }

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, deviceId.ToString()),
            new Claim("device_id", deviceId.ToString())
        };
        var identity = new ClaimsIdentity(claims, Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        return AuthenticateResult.Success(new AuthenticationTicket(principal, Scheme.Name));
    }

    private static void PruneExpiredNonces(DateTimeOffset now, int maxSkew)
    {
        if (SeenNonces.Count < 1024)
        {
            return;
        }
        foreach (var kv in SeenNonces)
        {
            if (kv.Value < now.AddSeconds(-maxSkew))
            {
                SeenNonces.TryRemove(kv.Key, out _);
            }
        }
    }
}
