namespace VehicleTrackingSystem.DTOs.Geocoding;

public sealed record GeocodeResultDto(
    string DisplayName,
    double Latitude,
    double Longitude);
