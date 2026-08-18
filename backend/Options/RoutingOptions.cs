namespace VehicleTrackingSystem.Options;

public sealed class RoutingOptions
{
    public const string SectionName = "Routing";

    public string Provider { get; set; } = "OSRM";

    public string BaseUrl { get; set; } = "https://router.project-osrm.org";

    public string ApiKey { get; set; } = string.Empty;

    public string Profile { get; set; } = "driving";
}
