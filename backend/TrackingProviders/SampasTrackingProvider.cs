using VehicleTrackingSystem.Interfaces;
using System.Text.Json;

namespace VehicleTrackingSystem.TrackingProviders;

public sealed class SampasTrackingProvider : IVehicleTrackingProvider
{
    private readonly ITrackingProviderCredentialService _credentialService;

    public SampasTrackingProvider(ITrackingProviderCredentialService credentialService)
    {
        _credentialService = credentialService;
    }

    public string ProviderCode => "SAMPAS";

    public Task<IReadOnlyList<JsonElement>> GetRawLocationsAsync(
        CancellationToken cancellationToken = default)
    {
        var credentials = _credentialService.GetCredentials(ProviderCode);

        return Task.FromResult<IReadOnlyList<JsonElement>>([]);
    }
}
