using System.Security.Claims;

namespace VehicleTrackingSystem.Auth;

public static class CurrentUserExtensions
{
    public static int? GetUserId(this ClaimsPrincipal user) =>
        int.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)
            ? userId
            : null;

    public static int? GetEmployeeId(this ClaimsPrincipal user) =>
        int.TryParse(user.FindFirstValue("employee_id"), out var employeeId)
            ? employeeId
            : null;
}
