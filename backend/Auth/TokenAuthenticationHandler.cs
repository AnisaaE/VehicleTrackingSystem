using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using VehicleTrackingSystem.Data;

namespace VehicleTrackingSystem.Auth;

public sealed class TokenAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "Bearer";

    private readonly IAuthTokenService _authTokenService;
    private readonly VehicleTrackingDbContext _dbContext;

    public TokenAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        IAuthTokenService authTokenService,
        VehicleTrackingDbContext dbContext)
        : base(options, logger, encoder)
    {
        _authTokenService = authTokenService;
        _dbContext = dbContext;
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var authorizationHeader = Request.Headers.Authorization.ToString();

        if (string.IsNullOrWhiteSpace(authorizationHeader) ||
            !authorizationHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            return AuthenticateResult.NoResult();
        }

        var token = authorizationHeader["Bearer ".Length..].Trim();

        if (!_authTokenService.TryValidateToken(token, out var payload))
        {
            return AuthenticateResult.Fail("Invalid or expired token.");
        }

        var account = await _dbContext.UserAccounts
            .AsNoTracking()
            .Include(user => user.Employee)
            .FirstOrDefaultAsync(user => user.Id == payload.UserId, Context.RequestAborted);

        if (account is null || !account.IsActive || !account.Employee.IsActive)
        {
            return AuthenticateResult.Fail("User is inactive or no longer exists.");
        }

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, account.Id.ToString()),
            new Claim("employee_id", account.EmployeeId.ToString()),
            new Claim(ClaimTypes.Name, account.Username),
            new Claim("full_name", account.Employee.FullName),
            new Claim(ClaimTypes.Role, account.Role)
        };
        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);

        return AuthenticateResult.Success(ticket);
    }
}
