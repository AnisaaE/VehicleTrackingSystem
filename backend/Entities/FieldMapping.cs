namespace VehicleTrackingSystem.Entities;

public sealed class FieldMapping
{
    public int Id { get; set; }

    public int ProviderId { get; set; }

    public Provider Provider { get; set; } = null!;

    public string SystemField { get; set; } = string.Empty;

    public string ProviderField { get; set; } = string.Empty;
}
