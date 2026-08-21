namespace VehicleTrackingSystem.Entities;

public sealed class VehicleProviderSeen
{
    public int Id { get; set; }

    public int VehicleId { get; set; }

    public Vehicle Vehicle { get; set; } = null!;

    public int ProviderId { get; set; }

    public Provider Provider { get; set; } = null!;

    public DateTimeOffset LastSeenAt { get; set; }

    public DateTimeOffset LastProviderTimestamp { get; set; }
}
