using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using VehicleTrackingSystem.Options;

namespace VehicleTrackingSystem.Auth;

public sealed class AuthTokenService : IAuthTokenService
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);

    private readonly AuthOptions _options;

    public AuthTokenService(IOptions<AuthOptions> options)
    {
        _options = options.Value;
    }

    public string CreateToken(AuthTokenPayload payload)
    {
        var payloadJson = JsonSerializer.Serialize(payload, SerializerOptions);
        var payloadPart = Base64UrlEncode(Encoding.UTF8.GetBytes(payloadJson));
        var signaturePart = Sign(payloadPart);

        return $"{payloadPart}.{signaturePart}";
    }

    public bool TryValidateToken(string token, out AuthTokenPayload payload)
    {
        payload = null!;
        var parts = token.Split('.');

        if (parts.Length != 2)
        {
            return false;
        }

        var expectedSignature = Sign(parts[0]);

        if (!FixedTimeEquals(expectedSignature, parts[1]))
        {
            return false;
        }

        try
        {
            var payloadJson = Encoding.UTF8.GetString(Base64UrlDecode(parts[0]));
            var parsedPayload = JsonSerializer.Deserialize<AuthTokenPayload>(payloadJson, SerializerOptions);

            if (parsedPayload is null || parsedPayload.ExpiresAt <= DateTimeOffset.UtcNow)
            {
                return false;
            }

            payload = parsedPayload;
            return true;
        }
        catch
        {
            return false;
        }
    }

    private string Sign(string payloadPart)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_options.TokenSecret));
        return Base64UrlEncode(hmac.ComputeHash(Encoding.UTF8.GetBytes(payloadPart)));
    }

    private static bool FixedTimeEquals(string first, string second)
    {
        var firstBytes = Encoding.UTF8.GetBytes(first);
        var secondBytes = Encoding.UTF8.GetBytes(second);

        return firstBytes.Length == secondBytes.Length &&
            CryptographicOperations.FixedTimeEquals(firstBytes, secondBytes);
    }

    private static string Base64UrlEncode(byte[] value) =>
        Convert.ToBase64String(value)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');

    private static byte[] Base64UrlDecode(string value)
    {
        var base64 = value.Replace('-', '+').Replace('_', '/');
        base64 = base64.PadRight(base64.Length + (4 - base64.Length % 4) % 4, '=');

        return Convert.FromBase64String(base64);
    }
}
