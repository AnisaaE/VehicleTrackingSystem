using VehicleTrackingSystem.Interfaces;
using System.Text.Json;

namespace VehicleTrackingSystem.TrackingProviders;

public sealed class MobilizTrackingProvider : IVehicleTrackingProvider
{
    private readonly ITrackingProviderCredentialService _credentialService;

    public MobilizTrackingProvider(ITrackingProviderCredentialService credentialService)
    {
        _credentialService = credentialService;
    }

    public string ProviderCode => "MOBILIZ";

    public Task<IReadOnlyList<JsonElement>> GetRawLocationsAsync(
        CancellationToken cancellationToken = default)
    {
        var credentials = _credentialService.GetCredentials(ProviderCode);

        return Task.FromResult<IReadOnlyList<JsonElement>>([]);
    }
}
