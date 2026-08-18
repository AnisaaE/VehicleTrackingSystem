using System.Globalization;
using System.Text.Json;
using NetTopologySuite;
using NetTopologySuite.Geometries;

namespace VehicleTrackingSystem.Services;

public static class GeometryJson
{
    private static readonly GeometryFactory GeometryFactory =
        NtsGeometryServices.Instance.CreateGeometryFactory(srid: 4326);

    public static Point ParsePoint(string geoJson)
    {
        using var document = JsonDocument.Parse(geoJson);
        var root = document.RootElement;

        if (!root.TryGetProperty("type", out var type) ||
            !string.Equals(type.GetString(), "Point", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Location must be a GeoJSON Point.");
        }

        var coordinate = root.GetProperty("coordinates");
        return GeometryFactory.CreatePoint(new Coordinate(
            coordinate[0].GetDouble(),
            coordinate[1].GetDouble()));
    }

    public static Polygon ParsePolygon(string geoJson)
    {
        using var document = JsonDocument.Parse(geoJson);
        var root = document.RootElement;

        if (!root.TryGetProperty("type", out var type) ||
            !string.Equals(type.GetString(), "Polygon", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Boundary must be a GeoJSON Polygon.");
        }

        var rings = root.GetProperty("coordinates")
            .EnumerateArray()
            .Select(ring => ring.EnumerateArray()
                .Select(coordinate => new Coordinate(
                    coordinate[0].GetDouble(),
                    coordinate[1].GetDouble()))
                .ToArray())
            .ToArray();

        if (rings.Length == 0 || rings[0].Length < 4)
        {
            throw new InvalidOperationException("Boundary polygon must contain a closed shell.");
        }

        var shell = GeometryFactory.CreateLinearRing(CloseRing(rings[0]));
        var holes = rings.Skip(1)
            .Where(ring => ring.Length >= 4)
            .Select(ring => GeometryFactory.CreateLinearRing(CloseRing(ring)))
            .ToArray();

        return GeometryFactory.CreatePolygon(shell, holes);
    }

    public static string Point(double longitude, double latitude) =>
        $$"""{"type":"Point","coordinates":[{{Format(longitude)}},{{Format(latitude)}}]}""";

    public static string LineString(IEnumerable<(double Longitude, double Latitude)> coordinates) =>
        $$"""{"type":"LineString","coordinates":[{{string.Join(",", coordinates.Select(coordinate => $"[{Format(coordinate.Longitude)},{Format(coordinate.Latitude)}]"))}}]}""";

    private static Coordinate[] CloseRing(Coordinate[] coordinates)
    {
        if (coordinates[0].Equals2D(coordinates[^1]))
        {
            return coordinates;
        }

        return [.. coordinates, coordinates[0]];
    }

    private static string Format(double value) =>
        value.ToString("0.######", CultureInfo.InvariantCulture);
}
