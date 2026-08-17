using System.Text.Json;
using VehicleTrackingSystem.DTOs.Vehicles;

namespace VehicleTrackingSystem.Interfaces;

public interface IVehicleLocationMapper
{
    Task<IReadOnlyList<VehicleLocationDto>> MapAsync(
        string providerCode,
        IReadOnlyList<JsonElement> rawLocations,
        CancellationToken cancellationToken = default);
}
