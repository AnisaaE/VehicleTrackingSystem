using VehicleTrackingSystem.Options;

namespace VehicleTrackingSystem.Interfaces;

public interface ITrackingProviderCredentialService
{
    TrackingProviderCredentials GetCredentials(string providerCode);
}
