namespace VehicleTrackingSystem.DTOs.VehicleTypes;

public sealed record UpdateVehicleTypeRequest(
    string Name,
    string Code,
    int ProviderId);
