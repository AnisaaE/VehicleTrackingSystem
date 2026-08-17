using Microsoft.AspNetCore.SignalR;

namespace VehicleTrackingSystem.Hubs;

public sealed class VehicleLocationHub : Hub
{
    private const string AllProvidersGroupName = "providers:all";
    private const string ProviderGroupPrefix = "provider:";
    private const string CurrentProviderCodeKey = "current-provider-code";

    public async Task SubscribeToAllProviders()
    {
        var previousProviderCode = Context.Items[CurrentProviderCodeKey] as string;

        if (!string.IsNullOrWhiteSpace(previousProviderCode))
        {
            await Groups.RemoveFromGroupAsync(
                Context.ConnectionId,
                GetProviderGroupName(previousProviderCode));
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, AllProvidersGroupName);

        Context.Items[CurrentProviderCodeKey] = null;
    }

    public async Task SubscribeToProvider(string providerCode)
    {
        var normalizedProviderCode = NormalizeProviderCode(providerCode);
        var previousProviderCode = Context.Items[CurrentProviderCodeKey] as string;

        await Groups.RemoveFromGroupAsync(Context.ConnectionId, AllProvidersGroupName);

        if (!string.IsNullOrWhiteSpace(previousProviderCode))
        {
            await Groups.RemoveFromGroupAsync(
                Context.ConnectionId,
                GetProviderGroupName(previousProviderCode));
        }

        await Groups.AddToGroupAsync(
            Context.ConnectionId,
            GetProviderGroupName(normalizedProviderCode));

        Context.Items[CurrentProviderCodeKey] = normalizedProviderCode;
    }

    public static string GetProviderGroupName(string providerCode) =>
        $"{ProviderGroupPrefix}{NormalizeProviderCode(providerCode)}";

    public static string GetAllProvidersGroupName() => AllProvidersGroupName;

    private static string NormalizeProviderCode(string providerCode) =>
        providerCode.Trim().ToUpperInvariant();
}
