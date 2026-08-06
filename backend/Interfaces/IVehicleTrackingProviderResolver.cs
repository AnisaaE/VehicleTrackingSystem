namespace VehicleTrackingSystem.Interfaces;

public interface IVehicleTrackingProviderResolver
{
    IVehicleTrackingProvider? Resolve(string providerCode);
}
