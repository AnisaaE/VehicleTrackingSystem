namespace VehicleTrackingSystem.DTOs.Vehicles;

public sealed record VehicleDto(
    int Id,
    string Plate,
    string Name,
    int ProviderId,
    string ProviderCode,
    int? VehicleTypeId,
    string? VehicleTypeCode,
    string? VehicleTypeName,
    bool IsActive);
