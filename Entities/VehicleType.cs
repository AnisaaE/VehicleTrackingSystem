namespace VehicleTrackingSystem.Entities;

public sealed class VehicleType
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Code { get; set; } = string.Empty;

    public int ProviderId { get; set; }

    public Provider Provider { get; set; } = null!;
}
