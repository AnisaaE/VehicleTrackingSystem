import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  CarFront,
  Clock3,
  Cross,
  Flame,
  Gauge,
  LocateFixed,
  MapPin,
  Navigation,
  Search,
  Warehouse
} from 'lucide-react';
import { GeoJSON, MapContainer, Marker, Polyline, Popup, TileLayer, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import { appConfig } from '../config';
import { fetchFacilities, fetchRoute } from '../api';
import { AppLayout } from '../components/AppLayout';
import { useVehicleLocations } from '../useVehicleLocations';

function createVehicleIcon(iconUrl, className = '') {
  return new L.Icon({
    iconUrl,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -23],
    className
  });
}

const vehicleIcons = {
  AMBULANCE: createVehicleIcon('/markers/ambulance.png'),
  FIRE_TRUCK: createVehicleIcon('/markers/fire-truck.png'),
  GARBAGE_TRUCK: createVehicleIcon('/markers/garbage-truck.png'),
  WORK_MACHINE: createVehicleIcon('/markers/work-machine.png'),
  SWEEPER: createVehicleIcon('/markers/sweeper.png'),
  DEFAULT: createVehicleIcon('/markers/default-vihacle.png')
};

const vehicleTypeLabels = {
  AMBULANCE: 'Ambulans',
  FIRE_TRUCK: 'Itfaiye Araci',
  GARBAGE_TRUCK: 'Cop Kamyonu',
  WORK_MACHINE: 'Is Makinesi',
  SWEEPER: 'Supurge Araci'
};

const facilityTypeLabels = {
  FIRE_STATION: 'Itfaiye',
  HOSPITAL: 'Hastane',
  GARAGE: 'Garaj',
  DEPOT: 'Depo'
};

const facilityMarkerColors = {
  FIRE_STATION: '#dc2626',
  HOSPITAL: '#2563eb',
  GARAGE: '#0f766e',
  DEPOT: '#ca8a04',
  UNKNOWN: '#64748b'
};

const facilityBoundaryStyles = {
  FIRE_STATION: { color: '#dc2626', weight: 2, fillOpacity: 0.1 },
  HOSPITAL: { color: '#2563eb', weight: 2, fillOpacity: 0.1 },
  GARAGE: { color: '#0f766e', weight: 2, fillOpacity: 0.1 },
  DEPOT: { color: '#ca8a04', weight: 2, fillOpacity: 0.1 }
};

function parseGeometry(value) {
  if (!value) {
    return null;
  }

  return typeof value === 'string' ? JSON.parse(value) : value;
}

function pointToLatLng(geoJson) {
  const geometry = parseGeometry(geoJson);

  if (!geometry || geometry.type !== 'Point') {
    return null;
  }

  return [geometry.coordinates[1], geometry.coordinates[0]];
}

function routeToPositions(route) {
  const geometry = parseGeometry(route?.geometry);

  if (!geometry || geometry.type !== 'LineString') {
    return [];
  }

  return geometry.coordinates.map(coordinate => [coordinate[1], coordinate[0]]);
}

function normalizeType(value, fallback = 'UNKNOWN') {
  return value
    ?.toString()
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toUpperCase() || fallback;
}

function normalizePlate(value) {
  return value.replace(/\s|-/g, '').toUpperCase();
}

function getVehicleKey(vehicle) {
  return `${vehicle.provider}:${vehicle.plate}`;
}

function formatDistance(value) {
  if (!Number.isFinite(value)) {
    return '-';
  }

  return value >= 1000 ? `${(value / 1000).toFixed(1)} km` : `${Math.round(value)} m`;
}

function formatDuration(value) {
  if (!Number.isFinite(value)) {
    return '-';
  }

  return `${Math.max(1, Math.round(value / 60))} dk`;
}

function formatConnectionStatus(status) {
  const labels = {
    connecting: 'Baglaniyor',
    connected: 'Bagli',
    reconnecting: 'Yeniden baglaniyor',
    disconnected: 'Baglanti yok'
  };

  return labels[status] ?? status;
}

function formatVehicleTypeLabel(value) {
  const normalizedType = normalizeType(value, 'DEFAULT');

  return vehicleTypeLabels[normalizedType] ?? value ?? 'Diger';
}

function formatFacilityTypeLabel(value) {
  const normalizedType = normalizeType(value);

  return facilityTypeLabels[normalizedType] ?? value ?? 'Diger';
}

function getFacilityIcon(facilityType) {
  const normalizedType = normalizeType(facilityType);

  if (normalizedType === 'HOSPITAL') {
    return Cross;
  }

  if (normalizedType === 'FIRE_STATION') {
    return Flame;
  }

  if (normalizedType === 'GARAGE') {
    return Warehouse;
  }

  return Building2;
}

function getFacilityColor(facilityType) {
  return facilityMarkerColors[normalizeType(facilityType)] ?? facilityMarkerColors.UNKNOWN;
}

function getFacilityBoundaryStyle(facilityType) {
  return facilityBoundaryStyles[normalizeType(facilityType)] ?? facilityBoundaryStyles.DEPOT;
}

function createFacilityMarkerIcon(facility, isSelected) {
  const normalizedType = normalizeType(facility.facilityType);
  const color = getFacilityColor(facility.facilityType);

  return L.divIcon({
    className: `facility-map-marker ${isSelected ? 'selected' : ''}`,
    html: `<span style="--marker-color:${color}">${normalizedType === 'HOSPITAL' ? '+' : ''}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -16]
  });
}

function getVehicleIcon(vehicle, isSelected = false) {
  const icon = vehicleIcons[normalizeType(vehicle.vehicleType, 'DEFAULT')] ?? vehicleIcons.DEFAULT;

  if (!isSelected) {
    return icon;
  }

  return createVehicleIcon(icon.options.iconUrl, 'selected-vehicle-marker');
}

function NearbyMapFocus({ facilities, vehicles }) {
  const map = useMap();
  const hasFitInitialBounds = useRef(false);

  useEffect(() => {
    if (hasFitInitialBounds.current) {
      return;
    }

    const positions = [
      ...facilities.map(facility => pointToLatLng(facility.location)).filter(Boolean),
      ...vehicles.map(vehicle => [vehicle.latitude, vehicle.longitude])
    ];

    if (positions.length > 0) {
      map.fitBounds(L.latLngBounds(positions), { padding: [40, 40], maxZoom: 13 });
      hasFitInitialBounds.current = true;
    }
  }, [facilities, map, vehicles]);

  return null;
}

function NearbyMap({
  facilities,
  vehicles,
  selectedFacility,
  selectedVehicle,
  selectedRoute,
  onSelectFacility,
  onSelectVehicle
}) {
  const routePositions = routeToPositions(selectedRoute);

  return (
    <MapContainer center={appConfig.mapCenter} zoom={appConfig.mapZoom} className="vehicle-map" scrollWheelZoom zoomControl={false}>
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ZoomControl position="topright" />
      <NearbyMapFocus
        facilities={facilities}
        vehicles={vehicles}
      />

      {facilities.map(facility => {
        const position = pointToLatLng(facility.location);
        const boundary = parseGeometry(facility.boundary);
        const isSelected = selectedFacility?.id === facility.id;

        return (
          <Fragment key={facility.id}>
            {boundary && <GeoJSON data={boundary} style={getFacilityBoundaryStyle(facility.facilityType)} />}
            {position && (
              <Marker
                position={position}
                icon={createFacilityMarkerIcon(facility, isSelected)}
                zIndexOffset={isSelected ? 1000 : 0}
                eventHandlers={{ click: () => onSelectFacility(String(facility.id)) }}
              >
                <Popup>
                  <strong>{facility.name}</strong>
                  <span>{formatFacilityTypeLabel(facility.facilityType)}</span>
                </Popup>
              </Marker>
            )}
          </Fragment>
        );
      })}

      {routePositions.length > 0 && (
        <Polyline positions={routePositions} pathOptions={{ color: '#2563eb', weight: 5 }} />
      )}

      {vehicles.map(vehicle => {
        const vehicleKey = getVehicleKey(vehicle);
        const isSelected = selectedVehicle && getVehicleKey(selectedVehicle) === vehicleKey;

        return (
          <Marker
            key={vehicleKey}
            position={[vehicle.latitude, vehicle.longitude]}
            icon={getVehicleIcon(vehicle, isSelected)}
            zIndexOffset={isSelected ? 1100 : 0}
            eventHandlers={{ click: () => onSelectVehicle(vehicleKey) }}
          >
            <Popup>
              <strong>{vehicle.plate}</strong>
              <span>{formatVehicleTypeLabel(vehicle.vehicleType)}</span>
              <span>{vehicle.speed} km/h</span>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

export function NearestVehiclesPage({ currentUser, municipalityName, onLogout }) {
  const [selectedProviderCode, setSelectedProviderCode] = useState(appConfig.defaultProviderCode);
  const { vehicles, providers, connectionStatus, lastUpdatedAt, error: vehicleError } =
    useVehicleLocations(selectedProviderCode);
  const [facilities, setFacilities] = useState([]);
  const [facilitySearchTerm, setFacilitySearchTerm] = useState('');
  const [selectedFacilityId, setSelectedFacilityId] = useState('');
  const [selectedVehicleType, setSelectedVehicleType] = useState('');
  const [selectedVehicleKey, setSelectedVehicleKey] = useState('');
  const [nearestRoutes, setNearestRoutes] = useState([]);
  const [routeError, setRouteError] = useState(null);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [isRouteRefreshing, setIsRouteRefreshing] = useState(false);
  const routeRequestRef = useRef(0);
  const filteredVehiclesRef = useRef([]);

  useEffect(() => {
    fetchFacilities()
      .then(nextFacilities => {
        setFacilities(nextFacilities);

        const firstHospital = nextFacilities.find(facility => normalizeType(facility.facilityType) === 'HOSPITAL');
        setSelectedFacilityId(current => current || String(firstHospital?.id ?? nextFacilities[0]?.id ?? ''));
      })
      .catch(nextError => setRouteError(nextError.message));
  }, []);

  const availableVehicleTypes = useMemo(() => {
    const typesByCode = new Map();

    vehicles.forEach(vehicle => {
      const code = normalizeType(vehicle.vehicleType, 'DEFAULT');

      if (!typesByCode.has(code)) {
        typesByCode.set(code, {
          code,
          label: formatVehicleTypeLabel(vehicle.vehicleType),
          count: 0
        });
      }

      typesByCode.get(code).count += 1;
    });

    return Array.from(typesByCode.values()).sort((first, second) =>
      first.label.localeCompare(second.label, 'tr')
    );
  }, [vehicles]);

  const visibleFacilities = useMemo(() => {
    const normalizedSearch = facilitySearchTerm.trim().toLocaleLowerCase('tr-TR');

    return facilities.filter(facility =>
      !normalizedSearch ||
      facility.name?.toLocaleLowerCase('tr-TR').includes(normalizedSearch) ||
      facility.code?.toLocaleLowerCase('tr-TR').includes(normalizedSearch) ||
      formatFacilityTypeLabel(facility.facilityType).toLocaleLowerCase('tr-TR').includes(normalizedSearch)
    );
  }, [facilities, facilitySearchTerm]);

  const selectedFacility = useMemo(
    () => facilities.find(facility => String(facility.id) === String(selectedFacilityId)) ?? null,
    [facilities, selectedFacilityId]
  );

  const filteredVehicles = useMemo(
    () => vehicles.filter(vehicle =>
      !selectedVehicleType || normalizeType(vehicle.vehicleType, 'DEFAULT') === selectedVehicleType
    ),
    [selectedVehicleType, vehicles]
  );

  useEffect(() => {
    filteredVehiclesRef.current = filteredVehicles;
  }, [filteredVehicles]);

  const selectedVehicle = useMemo(
    () => filteredVehicles.find(vehicle => getVehicleKey(vehicle) === selectedVehicleKey) ?? nearestRoutes[0]?.vehicle ?? null,
    [filteredVehicles, nearestRoutes, selectedVehicleKey]
  );

  const selectedRoute = useMemo(
    () => nearestRoutes.find(item => getVehicleKey(item.vehicle) === getVehicleKey(selectedVehicle ?? {}))?.route ?? nearestRoutes[0]?.route ?? null,
    [nearestRoutes, selectedVehicle]
  );

  const bestByType = useMemo(() => {
    const bestRoutes = new Map();

    nearestRoutes.forEach(routeResult => {
      const type = normalizeType(routeResult.vehicle.vehicleType, 'DEFAULT');
      const current = bestRoutes.get(type);

      if (!current || routeResult.route.durationSeconds < current.route.durationSeconds) {
        bestRoutes.set(type, routeResult);
      }
    });

    return Array.from(bestRoutes.values()).sort((first, second) =>
      first.route.durationSeconds - second.route.durationSeconds
    );
  }, [nearestRoutes]);

  useEffect(() => {
    setSelectedVehicleKey('');
  }, [selectedFacilityId, selectedVehicleType]);

  const refreshNearestRoutes = useCallback(async ({ showLoading = false } = {}) => {
    const currentVehicles = filteredVehiclesRef.current;

    if (!selectedFacility || currentVehicles.length === 0) {
      setNearestRoutes([]);
      setIsRouteLoading(false);
      setIsRouteRefreshing(false);
      return;
    }

    const targetPosition = pointToLatLng(selectedFacility.location);
    if (!targetPosition) {
      setNearestRoutes([]);
      setRouteError('Secilen tesisin konum bilgisi yok.');
      return;
    }

    const requestId = routeRequestRef.current + 1;
    routeRequestRef.current = requestId;
    setIsRouteLoading(showLoading);
    setIsRouteRefreshing(!showLoading);
    setRouteError(null);

    try {
      const routeResults = await Promise.all(
        currentVehicles.map(async vehicle => {
          try {
            const route = await fetchRoute({
              fromLat: vehicle.latitude,
              fromLon: vehicle.longitude,
              toLat: targetPosition[0],
              toLon: targetPosition[1],
              vehiclePlate: vehicle.plate,
              providerCode: vehicle.provider
            });

            return { vehicle, route, error: null };
          } catch (nextError) {
            return { vehicle, route: null, error: nextError.message };
          }
        })
      );

      if (routeRequestRef.current !== requestId) {
        return;
      }

      const successfulRoutes = routeResults
        .filter(routeResult => routeResult.route)
        .sort((first, second) => first.route.durationSeconds - second.route.durationSeconds);

      setNearestRoutes(successfulRoutes);
      setIsRouteLoading(false);
      setIsRouteRefreshing(false);

      if (successfulRoutes.length === 0 && routeResults.length > 0) {
        setRouteError(routeResults.find(routeResult => routeResult.error)?.error ?? 'Rota hesaplanamadi.');
      }
    } catch (nextError) {
      if (routeRequestRef.current === requestId) {
        setRouteError(nextError.message);
      }
    } finally {
      if (routeRequestRef.current === requestId) {
        setIsRouteLoading(false);
        setIsRouteRefreshing(false);
      }
    }
  }, [selectedFacility]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      refreshNearestRoutes({ showLoading: true });
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [
    filteredVehicles.length,
    refreshNearestRoutes,
    selectedFacilityId,
    selectedProviderCode,
    selectedVehicleType
  ]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      refreshNearestRoutes({ showLoading: false });
    }, 8000);

    return () => window.clearInterval(intervalId);
  }, [refreshNearestRoutes]);

  const handleSelectFacility = useCallback(facilityId => {
    setSelectedFacilityId(facilityId);
  }, []);

  const selectedProviderName = selectedProviderCode
    ? providers.find(provider => provider.code === selectedProviderCode)?.name ?? selectedProviderCode
    : 'Tumu';

  return (
    <AppLayout
      activePage="nearest"
      connectionLabel={formatConnectionStatus(connectionStatus)}
      connectionStatus={connectionStatus}
      headerIcon={LocateFixed}
      lastUpdatedAt={lastUpdatedAt}
      municipalityName={municipalityName}
      onLogout={onLogout}
      title="Yakindaki Araclar"
      user={currentUser}
    >
      <section className="nearest-dashboard">
        <aside className="workspace-panel nearest-facilities-panel">
          <div className="panel-heading">
            <div>
              <span>Konum Secimi</span>
              <h2>Tesisler</h2>
            </div>
            <strong>{visibleFacilities.length}</strong>
          </div>

          <div className="search-box panel-search">
            <Search size={17} />
            <input
              value={facilitySearchTerm}
              onChange={event => setFacilitySearchTerm(event.target.value)}
              placeholder="Hastane veya tesis ara..."
            />
          </div>

          <div className="facility-list">
            {visibleFacilities.length === 0 ? (
              <div className="empty-panel-state">
                <strong>Konum bulunamadi</strong>
                <span>Arama metniyle eslesen tesis yok.</span>
              </div>
            ) : (
              visibleFacilities.map(facility => {
                const Icon = getFacilityIcon(facility.facilityType);
                const isSelected = selectedFacility?.id === facility.id;

                return (
                  <button
                    key={facility.id}
                    className={`facility-row ${isSelected ? 'selected' : ''}`}
                    type="button"
                    onClick={() => handleSelectFacility(String(facility.id))}
                  >
                    <span className="facility-row-icon" style={{ '--facility-color': getFacilityColor(facility.facilityType) }}>
                      <Icon size={18} />
                    </span>
                    <span>
                      <strong>{facility.name}</strong>
                      <small>{facility.code}</small>
                      <em>{formatFacilityTypeLabel(facility.facilityType)}</em>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="map-stage nearest-map-stage">
          <NearbyMap
            facilities={visibleFacilities}
            vehicles={filteredVehicles}
            selectedFacility={selectedFacility}
            selectedVehicle={selectedVehicle}
            selectedRoute={selectedRoute}
            onSelectFacility={handleSelectFacility}
            onSelectVehicle={setSelectedVehicleKey}
          />

          {selectedFacility && nearestRoutes[0] && (
            <div className="route-map-badge nearest-map-badge">
              <strong>{formatDuration(nearestRoutes[0].route.durationSeconds)}</strong>
              <span>{nearestRoutes[0].vehicle.plate}</span>
            </div>
          )}

          {vehicleError && (
            <div className="system-toast error">
              <strong>Arac verisi</strong>
              <span>{vehicleError}</span>
            </div>
          )}

          {routeError && (
            <div className="system-toast error">
              <strong>Rota bildirimi</strong>
              <span>{routeError}</span>
            </div>
          )}
        </section>

        <aside className="workspace-panel nearest-results-panel">
          <div className="details-heading">
            <div>
              <span>En Yakin Araclar</span>
              <h2>{selectedFacility?.name ?? 'Konum secin'}</h2>
            </div>
            <Navigation size={22} />
          </div>

          <label className="field-stack panel-field compact-field">
            <span>Takip Saglayicisi</span>
            <select value={selectedProviderCode} onChange={event => setSelectedProviderCode(event.target.value)}>
              <option value="">Tumu</option>
              {providers
                .filter(provider => provider.isActive)
                .map(provider => (
                  <option key={provider.code} value={provider.code}>{provider.name}</option>
                ))}
            </select>
          </label>

          <label className="field-stack panel-field compact-field">
            <span>Arac Turu</span>
            <select value={selectedVehicleType} onChange={event => setSelectedVehicleType(event.target.value)}>
              <option value="">Tum arac turleri</option>
              {availableVehicleTypes.map(vehicleType => (
                <option key={vehicleType.code} value={vehicleType.code}>
                  {vehicleType.label} ({vehicleType.count})
                </option>
              ))}
            </select>
          </label>

          <div className="nearest-summary-grid">
            <div>
              <Clock3 size={18} />
              <span>En yakin sure</span>
              <strong>{isRouteLoading ? 'Hesaplaniyor' : formatDuration(nearestRoutes[0]?.route.durationSeconds)}</strong>
            </div>
            <div>
              <CarFront size={18} />
              <span>Uygun arac</span>
              <strong>{filteredVehicles.length}</strong>
            </div>
          </div>

          {isRouteRefreshing && (
            <div className="nearest-refresh-note">
              <Clock3 size={15} />
              <span>Sureler arka planda guncelleniyor.</span>
            </div>
          )}

          {bestByType.length > 0 && (
            <section className="nearest-type-leaders">
              <h3>Turune gore en yakin</h3>
              {bestByType.map(routeResult => (
                <button
                  key={getVehicleKey(routeResult.vehicle)}
                  type="button"
                  onClick={() => {
                    setSelectedVehicleType(normalizeType(routeResult.vehicle.vehicleType, 'DEFAULT'));
                    setSelectedVehicleKey(getVehicleKey(routeResult.vehicle));
                  }}
                >
                  <span>{formatVehicleTypeLabel(routeResult.vehicle.vehicleType)}</span>
                  <strong>{formatDuration(routeResult.route.durationSeconds)}</strong>
                </button>
              ))}
            </section>
          )}

          <div className="nearest-list">
            {isRouteLoading ? (
              <div className="empty-panel-state">
                <strong>Rotalar hesaplaniyor</strong>
                <span>Secilen konuma gore arac sureleri yenileniyor.</span>
              </div>
            ) : nearestRoutes.length === 0 ? (
              <div className="empty-panel-state">
                <strong>Sonuc yok</strong>
                <span>{selectedProviderName} icin bu filtrede rota bulunamadi.</span>
              </div>
            ) : (
              nearestRoutes.map((routeResult, index) => (
                <button
                  key={getVehicleKey(routeResult.vehicle)}
                  className={`nearest-result-row ${selectedVehicleKey === getVehicleKey(routeResult.vehicle) ? 'selected' : ''}`}
                  type="button"
                  onClick={() => setSelectedVehicleKey(getVehicleKey(routeResult.vehicle))}
                >
                  <strong>{index + 1}</strong>
                  <div>
                    <span>{routeResult.vehicle.plate}</span>
                    <small>{formatVehicleTypeLabel(routeResult.vehicle.vehicleType)}</small>
                  </div>
                  <div>
                    <em>{formatDuration(routeResult.route.durationSeconds)}</em>
                    <small>{formatDistance(routeResult.route.distanceMeters)}</small>
                  </div>
                </button>
              ))
            )}
          </div>

          {selectedVehicle && (
            <section className="nearest-selected-card">
              <CarFront size={22} />
              <div>
                <span>Secili arac</span>
                <strong>{selectedVehicle.plate}</strong>
                <small>{selectedVehicle.vehicleName}</small>
              </div>
              <div>
                <Gauge size={16} />
                <strong>{selectedVehicle.speed} km/h</strong>
              </div>
            </section>
          )}
        </aside>
      </section>
    </AppLayout>
  );
}
