namespace VehicleTrackingSystem.DTOs.VehicleTypes;

public sealed record VehicleTypeDto(
    int Id,
    string Name,
    string Code,
    int ProviderId,
    string ProviderCode);
