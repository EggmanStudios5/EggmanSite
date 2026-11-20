using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;

namespace Eggman.ServiceDefaults.Logging;

public static partial class PiiScrubber
{
    public static string Scrub(string? raw)
    {
        if (string.IsNullOrEmpty(raw))
        {
            return string.Empty;
        }

        var result = BearerRegex().Replace(raw, "Bearer [REDACTED]");
        result = HeaderSecretRegex().Replace(result, "$1: [REDACTED]");
        result = ConnectionPasswordRegex().Replace(result, "$1=[REDACTED]");
        result = EmailRegex().Replace(result, "[REDACTED_EMAIL]");
        return result;
    }

    [GeneratedRegex(@"Bearer\s+[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+(\.[A-Za-z0-9\-_=]+)?", RegexOptions.IgnoreCase)]
    private static partial Regex BearerRegex();

    [GeneratedRegex(@"(Authorization|X-Vault-Token|X-Eggman-Signature)\s*[:=]\s*[^\s,;]+", RegexOptions.IgnoreCase)]
    private static partial Regex HeaderSecretRegex();

    [GeneratedRegex(@"(Password|Pwd|Secret)\s*=\s*[^;\s]+", RegexOptions.IgnoreCase)]
    private static partial Regex ConnectionPasswordRegex();

    [GeneratedRegex(@"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")]
    private static partial Regex EmailRegex();
}

public sealed class PiiScrubbingLoggerProvider : ILoggerProvider
{
    public ILogger CreateLogger(string categoryName) => new PiiScrubbingLogger(categoryName);

    public void Dispose() { }

    private sealed class PiiScrubbingLogger(string categoryName) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => logLevel >= LogLevel.Information;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            if (!IsEnabled(logLevel))
            {
                return;
            }

            var message = PiiScrubber.Scrub(formatter(state, exception));
            var errorText = exception is null ? null : PiiScrubber.Scrub($"{exception.GetType().Name}: {exception.Message}");

            var entry = JsonSerializer.Serialize(new
            {
                timestamp = DateTimeOffset.UtcNow.ToString("O"),
                level = logLevel.ToString(),
                category = categoryName,
                eventId = eventId.Id,
                message,
                error = errorText
            });

            Console.Out.WriteLine(entry);
        }
    }
}
