using Microsoft.AspNetCore.SignalR;

namespace VehicleTrackingSystem.Hubs;

public sealed class VehicleLocationHub : Hub
{
    private const string ProviderGroupPrefix = "provider:";
    private const string CurrentProviderCodeKey = "current-provider-code";

    public async Task SubscribeToProvider(string providerCode)
    {
        var normalizedProviderCode = NormalizeProviderCode(providerCode);
        var previousProviderCode = Context.Items[CurrentProviderCodeKey] as string;

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

    private static string NormalizeProviderCode(string providerCode) =>
        providerCode.Trim().ToUpperInvariant();
}
