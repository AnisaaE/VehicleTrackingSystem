using VehicleTrackingSystem.DTOs.Providers;

namespace VehicleTrackingSystem.Services;

public enum ProviderResolutionStatus
{
    Found,
    VehicleTypeNotFound,
    ProviderInactive,
    ProviderImplementationNotFound
}

public sealed record ProviderResolutionResult(
    ProviderResolutionStatus Status,
    ProviderDto? Provider,
    string? Message)
{
    public static ProviderResolutionResult Found(ProviderDto provider) =>
        new(ProviderResolutionStatus.Found, provider, null);

    public static ProviderResolutionResult NotFound(string vehicleTypeCode) =>
        new(
            ProviderResolutionStatus.VehicleTypeNotFound,
            null,
            $"Vehicle type with code '{vehicleTypeCode}' was not found.");

    public static ProviderResolutionResult Inactive(ProviderDto provider) =>
        new(
            ProviderResolutionStatus.ProviderInactive,
            provider,
            $"Provider '{provider.Code}' is inactive and cannot be used for vehicle tracking.");

    public static ProviderResolutionResult ImplementationMissing(ProviderDto provider) =>
        new(
            ProviderResolutionStatus.ProviderImplementationNotFound,
            provider,
            $"Provider '{provider.Code}' is configured in the database, but no tracking implementation is registered.");
}
