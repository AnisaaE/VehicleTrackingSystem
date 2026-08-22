namespace VehicleTrackingSystem.Auth;

public interface IAuthTokenService
{
    string CreateToken(AuthTokenPayload payload);

    bool TryValidateToken(string token, out AuthTokenPayload payload);
}
