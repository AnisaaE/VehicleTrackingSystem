using VehicleTrackingSystem.Interfaces;
using System.Text.Json;

namespace VehicleTrackingSystem.TrackingProviders;

public sealed class SampasTrackingProvider : IVehicleTrackingProvider
{
    public string ProviderCode => "SAMPAS";

    public Task<IReadOnlyList<JsonElement>> GetRawLocationsAsync(
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult<IReadOnlyList<JsonElement>>([]);
    }
}
