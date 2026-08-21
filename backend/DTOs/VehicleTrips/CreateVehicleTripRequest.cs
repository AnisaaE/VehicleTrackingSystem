namespace VehicleTrackingSystem.DTOs.VehicleTrips;

public sealed record CreateVehicleTripRequest(
    string ProviderCode,
    string VehiclePlate,
    int? DriverId,
    int? AssignedByEmployeeId,
    int? OriginFacilityId,
    int? DestinationId,
    double? DestinationLatitude,
    double? DestinationLongitude,
    string? Notes);
