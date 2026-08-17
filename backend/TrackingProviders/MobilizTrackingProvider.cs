using VehicleTrackingSystem.Interfaces;
using System.Text.Json;

namespace VehicleTrackingSystem.TrackingProviders;

public sealed class MobilizTrackingProvider : IVehicleTrackingProvider
{
    public string ProviderCode => "MOBILIZ";

    public Task<IReadOnlyList<JsonElement>> GetRawLocationsAsync(
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult<IReadOnlyList<JsonElement>>([]);
    }
}
