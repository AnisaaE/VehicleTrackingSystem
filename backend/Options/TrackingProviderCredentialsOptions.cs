namespace VehicleTrackingSystem.Options;

public sealed class TrackingProviderCredentialsOptions
{
    public const string SectionName = "TrackingProviders";

    public Dictionary<string, TrackingProviderCredentials> Credentials { get; set; } = [];
}
