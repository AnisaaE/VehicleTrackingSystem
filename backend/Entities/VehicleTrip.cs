namespace VehicleTrackingSystem.Entities;

public sealed class VehicleTrip
{
    public int Id { get; set; }

    public int VehicleId { get; set; }

    public Vehicle Vehicle { get; set; } = null!;

    public int? DriverId { get; set; }

    public Employee? Driver { get; set; }

    public int? AssignedByEmployeeId { get; set; }

    public Employee? AssignedByEmployee { get; set; }

    public int? CompletedByEmployeeId { get; set; }

    public Employee? CompletedByEmployee { get; set; }

    public int? OriginFacilityId { get; set; }

    public int? DestinationId { get; set; }

    public double DestinationLatitude { get; set; }

    public double DestinationLongitude { get; set; }

    public string Status { get; set; } = "ASSIGNED";

    public DateTimeOffset AssignedAt { get; set; }

    public DateTimeOffset? StartedAt { get; set; }

    public DateTimeOffset? CompletedAt { get; set; }

    public DateTimeOffset? CancelledAt { get; set; }

    public double? CompletionLatitude { get; set; }

    public double? CompletionLongitude { get; set; }

    public double? EstimatedDistanceMeters { get; set; }

    public double? EstimatedDurationSeconds { get; set; }

    public double? ActualDistanceMeters { get; set; }

    public double? ActualDurationSeconds { get; set; }

    public string? RouteGeometry { get; set; }

    public string? Notes { get; set; }
}
