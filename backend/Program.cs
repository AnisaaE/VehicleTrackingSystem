using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication;
using Microsoft.OpenApi.Models;
using VehicleTrackingSystem.Auth;
using VehicleTrackingSystem.Data;
using VehicleTrackingSystem.Hubs;
using VehicleTrackingSystem.Interfaces;
using VehicleTrackingSystem.Options;
using VehicleTrackingSystem.Services;
using VehicleTrackingSystem.TrackingProviders;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);
builder.Logging.ClearProviders();
builder.Logging.AddConsole();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "Token",
        In = ParameterLocation.Header,
        Description = "Enter the token returned by /api/auth/login."
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            []
        }
    });
});
builder.Services.AddSignalR();
builder.Services.AddMemoryCache();
builder.Services.AddAuthentication(TokenAuthenticationHandler.SchemeName)
    .AddScheme<AuthenticationSchemeOptions, TokenAuthenticationHandler>(
        TokenAuthenticationHandler.SchemeName,
        _ => { });
builder.Services.AddAuthorization();
builder.Services.Configure<TrackingProviderCredentialsOptions>(
    builder.Configuration.GetSection(TrackingProviderCredentialsOptions.SectionName));
builder.Services.Configure<GeocodingOptions>(
    builder.Configuration.GetSection(GeocodingOptions.SectionName));
builder.Services.Configure<RoutingOptions>(
    builder.Configuration.GetSection(RoutingOptions.SectionName));
builder.Services.Configure<AuthOptions>(
    builder.Configuration.GetSection(AuthOptions.SectionName));
builder.Services.AddCors(options =>
{
    var allowedOrigins = builder.Configuration
        .GetSection("Cors:AllowedOrigins")
        .Get<string[]>()
        ?? [];

    if (allowedOrigins.Length == 0)
    {
        throw new InvalidOperationException(
            "Cors:AllowedOrigins must contain at least one frontend origin.");
    }

    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials());
});

var databaseProvider = builder.Configuration.GetValue<string>("DatabaseProvider") ?? "PostgreSQL";

if (databaseProvider.Equals("Oracle", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddDbContext<OracleVehicleTrackingDbContext>(options =>
        options.UseOracle(builder.Configuration.GetConnectionString("OracleConnection")
            ?? builder.Configuration.GetConnectionString("DefaultConnection")));

    builder.Services.AddScoped<VehicleTrackingDbContext>(serviceProvider =>
        serviceProvider.GetRequiredService<OracleVehicleTrackingDbContext>());
}
else if (databaseProvider.Equals("PostgreSQL", StringComparison.OrdinalIgnoreCase)
    || databaseProvider.Equals("Postgres", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddDbContext<PostgreSqlVehicleTrackingDbContext>(options =>
        options.UseNpgsql(builder.Configuration.GetConnectionString("PostgreSqlConnection")
            ?? builder.Configuration.GetConnectionString("DefaultConnection")));

    builder.Services.AddScoped<VehicleTrackingDbContext>(serviceProvider =>
        serviceProvider.GetRequiredService<PostgreSqlVehicleTrackingDbContext>());
}
else
{
    throw new InvalidOperationException(
        $"Unsupported DatabaseProvider '{databaseProvider}'. Use 'Oracle' or 'PostgreSQL'.");
}

builder.Services.AddScoped<IProviderService, ProviderService>();
builder.Services.AddScoped<IVehicleTypeService, VehicleTypeService>();
builder.Services.AddScoped<IVehicleService, VehicleService>();
builder.Services.AddScoped<IVehicleLocationService, VehicleLocationService>();
builder.Services.AddScoped<IVehicleLocationMapper, VehicleLocationMapper>();
builder.Services.AddScoped<IVehicleTrackingProviderResolver, VehicleTrackingProviderResolver>();
builder.Services.AddScoped<ITrackingProviderCredentialService, TrackingProviderCredentialService>();
builder.Services.AddScoped<IFacilityService, FacilityService>();
builder.Services.AddScoped<IDestinationService, DestinationService>();
builder.Services.AddScoped<IEmployeeService, EmployeeService>();
builder.Services.AddScoped<IVehicleTripService, VehicleTripService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserAccountService, UserAccountService>();
builder.Services.AddSingleton<IAuthTokenService, AuthTokenService>();
builder.Services.AddSingleton<IFacilityGeofenceService, FacilityGeofenceService>();
builder.Services.AddHttpClient<IGeocodingService, NominatimGeocodingService>();
builder.Services.AddHttpClient<IRoutingService, OsrmRoutingService>();
builder.Services.AddHostedService<VehicleLocationBroadcastService>();

builder.Services.AddScoped<IVehicleTrackingProvider, ArventoTrackingProvider>();
builder.Services.AddScoped<IVehicleTrackingProvider, SampasTrackingProvider>();
builder.Services.AddScoped<IVehicleTrackingProvider, MobilizTrackingProvider>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<VehicleTrackingDbContext>();

    await dbContext.Database.MigrateAsync();
    await DatabaseSeeder.SeedAsync(dbContext);
}

app.MapControllers();
app.MapHub<VehicleLocationHub>("/vehicle-location-hub");

app.Run();
