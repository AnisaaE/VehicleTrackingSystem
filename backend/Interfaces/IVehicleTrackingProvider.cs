using VehicleTrackingSystem.DTOs.Vehicles;

namespace VehicleTrackingSystem.Interfaces;

public interface IVehicleTrackingProvider
{
    string ProviderCode { get; }

    Task<IReadOnlyList<VehicleLocationDto>> GetCurrentLocationsAsync(
        CancellationToken cancellationToken = default);
}
