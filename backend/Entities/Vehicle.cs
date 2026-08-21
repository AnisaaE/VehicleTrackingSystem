namespace VehicleTrackingSystem.Entities;

public sealed class Vehicle
{
    public int Id { get; set; }

    public string Plate { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public int ProviderId { get; set; }

    public Provider Provider { get; set; } = null!;

    public int? VehicleTypeId { get; set; }

    public VehicleType? VehicleType { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
