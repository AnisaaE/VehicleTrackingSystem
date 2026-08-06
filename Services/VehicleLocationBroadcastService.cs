using Microsoft.AspNetCore.SignalR;
using VehicleTrackingSystem.Hubs;
using VehicleTrackingSystem.Interfaces;

namespace VehicleTrackingSystem.Services;

public sealed class VehicleLocationBroadcastService : BackgroundService
{
    private static readonly TimeSpan BroadcastInterval = TimeSpan.FromSeconds(3);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHubContext<VehicleLocationHub> _hubContext;
    private readonly ILogger<VehicleLocationBroadcastService> _logger;

    public VehicleLocationBroadcastService(
        IServiceScopeFactory scopeFactory,
        IHubContext<VehicleLocationHub> hubContext,
        ILogger<VehicleLocationBroadcastService> logger)
    {
        _scopeFactory = scopeFactory;
        _hubContext = hubContext;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(BroadcastInterval);

        while (!stoppingToken.IsCancellationRequested)
        {
            await BroadcastVehicleLocationsAsync(stoppingToken);

            try
            {
                await timer.WaitForNextTickAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    private async Task BroadcastVehicleLocationsAsync(CancellationToken cancellationToken)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var vehicleLocationService = scope.ServiceProvider
                .GetRequiredService<IVehicleLocationService>();

            var vehicles = await vehicleLocationService.GetCurrentLocationsAsync(cancellationToken);

            await _hubContext.Clients.All.SendAsync(
                "vehicleLocationsUpdated",
                vehicles,
                cancellationToken);
        }
        catch (OperationCanceledException)
        {
        }
        catch (Exception exception)
        {
            _logger.LogError(
                exception,
                "Vehicle locations could not be broadcast to SignalR clients.");
        }
    }
}
