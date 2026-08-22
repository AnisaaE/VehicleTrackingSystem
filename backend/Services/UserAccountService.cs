using Microsoft.EntityFrameworkCore;
using VehicleTrackingSystem.Auth;
using VehicleTrackingSystem.Data;
using VehicleTrackingSystem.DTOs.Users;
using VehicleTrackingSystem.Entities;
using VehicleTrackingSystem.Interfaces;

namespace VehicleTrackingSystem.Services;

public sealed class UserAccountService : IUserAccountService
{
    private readonly VehicleTrackingDbContext _dbContext;

    public UserAccountService(VehicleTrackingDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<UserAccountDto>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.UserAccounts
            .AsNoTracking()
            .Include(user => user.Employee)
            .OrderBy(user => user.Employee.FullName)
            .Select(user => ToDto(user))
            .ToListAsync(cancellationToken);
    }

    public async Task<UserAccountDto> CreateAsync(
        CreateUserRequest request,
        CancellationToken cancellationToken = default)
    {
        var role = NormalizeRole(request.Role);
        var username = NormalizeUsername(request.Username);

        if (string.IsNullOrWhiteSpace(username))
        {
            throw new InvalidOperationException("Username is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
        {
            throw new InvalidOperationException("Password must be at least 6 characters.");
        }

        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            throw new InvalidOperationException("Full name is required.");
        }

        var exists = await _dbContext.UserAccounts.AnyAsync(
            user => user.Username == username,
            cancellationToken);

        if (exists)
        {
            throw new InvalidOperationException($"User '{username}' already exists.");
        }

        var now = DateTimeOffset.UtcNow;
        var employee = new Employee
        {
            FullName = request.FullName.Trim(),
            Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim(),
            Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim(),
            Role = role,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        };
        var account = new UserAccount
        {
            Employee = employee,
            Username = username,
            PasswordHash = PasswordHasher.HashPassword(request.Password),
            Role = role,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        };

        _dbContext.UserAccounts.Add(account);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(account);
    }

    public async Task<UserAccountDto?> UpdateRoleAsync(
        int id,
        UpdateUserRoleRequest request,
        CancellationToken cancellationToken = default)
    {
        var role = NormalizeRole(request.Role);
        var account = await _dbContext.UserAccounts
            .Include(user => user.Employee)
            .FirstOrDefaultAsync(user => user.Id == id, cancellationToken);

        if (account is null)
        {
            return null;
        }

        account.Role = role;
        account.Employee.Role = role;
        account.UpdatedAt = DateTimeOffset.UtcNow;
        account.Employee.UpdatedAt = account.UpdatedAt;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(account);
    }

    public async Task<UserAccountDto?> UpdateStatusAsync(
        int id,
        UpdateUserStatusRequest request,
        CancellationToken cancellationToken = default)
    {
        var account = await _dbContext.UserAccounts
            .Include(user => user.Employee)
            .FirstOrDefaultAsync(user => user.Id == id, cancellationToken);

        if (account is null)
        {
            return null;
        }

        account.IsActive = request.IsActive;
        account.Employee.IsActive = request.IsActive;
        account.UpdatedAt = DateTimeOffset.UtcNow;
        account.Employee.UpdatedAt = account.UpdatedAt;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(account);
    }

    private static string NormalizeRole(string role)
    {
        var normalizedRole = AppRoles.Normalize(role);

        if (!AppRoles.IsKnown(normalizedRole))
        {
            throw new InvalidOperationException($"Role '{role}' is not supported.");
        }

        return normalizedRole;
    }

    private static string NormalizeUsername(string username) =>
        username.Trim().ToLowerInvariant();

    private static UserAccountDto ToDto(UserAccount account) =>
        new(
            account.Id,
            account.EmployeeId,
            account.Employee.FullName,
            account.Employee.Phone,
            account.Employee.Email,
            account.Username,
            account.Role,
            account.IsActive && account.Employee.IsActive,
            account.CreatedAt,
            account.UpdatedAt);
}
