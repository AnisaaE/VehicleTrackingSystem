using VehicleTrackingSystem.DTOs.Vehicles;

namespace VehicleTrackingSystem.Interfaces;

public interface IVehicleService
{
    Task<IReadOnlyList<VehicleDto>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<VehicleDto?> GetByProviderAndPlateAsync(
        string providerCode,
        string plate,
        CancellationToken cancellationToken = default);

    Task<VehicleDto> EnsureFromLocationAsync(
        VehicleLocationDto location,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<VehicleDto>> EnsureFromLocationsAsync(
        IReadOnlyList<VehicleLocationDto> locations,
        CancellationToken cancellationToken = default);
}
