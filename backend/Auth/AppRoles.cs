namespace VehicleTrackingSystem.Auth;

public static class AppRoles
{
    public const string Admin = "ADMIN";
    public const string Dispatcher = "DISPATCHER";
    public const string Driver = "DRIVER";
    public const string Viewer = "VIEWER";

    public const string AdminOrDispatcher = $"{Admin},{Dispatcher}";
    public const string Staff = $"{Admin},{Dispatcher},{Viewer}";
    public const string All = $"{Admin},{Dispatcher},{Driver},{Viewer}";

    public static string Normalize(string? role) =>
        string.IsNullOrWhiteSpace(role)
            ? Driver
            : role.Trim().ToUpperInvariant();

    public static bool IsKnown(string role) =>
        role is Admin or Dispatcher or Driver or Viewer;
}
