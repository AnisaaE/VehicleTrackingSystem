using VehicleTrackingSystem.Interfaces;

namespace VehicleTrackingSystem.Services;

public sealed class VehicleTrackingProviderResolver : IVehicleTrackingProviderResolver
{
    private readonly IReadOnlyDictionary<string, IVehicleTrackingProvider> _providersByCode;

    public VehicleTrackingProviderResolver(IEnumerable<IVehicleTrackingProvider> providers)
    {
        _providersByCode = providers.ToDictionary(
            provider => provider.ProviderCode,
            StringComparer.OrdinalIgnoreCase);
    }

    public IVehicleTrackingProvider? Resolve(string providerCode)
    {
        var normalizedCode = providerCode.Trim();

        return _providersByCode.TryGetValue(normalizedCode, out var provider)
            ? provider
            : null;
    }
}
