using VehicleTrackingSystem.Interfaces;
using VehicleTrackingSystem.DTOs.Vehicles;

namespace VehicleTrackingSystem.TrackingProviders;

public sealed class MobilizTrackingProvider : IVehicleTrackingProvider
{
    public string ProviderCode => "MOBILIZ";

    public Task<IReadOnlyList<VehicleLocationDto>> GetCurrentLocationsAsync(
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult<IReadOnlyList<VehicleLocationDto>>([]);
    }
}
