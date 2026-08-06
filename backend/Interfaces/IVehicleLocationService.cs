using VehicleTrackingSystem.DTOs.Vehicles;

namespace VehicleTrackingSystem.Interfaces;

public interface IVehicleLocationService
{
    Task<IReadOnlyList<VehicleLocationDto>> GetCurrentLocationsAsync(
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<VehicleLocationDto>> GetCurrentLocationsAsync(
        string providerCode,
        CancellationToken cancellationToken = default);

    Task<VehicleLocationDto?> GetCurrentLocationByPlateAsync(
        string plate,
        CancellationToken cancellationToken = default);

    Task<VehicleLocationDto?> GetCurrentLocationByPlateAsync(
        string providerCode,
        string plate,
        CancellationToken cancellationToken = default);
}
