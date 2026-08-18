namespace VehicleTrackingSystem.Services;

public sealed record FacilityRecord(
    int Id,
    string Name,
    string Code,
    string FacilityType,
    string Location,
    string? Boundary);
