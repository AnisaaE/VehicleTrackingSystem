# Vehicle Tracking System

Vehicle Tracking System is a .NET 8 ASP.NET Core Web API for resolving which GPS provider should be used for each municipal vehicle type. The project uses controller-based endpoints, Entity Framework Core, PostgreSQL, Swagger/OpenAPI, DTOs, and a small service layer.

No real provider API calls are made yet. The Arvento provider returns simulated fire truck locations for the second-stage web map, while Sampas and Mobiliz remain placeholders for future integrations.

## Project Structure

```text
VehicleTrackingSystem/
|-- Controllers/
|   |-- ProvidersController.cs
|   `-- VehicleTypesController.cs
|-- Data/
|   |-- DatabaseSeeder.cs
|   `-- VehicleTrackingDbContext.cs
|-- DTOs/
|   |-- Errors/
|   |-- FieldMappings/
|   |-- Providers/
|   `-- VehicleTypes/
|-- Entities/
|   |-- FieldMapping.cs
|   |-- Provider.cs
|   `-- VehicleType.cs
|-- Interfaces/
|   |-- IProviderService.cs
|   |-- IVehicleTrackingProvider.cs
|   |-- IVehicleTrackingProviderResolver.cs
|   `-- IVehicleTypeService.cs
|-- Migrations/
|   |-- 20260804224737_InitialCreate.cs
|   |-- 20260804224737_InitialCreate.Designer.cs
|   `-- VehicleTrackingDbContextModelSnapshot.cs
|-- Services/
|   |-- ProviderResolutionResult.cs
|   |-- ProviderService.cs
|   |-- VehicleTrackingProviderResolver.cs
|   `-- VehicleTypeService.cs
|-- TrackingProviders/
|   |-- ArventoTrackingProvider.cs
|   |-- MobilizTrackingProvider.cs
|   `-- SampasTrackingProvider.cs
|-- Program.cs
|-- appsettings.json
|-- VehicleTrackingSystem.csproj
`-- VehicleTrackingSystem.http
```

## Architecture

Controllers receive route parameters and return HTTP responses. They do not contain Entity Framework queries or provider selection rules.

Services contain the application logic. `ProviderService` reads providers and field mappings. `VehicleTypeService` reads vehicle types and resolves the configured provider for a vehicle type code.

`VehicleTrackingDbContext` is the EF Core database gateway. In Java terms, it is close to `EntityManager` with Hibernate/JPA. In JavaScript terms, it is close to `PrismaClient` or a Sequelize database context.

DTOs define the API response shape. The controllers return DTOs instead of EF entity objects.

Tracking provider classes implement `IVehicleTrackingProvider`. They are empty now because real provider APIs are out of scope, but they give the resolver a stable extension point.
The Arvento provider also exposes mock current locations for 5 fire trucks, so a frontend can poll the Web API without connecting directly to a provider.

## Database Relationships

```text
Provider
|-- many VehicleTypes
`-- many FieldMappings

VehicleType
`-- one Provider

FieldMapping
`-- one Provider
```

Important constraints:

```text
Provider.Code is unique.
VehicleType.Code is unique.
FieldMapping.ProviderId + FieldMapping.SystemField is unique.
Provider delete behavior is restricted when dependent vehicle types or mappings exist.
```

## PostgreSQL Setup

Create the database locally:

```bash
createdb -U postgres vehicle_tracking_db
```

Or use `psql`:

```sql
CREATE DATABASE vehicle_tracking_db;
```

Open `appsettings.json` and replace `CHANGE_ME` with your real local PostgreSQL password:

```json
"DefaultConnection": "Host=localhost;Port=5432;Database=vehicle_tracking_db;Username=postgres;Password=CHANGE_ME"
```

## Local Commands

Restore packages:

```bash
dotnet restore
```

Build the project:

```bash
dotnet build
```

Install the EF Core CLI tool if it is not already installed:

```bash
dotnet tool install --global dotnet-ef --version 8.0.11
```

Create a migration:

```bash
dotnet ef migrations add InitialCreate
```

Apply migrations:

```bash
dotnet ef database update
```

Run the API:

```bash
dotnet run
```

Open Swagger:

```text
http://localhost:5030/swagger
```

The `https` profile uses:

```text
https://localhost:7236/swagger
```

## Endpoints

```http
GET /api/providers
GET /api/providers/{id}
GET /api/providers/{id}/field-mappings
GET /api/vehicle-types
GET /api/vehicle-types/{id}
GET /api/vehicle-types/{code}/provider
GET /api/vehicles
GET /api/vehicles/{plate}
```

Example Swagger checks:

```http
GET /api/providers
GET /api/providers/1
GET /api/providers/1/field-mappings
GET /api/vehicle-types
GET /api/vehicle-types/1
GET /api/vehicle-types/GARBAGE_TRUCK/provider
GET /api/vehicles
GET /api/vehicles/34%20ITF%20101
```

Expected provider resolution examples from seeded data:

```text
AMBULANCE -> ARVENTO
GARBAGE_TRUCK -> SAMPAS
FIRE_TRUCK -> ARVENTO
WORK_MACHINE -> SAMPAS
SWEEPER -> ARVENTO
```

## Seed Data

`DatabaseSeeder` runs during startup after migrations. It is idempotent: it checks existing provider codes, vehicle type codes, and provider/system field mapping pairs before inserting.

Seeded providers:

```text
ARVENTO
SAMPAS
MOBILIZ
```

Seeded system fields for each provider:

```text
Plate
Latitude
Longitude
Speed
IgnitionOn
Timestamp
```

## Adding a Fourth Provider

To add `TELTONIKA`:

1. Add a `Provider` row with code `TELTONIKA`.
2. Add field mappings for `Plate`, `Latitude`, `Longitude`, `Speed`, and `Timestamp`.
3. Create `TeltonikaTrackingProvider : IVehicleTrackingProvider`.
4. Register it in `Program.cs`:

```csharp
builder.Services.AddScoped<IVehicleTrackingProvider, TeltonikaTrackingProvider>();
```

Existing controllers and vehicle type service logic do not need to change. This follows the Open/Closed Principle: the system is open for adding new provider implementations, but closed for changing the central controller and resolution flow.

## Future Integration Placeholders

These files are intentionally empty integration shells:

```text
TrackingProviders/ArventoTrackingProvider.cs
TrackingProviders/SampasTrackingProvider.cs
TrackingProviders/MobilizTrackingProvider.cs
```

Later, real HTTP calls can be added inside provider-specific classes without adding a large `switch` or hardcoded vehicle-type-to-provider logic.

## Concept Map

```text
ASP.NET Core Controller ~= Spring Boot RestController ~= Express route/controller
Entity Framework Core ~= Hibernate/JPA ~= Prisma/Sequelize
NuGet ~= Maven/Gradle dependencies ~= npm packages
DbContext ~= EntityManager ~= PrismaClient
ASP.NET Core DI ~= Spring Dependency Injection ~= NestJS DI container
```
