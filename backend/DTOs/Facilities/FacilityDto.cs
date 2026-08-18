namespace VehicleTrackingSystem.DTOs.Facilities;

public sealed record FacilityDto(
    int Id,
    string Name,
    string Code,
    string FacilityType,
    string Location,
    string? Boundary);
