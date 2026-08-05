namespace VehicleTrackingSystem.Entities;

public sealed class Provider
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Code { get; set; } = string.Empty;

    public string ServiceUrl { get; set; } = string.Empty;

    public bool IsActive { get; set; }

    public ICollection<VehicleType> VehicleTypes { get; set; } = new List<VehicleType>();

    public ICollection<FieldMapping> FieldMappings { get; set; } = new List<FieldMapping>();
}
