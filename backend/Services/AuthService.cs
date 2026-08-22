using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using VehicleTrackingSystem.Auth;
using VehicleTrackingSystem.Data;
using VehicleTrackingSystem.DTOs.Auth;
using VehicleTrackingSystem.Interfaces;
using VehicleTrackingSystem.Options;

namespace VehicleTrackingSystem.Services;

public sealed class AuthService : IAuthService
{
    private readonly VehicleTrackingDbContext _dbContext;
    private readonly IAuthTokenService _authTokenService;
    private readonly AuthOptions _authOptions;

    public AuthService(
        VehicleTrackingDbContext dbContext,
        IAuthTokenService authTokenService,
        IOptions<AuthOptions> authOptions)
    {
        _dbContext = dbContext;
        _authTokenService = authTokenService;
        _authOptions = authOptions.Value;
    }

    public async Task<LoginResponse?> LoginAsync(
        LoginRequest request,
        CancellationToken cancellationToken = default)
    {
        var normalizedUsername = NormalizeUsername(request.Username);
        var account = await _dbContext.UserAccounts
            .Include(user => user.Employee)
            .FirstOrDefaultAsync(user => user.Username == normalizedUsername, cancellationToken);

        if (account is null ||
            !account.IsActive ||
            !account.Employee.IsActive ||
            !PasswordHasher.Verify(request.Password, account.PasswordHash))
        {
            return null;
        }

        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(_authOptions.TokenLifetimeMinutes);
        var user = ToAuthUserDto(account);
        var token = _authTokenService.CreateToken(new AuthTokenPayload(
            account.Id,
            account.EmployeeId,
            account.Username,
            account.Employee.FullName,
            account.Role,
            expiresAt));

        return new LoginResponse(token, expiresAt, user);
    }

    public async Task<AuthUserDto?> GetCurrentUserAsync(
        int userId,
        CancellationToken cancellationToken = default)
    {
        var account = await _dbContext.UserAccounts
            .AsNoTracking()
            .Include(user => user.Employee)
            .FirstOrDefaultAsync(user => user.Id == userId, cancellationToken);

        return account is null ? null : ToAuthUserDto(account);
    }

    public async Task<AuthUserDto?> UpdateProfileAsync(
        int userId,
        UpdateProfileRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            throw new InvalidOperationException("Full name is required.");
        }

        var account = await _dbContext.UserAccounts
            .Include(user => user.Employee)
            .FirstOrDefaultAsync(user => user.Id == userId, cancellationToken);

        if (account is null)
        {
            return null;
        }

        var now = DateTimeOffset.UtcNow;
        account.Employee.FullName = request.FullName.Trim();
        account.Employee.Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
        account.Employee.Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim();
        account.Employee.UpdatedAt = now;
        account.UpdatedAt = now;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return ToAuthUserDto(account);
    }

    private static AuthUserDto ToAuthUserDto(Entities.UserAccount account) =>
        new(
            account.Id,
            account.EmployeeId,
            account.Employee.FullName,
            account.Employee.Phone,
            account.Employee.Email,
            account.Username,
            account.Role,
            account.IsActive && account.Employee.IsActive);

    private static string NormalizeUsername(string username) =>
        username.Trim().ToLowerInvariant();
}
