using Microsoft.AspNetCore.SignalR;
using VehicleTrackingSystem.DTOs.Vehicles;
using VehicleTrackingSystem.Hubs;
using VehicleTrackingSystem.Interfaces;

namespace VehicleTrackingSystem.Services;

public sealed class VehicleLocationBroadcastService : BackgroundService
{
    private static readonly TimeSpan BroadcastInterval = TimeSpan.FromSeconds(2);

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
            var providerService = scope.ServiceProvider
                .GetRequiredService<IProviderService>();

            var providers = await providerService.GetAllAsync(cancellationToken);
            var allVehicles = new List<VehicleLocationDto>();

            foreach (var provider in providers.Where(provider => provider.IsActive))
            {
                var vehicles = await vehicleLocationService.GetCurrentLocationsAsync(
                    provider.Code,
                    cancellationToken);

                allVehicles.AddRange(vehicles);

                await _hubContext.Clients
                    .Group(VehicleLocationHub.GetProviderGroupName(provider.Code))
                    .SendAsync(
                        "vehicleLocationsUpdated",
                        vehicles,
                        cancellationToken);
            }

            await _hubContext.Clients
                .Group(VehicleLocationHub.GetAllProvidersGroupName())
                .SendAsync(
                    "vehicleLocationsUpdated",
                    allVehicles,
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
