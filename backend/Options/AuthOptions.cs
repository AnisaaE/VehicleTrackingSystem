namespace VehicleTrackingSystem.Options;

public sealed class AuthOptions
{
    public const string SectionName = "Auth";

    public string TokenSecret { get; set; } = "CHANGE_ME_DEV_SECRET_AT_LEAST_32_CHARS";

    public int TokenLifetimeMinutes { get; set; } = 480;
}
