namespace VehicleTrackingSystem.DTOs.Vehicles;

public sealed record VehicleLocationDto(
    string Plate,
    string VehicleName,
    string VehicleType,
    string Provider,
    decimal Latitude,
    decimal Longitude,
    int Speed,
    bool IgnitionOn,
    DateTimeOffset LastLocationTime);
