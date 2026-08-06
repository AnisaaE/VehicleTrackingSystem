namespace VehicleTrackingSystem.DTOs.VehicleTypes;

public sealed record CreateVehicleTypeRequest(
    string Name,
    string Code,
    int ProviderId);
