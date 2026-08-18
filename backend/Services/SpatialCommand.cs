using System.Data;
using System.Data.Common;
using Microsoft.EntityFrameworkCore;
using VehicleTrackingSystem.Data;

namespace VehicleTrackingSystem.Services;

public static class SpatialCommand
{
    public static bool IsOracle(IConfiguration configuration) =>
        string.Equals(
            configuration.GetValue<string>("DatabaseProvider"),
            "Oracle",
            StringComparison.OrdinalIgnoreCase);

    public static async Task<DbConnection> OpenConnectionAsync(
        VehicleTrackingDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var connection = dbContext.Database.GetDbConnection();

        if (connection.State != ConnectionState.Open)
        {
            await connection.OpenAsync(cancellationToken);
        }

        return connection;
    }

    public static DbParameter AddParameter(
        this DbCommand command,
        string name,
        object? value,
        DbType? dbType = null)
    {
        var parameter = command.CreateParameter();
        parameter.ParameterName = name;
        parameter.Value = value ?? DBNull.Value;

        if (dbType.HasValue)
        {
            parameter.DbType = dbType.Value;
        }

        command.Parameters.Add(parameter);
        return parameter;
    }
}
