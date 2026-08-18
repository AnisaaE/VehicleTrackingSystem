using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using VehicleTrackingSystem.Data;

#nullable disable

namespace VehicleTrackingSystem.Migrations.PostgreSql
{
    /// <inheritdoc />
    [DbContext(typeof(PostgreSqlVehicleTrackingDbContext))]
    [Migration("20260819093000_AddOsmKocaeliFireStations")]
    public partial class AddOsmKocaeliFireStations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                INSERT INTO facilities (name, code, facility_type, location, boundary)
                VALUES
                ('Yangin Istasyonu', 'OSM_WAY_191006114', 'FIRE_STATION',
                    ST_SetSRID(ST_MakePoint(30.098752, 40.738183), 4326),
                    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[30.0986445,40.7380463],[30.0988538,40.738027],[30.098912,40.7383886],[30.0987027,40.7384079],[30.0986445,40.7380463]]]}'), 4326)),
                ('KBB Itfaiyesi Yahya Kaptan Mufrezesi', 'OSM_WAY_860024397', 'FIRE_STATION',
                    ST_SetSRID(ST_MakePoint(29.971127, 40.775973), 4326),
                    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[29.9711663,40.7757993],[29.9713118,40.776181],[29.9710685,40.7762336],[29.9709245,40.7758516],[29.9711663,40.7757993]]]}'), 4326)),
                ('KBB Yahya Kaptan Itfaiye Mufrezesi', 'OSM_WAY_865735959', 'FIRE_STATION',
                    ST_SetSRID(ST_MakePoint(29.970784, 40.775962), 4326),
                    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[29.970634,40.7763504],[29.970593,40.7762402],[29.9704347,40.7758169],[29.9704736,40.775769],[29.970496,40.775739],[29.9705133,40.7757157],[29.9705313,40.7756958],[29.9710764,40.7755818],[29.9711091,40.7756716],[29.9711663,40.7757993],[29.9713118,40.776181],[29.9713269,40.7762206],[29.9706814,40.7763415],[29.970634,40.7763504]]]}'), 4326)),
                ('Kocaeli Itfaiye Istasyonu 885157801', 'OSM_WAY_885157801', 'FIRE_STATION',
                    ST_SetSRID(ST_MakePoint(29.550981, 40.792346), 4326),
                    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[29.550876,40.7923243],[29.5509837,40.7922521],[29.5511345,40.7923779],[29.5510329,40.7924525],[29.550876,40.7923243]]]}'), 4326)),
                ('Bagcesme Itfaiye Mufrezesi', 'OSM_WAY_1092123383', 'FIRE_STATION',
                    ST_SetSRID(ST_MakePoint(29.920996, 40.771164), 4326),
                    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[29.9212003,40.7711624],[29.9210792,40.7713015],[29.92086,40.771192],[29.9208809,40.7711642],[29.920825,40.7711402],[29.9209295,40.7710272],[29.9212003,40.7711624]]]}'), 4326)),
                ('Kocaeli Itfaiye Istasyonu 1111543569', 'OSM_WAY_1111543569', 'FIRE_STATION',
                    ST_SetSRID(ST_MakePoint(29.397652, 40.796625), 4326),
                    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[29.397396,40.7963071],[29.3978304,40.7963328],[29.3979374,40.7963336],[29.3978471,40.7968909],[29.3978004,40.7969333],[29.3976463,40.796951],[29.3973621,40.7969439],[29.397396,40.7963071]]]}'), 4326)),
                ('Kocaeli Itfaiyesi', 'OSM_WAY_1238092449', 'FIRE_STATION',
                    ST_SetSRID(ST_MakePoint(29.948385, 40.752811), 4326),
                    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[29.9471607,40.7529165],[29.9471221,40.7528457],[29.9471263,40.7527558],[29.9483125,40.7520546],[29.9483805,40.7520139],[29.9486047,40.7522251],[29.9491564,40.7519118],[29.9492414,40.7522133],[29.9492819,40.7524434],[29.9492723,40.7528067],[29.9492221,40.7530322],[29.9491371,40.7532261],[29.9490589,40.7533458],[29.9489245,40.7533773],[29.9487776,40.7533581],[29.9486731,40.7532996],[29.9485614,40.7532259],[29.9483163,40.753114],[29.9473635,40.7529872],[29.9472283,40.7529579],[29.9471607,40.7529165]]]}'), 4326)),
                ('Derince Itfaiye Mufrezesi', 'OSM_WAY_1239702072', 'FIRE_STATION',
                    ST_SetSRID(ST_MakePoint(29.815188, 40.757978), 4326),
                    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[29.8151232,40.7580663],[29.8151206,40.7578476],[29.8152841,40.7578438],[29.8152867,40.7580663],[29.8151232,40.7580663]]]}'), 4326)),
                ('Kocaeli Itfaiye Istasyonu 1239702074', 'OSM_WAY_1239702074', 'FIRE_STATION',
                    ST_SetSRID(ST_MakePoint(29.815307, 40.757865), 4326),
                    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[29.8151219,40.7581215],[29.8151232,40.7580663],[29.8151206,40.7578476],[29.8150732,40.7575502],[29.8152798,40.7575445],[29.8152773,40.7575719],[29.8152803,40.7577325],[29.8157248,40.7577364],[29.81573,40.7581079],[29.8155257,40.7581125],[29.8151219,40.7581215]]]}'), 4326)),
                ('Korfez Hereke Itfaiye Mufrezesi', 'OSM_WAY_1307748899', 'FIRE_STATION',
                    ST_SetSRID(ST_MakePoint(29.620974, 40.785400), 4326),
                    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[29.6206696,40.785455],[29.6207088,40.7854087],[29.6210158,40.7850782],[29.6212633,40.7851561],[29.6214078,40.7852921],[29.6212333,40.785384],[29.6211863,40.7854087],[29.6211474,40.7854292],[29.6209504,40.7855329],[29.6208827,40.7855792],[29.6207586,40.7855229],[29.6207679,40.7854982],[29.6206696,40.785455]]]}'), 4326)),
                ('Korfez Belediye Itfaiye Grup Amirligi', 'OSM_WAY_1395849075', 'FIRE_STATION',
                    ST_SetSRID(ST_MakePoint(29.774644, 40.766738), 4326),
                    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[29.7745809,40.7668111],[29.774517,40.7667016],[29.7747389,40.7666274],[29.7748028,40.766737],[29.7745809,40.7668111]]]}'), 4326)),
                ('Itfaiye', 'OSM_NODE_5294175810', 'FIRE_STATION',
                    ST_SetSRID(ST_MakePoint(29.3785265, 40.7753719), 4326),
                    NULL),
                ('Kocaeli Buyuksehir Belediyesi Itfaiye Dairesi Baskanligi', 'OSM_NODE_9787549564', 'FIRE_STATION',
                    ST_SetSRID(ST_MakePoint(29.9486193, 40.7527005), 4326),
                    NULL);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DELETE FROM route_requests
                WHERE from_facility_id IN (
                    SELECT id FROM facilities WHERE code LIKE 'OSM_WAY_%' OR code LIKE 'OSM_NODE_%'
                );
                """);

            migrationBuilder.Sql("DELETE FROM facilities WHERE code LIKE 'OSM_WAY_%' OR code LIKE 'OSM_NODE_%';");
        }
    }
}
