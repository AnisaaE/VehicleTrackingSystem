namespace VehicleTrackingSystem.Options;

public sealed class GeocodingOptions
{
    public const string SectionName = "Geocoding";

    public string Provider { get; set; } = "Nominatim";

    public string BaseUrl { get; set; } = "https://nominatim.openstreetmap.org";

    public string UserAgent { get; set; } = "VehicleTrackingSystem/1.0";

    public int MinRequestIntervalSeconds { get; set; } = 1;

    public int CacheMinutes { get; set; } = 1440;
}
