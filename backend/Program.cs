using Microsoft.EntityFrameworkCore;
using VehicleTrackingSystem.Data;
using VehicleTrackingSystem.Hubs;
using VehicleTrackingSystem.Interfaces;
using VehicleTrackingSystem.Options;
using VehicleTrackingSystem.Services;
using VehicleTrackingSystem.TrackingProviders;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSignalR();
builder.Services.Configure<TrackingProviderCredentialsOptions>(
    builder.Configuration.GetSection(TrackingProviderCredentialsOptions.SectionName));
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
builder.Services.AddScoped<IVehicleLocationService, VehicleLocationService>();
builder.Services.AddScoped<IVehicleLocationMapper, VehicleLocationMapper>();
builder.Services.AddScoped<IVehicleTrackingProviderResolver, VehicleTrackingProviderResolver>();
builder.Services.AddScoped<ITrackingProviderCredentialService, TrackingProviderCredentialService>();
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

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<VehicleTrackingDbContext>();

    await dbContext.Database.MigrateAsync();
    await DatabaseSeeder.SeedAsync(dbContext);
}

app.MapControllers();
app.MapHub<VehicleLocationHub>("/vehicle-location-hub");

app.Run();
