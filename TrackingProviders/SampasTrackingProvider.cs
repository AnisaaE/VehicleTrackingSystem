using VehicleTrackingSystem.Interfaces;
using VehicleTrackingSystem.DTOs.Vehicles;

namespace VehicleTrackingSystem.TrackingProviders;

public sealed class SampasTrackingProvider : IVehicleTrackingProvider
{
    public string ProviderCode => "SAMPAS";

    public Task<IReadOnlyList<VehicleLocationDto>> GetCurrentLocationsAsync(
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult<IReadOnlyList<VehicleLocationDto>>([]);
    }
}
