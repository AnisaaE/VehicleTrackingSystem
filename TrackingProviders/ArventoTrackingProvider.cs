using VehicleTrackingSystem.Interfaces;
using VehicleTrackingSystem.DTOs.Vehicles;
using System.Text.Json;

namespace VehicleTrackingSystem.TrackingProviders;

public sealed class ArventoTrackingProvider : IVehicleTrackingProvider
{
    private const string RouteDirectory = "TrackingProviders/osrm-routes";
    private const int RouteCycleSeconds = 420;

    private static readonly IReadOnlyList<VehicleSeed> VehicleSeeds =
    [
        new("34 ITF 101", "Fire Engine 1", 0),
        new("34 ITF 102", "Fire Engine 2", 55),
        new("34 ITF 103", "Ladder Truck", 110),
        new("34 ITF 104", "Rescue Truck", 165),
        new("34 ITF 105", "Water Tanker", 220)
    ];

    private readonly Lazy<IReadOnlyList<RouteData>> _routes;

    public ArventoTrackingProvider(IWebHostEnvironment environment)
    {
        _routes = new Lazy<IReadOnlyList<RouteData>>(
            () => LoadRoutes(environment.ContentRootPath));
    }

    public string ProviderCode => "ARVENTO";

    public Task<IReadOnlyList<VehicleLocationDto>> GetCurrentLocationsAsync(
        CancellationToken cancellationToken = default)
    {
        var routes = _routes.Value;
        var now = DateTimeOffset.UtcNow;

        if (routes.Count == 0)
        {
            return Task.FromResult<IReadOnlyList<VehicleLocationDto>>([]);
        }

        var locations = VehicleSeeds
            .Select((vehicle, index) =>
            {
                var route = routes[index % routes.Count];
                var elapsedSeconds = (now.ToUnixTimeSeconds() + vehicle.StartOffsetSeconds) % RouteCycleSeconds;
                var progress = elapsedSeconds / (double)RouteCycleSeconds;
                var point = route.GetPointAt(progress);
                var speed = route.EstimatedSpeedKmh;

                return new VehicleLocationDto(
                    vehicle.Plate,
                    vehicle.Name,
                    "Fire Truck",
                    ProviderCode,
                    Math.Round((decimal)point.Latitude, 6),
                    Math.Round((decimal)point.Longitude, 6),
                    speed,
                    true,
                    now);
            })
            .ToList();

        return Task.FromResult<IReadOnlyList<VehicleLocationDto>>(locations);
    }

    private sealed record VehicleSeed(
        string Plate,
        string Name,
        int StartOffsetSeconds);

    private static IReadOnlyList<RouteData> LoadRoutes(string contentRootPath)
    {
        var routePath = Path.Combine(
            contentRootPath,
            RouteDirectory.Replace('/', Path.DirectorySeparatorChar));

        if (!Directory.Exists(routePath))
        {
            return [];
        }

        return Directory.GetFiles(routePath, "*.json")
            .OrderBy(file => file, StringComparer.OrdinalIgnoreCase)
            .Select(ParseRoute)
            .Where(route => route.Points.Count > 1)
            .ToList();
    }

    private static RouteData ParseRoute(string filePath)
    {
        using var document = JsonDocument.Parse(File.ReadAllText(filePath));

        var features = document.RootElement.GetProperty("features").EnumerateArray();

        foreach (var feature in features)
        {
            if (!feature.TryGetProperty("geometry", out var geometry))
            {
                continue;
            }

            if (geometry.GetProperty("type").GetString() != "LineString")
            {
                continue;
            }

            var points = geometry.GetProperty("coordinates")
                .EnumerateArray()
                .Select(coordinate => new RoutePoint(
                    coordinate[1].GetDouble(),
                    coordinate[0].GetDouble()))
                .ToList();

            return new RouteData(points);
        }

        return new RouteData([]);
    }

    private sealed class RouteData
    {
        private readonly IReadOnlyList<double> _cumulativeDistances;

        public RouteData(IReadOnlyList<RoutePoint> points)
        {
            Points = points;
            _cumulativeDistances = BuildCumulativeDistances(points);
            TotalDistanceKm = _cumulativeDistances.Count == 0 ? 0 : _cumulativeDistances[^1];
            EstimatedSpeedKmh = TotalDistanceKm <= 0
                ? 0
                : Math.Clamp((int)Math.Round(TotalDistanceKm / RouteCycleSeconds * 3600), 15, 80);
        }

        public IReadOnlyList<RoutePoint> Points { get; }

        public double TotalDistanceKm { get; }

        public int EstimatedSpeedKmh { get; }

        public RoutePoint GetPointAt(double progress)
        {
            if (Points.Count == 0)
            {
                return new RoutePoint(0, 0);
            }

            if (Points.Count == 1 || TotalDistanceKm <= 0)
            {
                return Points[0];
            }

            var targetDistance = TotalDistanceKm * progress;

            for (var index = 1; index < _cumulativeDistances.Count; index++)
            {
                if (_cumulativeDistances[index] < targetDistance)
                {
                    continue;
                }

                var previousDistance = _cumulativeDistances[index - 1];
                var segmentDistance = _cumulativeDistances[index] - previousDistance;
                var segmentProgress = segmentDistance == 0
                    ? 0
                    : (targetDistance - previousDistance) / segmentDistance;

                return Interpolate(Points[index - 1], Points[index], segmentProgress);
            }

            return Points[^1];
        }

        private static IReadOnlyList<double> BuildCumulativeDistances(IReadOnlyList<RoutePoint> points)
        {
            if (points.Count == 0)
            {
                return [];
            }

            var distances = new List<double> { 0 };

            for (var index = 1; index < points.Count; index++)
            {
                distances.Add(distances[^1] + DistanceKm(points[index - 1], points[index]));
            }

            return distances;
        }

        private static RoutePoint Interpolate(RoutePoint start, RoutePoint end, double progress)
        {
            return new RoutePoint(
                start.Latitude + (end.Latitude - start.Latitude) * progress,
                start.Longitude + (end.Longitude - start.Longitude) * progress);
        }

        private static double DistanceKm(RoutePoint start, RoutePoint end)
        {
            const double earthRadiusKm = 6371;

            var latitudeDelta = DegreesToRadians(end.Latitude - start.Latitude);
            var longitudeDelta = DegreesToRadians(end.Longitude - start.Longitude);
            var startLatitude = DegreesToRadians(start.Latitude);
            var endLatitude = DegreesToRadians(end.Latitude);

            var haversine = Math.Sin(latitudeDelta / 2) * Math.Sin(latitudeDelta / 2) +
                Math.Cos(startLatitude) * Math.Cos(endLatitude) *
                Math.Sin(longitudeDelta / 2) * Math.Sin(longitudeDelta / 2);

            return earthRadiusKm * 2 * Math.Atan2(Math.Sqrt(haversine), Math.Sqrt(1 - haversine));
        }

        private static double DegreesToRadians(double degrees) =>
            degrees * Math.PI / 180;
    }

    private sealed record RoutePoint(double Latitude, double Longitude);
}
