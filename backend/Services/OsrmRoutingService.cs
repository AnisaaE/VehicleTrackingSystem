using System.Globalization;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Options;
using VehicleTrackingSystem.DTOs.Routing;
using VehicleTrackingSystem.Interfaces;
using VehicleTrackingSystem.Options;

namespace VehicleTrackingSystem.Services;

public sealed class OsrmRoutingService : IRoutingService
{
    private readonly HttpClient _httpClient;
    private readonly RoutingOptions _options;

    public OsrmRoutingService(HttpClient httpClient, IOptions<RoutingOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _httpClient.BaseAddress = new Uri(_options.BaseUrl.TrimEnd('/') + "/");
        _httpClient.DefaultRequestHeaders.UserAgent.Clear();
        _httpClient.DefaultRequestHeaders.UserAgent.Add(
            ProductInfoHeaderValue.Parse("VehicleTrackingSystem/1.0"));
    }

    public async Task<RouteResponseDto> GetRouteAsync(
        double fromLatitude,
        double fromLongitude,
        double toLatitude,
        double toLongitude,
        CancellationToken cancellationToken = default)
    {
        var coordinates =
            $"{Format(fromLongitude)},{Format(fromLatitude)};{Format(toLongitude)},{Format(toLatitude)}";
        var url =
            $"route/v1/{Uri.EscapeDataString(_options.Profile)}/{coordinates}?overview=full&geometries=geojson&steps=true";

        using var response = await _httpClient.GetAsync(url, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new HttpRequestException(
                $"OSRM returned {(int)response.StatusCode} {response.ReasonPhrase}: {errorBody}",
                null,
                response.StatusCode);
        }

        using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
        var route = document.RootElement.GetProperty("routes")[0];
        var geometry = route.GetProperty("geometry").GetRawText();
        var steps = new List<RouteStepDto>();

        foreach (var leg in route.GetProperty("legs").EnumerateArray())
        {
            foreach (var step in leg.GetProperty("steps").EnumerateArray())
            {
                var maneuver = step.GetProperty("maneuver");
                var maneuverType = maneuver.TryGetProperty("type", out var type)
                    ? type.GetString() ?? "turn"
                    : "turn";
                var modifier = maneuver.TryGetProperty("modifier", out var nextModifier)
                    ? nextModifier.GetString()
                    : null;
                var name = step.TryGetProperty("name", out var nextName)
                    ? nextName.GetString()
                    : null;

                steps.Add(new RouteStepDto(
                    BuildInstruction(maneuverType, modifier, name),
                    maneuverType,
                    step.GetProperty("distance").GetDouble(),
                    step.GetProperty("duration").GetDouble()));
            }
        }

        return new RouteResponseDto(
            geometry,
            route.GetProperty("distance").GetDouble(),
            route.GetProperty("duration").GetDouble(),
            steps);
    }

    private static string BuildInstruction(string maneuverType, string? modifier, string? roadName)
    {
        var direction = string.IsNullOrWhiteSpace(modifier) ? string.Empty : $" {modifier}";
        var road = string.IsNullOrWhiteSpace(roadName) ? string.Empty : $" onto {roadName}";

        return maneuverType switch
        {
            "depart" => $"Depart{road}",
            "arrive" => "Arrive at destination",
            _ => $"{maneuverType}{direction}{road}"
        };
    }

    private static string Format(double value) =>
        value.ToString("0.######", CultureInfo.InvariantCulture);
}
