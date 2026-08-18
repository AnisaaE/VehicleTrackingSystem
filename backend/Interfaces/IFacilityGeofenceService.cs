using VehicleTrackingSystem.DTOs.Geofencing;
using VehicleTrackingSystem.DTOs.Vehicles;

namespace VehicleTrackingSystem.Interfaces;

public interface IFacilityGeofenceService
{
    Task<IReadOnlyList<VehicleLeftFacilityDto>> DetectDeparturesAsync(
        IReadOnlyList<VehicleLocationDto> vehicles,
        CancellationToken cancellationToken = default);
}
