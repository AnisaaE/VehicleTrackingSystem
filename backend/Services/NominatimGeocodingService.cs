using System.Globalization;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using VehicleTrackingSystem.DTOs.Geocoding;
using VehicleTrackingSystem.Interfaces;
using VehicleTrackingSystem.Options;

namespace VehicleTrackingSystem.Services;

public sealed class NominatimGeocodingService : IGeocodingService
{
    private readonly HttpClient _httpClient;
    private readonly IMemoryCache _cache;
    private readonly GeocodingOptions _options;
    private readonly SemaphoreSlim _throttle = new(1, 1);
    private DateTimeOffset _lastRequestAt = DateTimeOffset.MinValue;

    public NominatimGeocodingService(
        HttpClient httpClient,
        IMemoryCache cache,
        IOptions<GeocodingOptions> options)
    {
        _httpClient = httpClient;
        _cache = cache;
        _options = options.Value;
        _httpClient.BaseAddress = new Uri(_options.BaseUrl.TrimEnd('/') + "/");
        _httpClient.DefaultRequestHeaders.UserAgent.Clear();
        _httpClient.DefaultRequestHeaders.UserAgent.Add(
            ProductInfoHeaderValue.Parse(_options.UserAgent));
    }

    public async Task<IReadOnlyList<GeocodeResultDto>> SearchAsync(
        string query,
        CancellationToken cancellationToken = default)
    {
        var normalizedQuery = query.Trim();

        if (normalizedQuery.Length < 3)
        {
            return [];
        }

        var cacheKey = $"geocode:{normalizedQuery.ToUpperInvariant()}";

        if (_cache.TryGetValue<IReadOnlyList<GeocodeResultDto>>(cacheKey, out var cached) &&
            cached is not null)
        {
            return cached;
        }

        await WaitForSlotAsync(cancellationToken);

        var url = $"search?format=jsonv2&limit=5&q={Uri.EscapeDataString(normalizedQuery)}";
        using var response = await _httpClient.GetAsync(url, cancellationToken);
        response.EnsureSuccessStatusCode();

        using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);

        var results = document.RootElement
            .EnumerateArray()
            .Select(result => new GeocodeResultDto(
                result.GetProperty("display_name").GetString() ?? normalizedQuery,
                double.Parse(result.GetProperty("lat").GetString() ?? "0", CultureInfo.InvariantCulture),
                double.Parse(result.GetProperty("lon").GetString() ?? "0", CultureInfo.InvariantCulture)))
            .ToList();

        _cache.Set(
            cacheKey,
            results,
            TimeSpan.FromMinutes(Math.Max(1, _options.CacheMinutes)));

        return results;
    }

    private async Task WaitForSlotAsync(CancellationToken cancellationToken)
    {
        await _throttle.WaitAsync(cancellationToken);

        try
        {
            var delay = TimeSpan.FromSeconds(Math.Max(1, _options.MinRequestIntervalSeconds));
            var nextAllowedAt = _lastRequestAt + delay;
            var wait = nextAllowedAt - DateTimeOffset.UtcNow;

            if (wait > TimeSpan.Zero)
            {
                await Task.Delay(wait, cancellationToken);
            }

            _lastRequestAt = DateTimeOffset.UtcNow;
        }
        finally
        {
            _throttle.Release();
        }
    }
}
