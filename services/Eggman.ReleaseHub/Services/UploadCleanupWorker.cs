namespace Eggman.ReleaseHub.Services;

/// <summary>
/// Periodically purges abandoned/expired chunked upload sessions (> 2h old) from PostgreSQL and disk staging.
/// </summary>
public sealed class UploadCleanupWorker(
    ChunkedUploadService uploadService,
    IConfiguration config,
    ILogger<UploadCleanupWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var intervalSec = Math.Max(30, config.GetValue<int?>("ReleaseHub:CleanupIntervalSeconds") ?? 900);
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(intervalSec));

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await uploadService.PurgeExpiredSessionsAsync(stoppingToken);
            }
            catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
            {
                logger.LogWarning(ex, "Release upload cleanup sweep failed.");
            }
        }
    }
}
