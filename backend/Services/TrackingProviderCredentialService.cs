using Microsoft.Extensions.Options;
using VehicleTrackingSystem.Interfaces;
using VehicleTrackingSystem.Options;

namespace VehicleTrackingSystem.Services;

public sealed class TrackingProviderCredentialService : ITrackingProviderCredentialService
{
    private readonly TrackingProviderCredentialsOptions _options;

    public TrackingProviderCredentialService(
        IOptions<TrackingProviderCredentialsOptions> options)
    {
        _options = options.Value;
    }

    public TrackingProviderCredentials GetCredentials(string providerCode)
    {
        var normalizedProviderCode = providerCode.Trim().ToUpperInvariant();

        return _options.Credentials.TryGetValue(
            normalizedProviderCode,
            out var credentials)
            ? credentials
            : new TrackingProviderCredentials();
    }
}
