using VehicleTrackingSystem.DTOs.VehicleTrips;
using VehicleTrackingSystem.DTOs.Vehicles;

namespace VehicleTrackingSystem.Interfaces;

public interface IVehicleTripService
{
    Task<IReadOnlyList<VehicleTripDto>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<VehicleTripDto>> GetActiveAsync(
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<VehicleTripDto>> GetActiveForProviderAsync(
        string providerCode,
        CancellationToken cancellationToken = default);

    Task<VehicleTripDto?> GetActiveForVehicleAsync(
        string providerCode,
        string plate,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<VehicleTripDto>> GetForDriverAsync(
        int driverId,
        CancellationToken cancellationToken = default);

    Task<VehicleTripDto> CreateAsync(
        CreateVehicleTripRequest request,
        CancellationToken cancellationToken = default);

    Task<VehicleTripDto?> CompleteAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<VehicleTripDto?> CompleteForDriverAsync(
        int id,
        int driverId,
        CancellationToken cancellationToken = default);

    Task<VehicleTripDto?> CancelAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task UpdateProgressFromLocationsAsync(
        IReadOnlyList<VehicleLocationDto> locations,
        CancellationToken cancellationToken = default);
}
