using VehicleTrackingSystem.DTOs.Vehicles;

namespace VehicleTrackingSystem.Interfaces;

public interface IVehicleLocationService
{
    Task<IReadOnlyList<VehicleLocationDto>> GetCurrentLocationsAsync(
        CancellationToken cancellationToken = default);

    Task<VehicleLocationDto?> GetCurrentLocationByPlateAsync(
        string plate,
        CancellationToken cancellationToken = default);
}
