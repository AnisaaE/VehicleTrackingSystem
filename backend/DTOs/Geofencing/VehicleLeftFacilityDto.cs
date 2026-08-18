namespace VehicleTrackingSystem.DTOs.Geofencing;

public sealed record VehicleLeftFacilityDto(
    string Plate,
    string Provider,
    int FacilityId,
    string FacilityName,
    decimal Latitude,
    decimal Longitude,
    DateTimeOffset LeftAt);
