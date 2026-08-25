import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Clock3, Gauge, LocateFixed, MapPin, Navigation, Route, Wifi } from 'lucide-react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import { appConfig } from '../config';
import { completeVehicleTrip, fetchMyVehicleTrips, fetchRoute } from '../api';
import { AppLayout } from '../components/AppLayout';
import { useVehicleLocations } from '../useVehicleLocations';

const destinationIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const driverVehicleIcon = L.divIcon({
  className: 'driver-live-vehicle-marker',
  html: '<span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 17h14l-1.2-5.4A3 3 0 0 0 14.9 9H9.1a3 3 0 0 0-2.9 2.6L5 17Z"/><circle cx="8" cy="18" r="2"/><circle cx="16" cy="18" r="2"/><path d="M7 13h10"/></svg></span>',
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  popupAnchor: [0, -22]
});

function normalizePlate(value) {
  return value?.replace(/\s|-/g, '').toUpperCase() ?? '';
}

function parseGeometry(value) {
  if (!value) {
    return null;
  }

  return typeof value === 'string' ? JSON.parse(value) : value;
}

function routeToPositions(route) {
  const geometry = parseGeometry(route?.geometry ?? route?.routeGeometry);

  if (!geometry || geometry.type !== 'LineString') {
    return [];
  }

  return geometry.coordinates.map(coordinate => [coordinate[1], coordinate[0]]);
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

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
}

function MapFocus({ destination, focusKey, positions, vehicle }) {
  const map = useMap();
  const lastFocusKeyRef = useRef(null);

  useEffect(() => {
    if (!focusKey || lastFocusKeyRef.current === focusKey) {
      return;
    }

    const points = [
      ...positions,
      vehicle ? [vehicle.latitude, vehicle.longitude] : null,
      destination ? [destination.latitude, destination.longitude] : null
    ].filter(Boolean);

    if (points.length === 0) {
      return;
    }

    lastFocusKeyRef.current = focusKey;

    if (points.length === 1) {
      map.setView(points[0], Math.max(map.getZoom(), 14));
      return;
    }

    map.fitBounds(L.latLngBounds(points), {
      padding: [42, 42],
      maxZoom: 15
    });
  }, [destination, focusKey, map, positions, vehicle]);

  return null;
}

function DriverRouteMap({ destination, focusKey, route, vehicle }) {
  const positions = useMemo(() => routeToPositions(route), [route]);

  return (
    <MapContainer
      center={appConfig.mapCenter}
      zoom={appConfig.mapZoom}
      className="driver-route-map"
      scrollWheelZoom
      zoomControl={false}
    >
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ZoomControl position="topright" />
      <MapFocus destination={destination} focusKey={focusKey} positions={positions} vehicle={vehicle} />
      {positions.length > 0 && <Polyline positions={positions} pathOptions={{ color: '#2563eb', weight: 6 }} />}
      {destination && (
        <Marker position={[destination.latitude, destination.longitude]} icon={destinationIcon}>
          <Popup>
            <strong>{destination.label}</strong>
          </Popup>
        </Marker>
      )}
      {vehicle && (
        <Marker position={[vehicle.latitude, vehicle.longitude]} icon={driverVehicleIcon} zIndexOffset={1000}>
          <Popup>
            <strong>{vehicle.plate}</strong>
            <span>{vehicle.speed} km/h</span>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}

export function DriverTripsPage({ currentUser, municipalityName, onLogout }) {
  const [trips, setTrips] = useState([]);
  const [liveRoute, setLiveRoute] = useState(null);
  const [routeError, setRouteError] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const routeRequestRef = useRef(0);
  const { vehicles, connectionStatus, lastUpdatedAt, error: locationError } = useVehicleLocations();

  const activeTrip = useMemo(
    () => trips.find(trip => trip.status === 'IN_PROGRESS') ??
      trips.find(trip => trip.status === 'ASSIGNED') ??
      null,
    [trips]
  );
  const selectedVehicle = useMemo(() => {
    if (!activeTrip) {
      return null;
    }

    return vehicles.find(vehicle =>
      vehicle.provider === activeTrip.providerCode &&
      normalizePlate(vehicle.plate) === normalizePlate(activeTrip.vehiclePlate)
    ) ?? null;
  }, [activeTrip, vehicles]);
  const selectedDestination = useMemo(() => activeTrip
    ? {
        latitude: activeTrip.destinationLatitude,
        longitude: activeTrip.destinationLongitude,
        label: activeTrip.destinationName ?? 'Harita hedefi'
      }
    : null,
    [activeTrip]
  );
  const fallbackRoute = useMemo(() => activeTrip?.routeGeometry
    ? {
        geometry: activeTrip.routeGeometry,
        distanceMeters: activeTrip.estimatedDistanceMeters,
        durationSeconds: activeTrip.estimatedDurationSeconds,
        steps: []
      }
    : null,
    [activeTrip]
  );
  const displayedRoute = liveRoute ?? fallbackRoute;
  const nextStep = liveRoute?.steps?.[0] ?? null;

  const loadTrips = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setTrips(await fetchMyVehicleTrips());
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrips();
    const intervalId = window.setInterval(loadTrips, 15000);

    return () => window.clearInterval(intervalId);
  }, [loadTrips]);

  useEffect(() => {
    setLiveRoute(null);
    setRouteError(null);
  }, [activeTrip?.id]);

  useEffect(() => {
    if (!activeTrip || !selectedVehicle) {
      return;
    }

    const requestId = routeRequestRef.current + 1;
    routeRequestRef.current = requestId;

    const timeoutId = window.setTimeout(async () => {
      try {
        const nextRoute = await fetchRoute({
          fromLat: selectedVehicle.latitude,
          fromLon: selectedVehicle.longitude,
          toLat: activeTrip.destinationLatitude,
          toLon: activeTrip.destinationLongitude,
          vehiclePlate: selectedVehicle.plate,
          providerCode: selectedVehicle.provider
        });

        if (routeRequestRef.current === requestId) {
          setLiveRoute(nextRoute);
          setRouteError(null);
        }
      } catch (nextError) {
        if (routeRequestRef.current === requestId) {
          setRouteError(nextError.message);
        }
      }
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [
    activeTrip,
    selectedVehicle?.latitude,
    selectedVehicle?.longitude,
    selectedVehicle?.plate,
    selectedVehicle?.provider
  ]);

  const handleComplete = async () => {
    if (!activeTrip) {
      return;
    }

    try {
      await completeVehicleTrip(activeTrip.id);
      setNotice(`${activeTrip.destinationName ?? 'Gorev'} tamamlandi.`);
      await loadTrips();
    } catch (nextError) {
      setError(nextError.message);
    }
  };

  return (
    <AppLayout
      activePage="driverTrips"
      connectionStatus={connectionStatus}
      headerIcon={Navigation}
      lastUpdatedAt={lastUpdatedAt}
      municipalityName={municipalityName}
      onLogout={onLogout}
      title="Navigasyon"
      user={currentUser}
    >
      <section className="driver-dashboard driver-route-dashboard">
        <section className="map-stage driver-map-stage">
          <DriverRouteMap
            destination={selectedDestination}
            focusKey={activeTrip?.id}
            route={displayedRoute}
            vehicle={selectedVehicle}
          />

          {displayedRoute && (
            <div className="route-map-badge">
              <strong>{formatDuration(displayedRoute.durationSeconds)}</strong>
              <span>{formatDistance(displayedRoute.distanceMeters)}</span>
            </div>
          )}

          {routeError && (
            <div className="system-toast error">
              <strong>Rota bildirimi</strong>
              <span>{routeError}</span>
            </div>
          )}

          {(error || locationError) && (
            <div className="system-toast error">
              <strong>Sistem bildirimi</strong>
              <span>{error ?? locationError}</span>
            </div>
          )}

          {notice && (
            <div className="system-toast success">
              <strong>Gorev</strong>
              <span>{notice}</span>
            </div>
          )}
        </section>

        <aside className="workspace-panel route-panel driver-navigation-panel">
          <div className="details-heading">
            <div>
              <span>Canli yol tarifi</span>
              <h2>{activeTrip?.destinationName ?? 'Aktif gorev yok'}</h2>
            </div>
            <LocateFixed size={22} />
          </div>

          {isLoading ? (
            <div className="empty-panel-state">Gorev kontrol ediliyor.</div>
          ) : !activeTrip ? (
            <div className="empty-panel-state">
              <strong>Aktif rota yok</strong>
              <span>Yeni bir gorev atandiginda rota burada otomatik gorunecek.</span>
            </div>
          ) : (
            <>
              <div className="selected-vehicle-card">
                <Navigation size={24} />
                <div>
                  <strong>{activeTrip.vehiclePlate}</strong>
                  <span>{activeTrip.vehicleName}</span>
                </div>
              </div>

              <div className="address-card">
                <MapPin size={18} />
                <div>
                  <strong>{selectedDestination?.label}</strong>
                  <span>{activeTrip.destinationLatitude.toFixed(5)}, {activeTrip.destinationLongitude.toFixed(5)}</span>
                </div>
              </div>

              <div className="route-live-summary">
                <div>
                  <Clock3 size={18} />
                  <span>Kalan sure</span>
                  <strong>{formatDuration(displayedRoute?.durationSeconds)}</strong>
                </div>
                <div>
                  <Navigation size={18} />
                  <span>Kalan mesafe</span>
                  <strong>{formatDistance(displayedRoute?.distanceMeters)}</strong>
                </div>
                <div>
                  <Gauge size={18} />
                  <span>Hiz</span>
                  <strong>{selectedVehicle ? `${selectedVehicle.speed} km/h` : '-'}</strong>
                </div>
                <div>
                  <Wifi size={18} />
                  <span>Canli konum</span>
                  <strong>{selectedVehicle ? 'Aliniyor' : 'Bekleniyor'}</strong>
                </div>
              </div>

              <section className="driver-next-step">
                <span>Siradaki yon</span>
                <strong>{nextStep?.instruction ?? (selectedVehicle ? 'Rota guncelleniyor.' : 'Arac konumu bekleniyor.')}</strong>
                {nextStep && <small>{formatDistance(nextStep.distanceMeters)} sonra</small>}
              </section>

              {displayedRoute?.steps?.length > 0 && (
                <section className="route-summary driver-step-list">
                  <ol>
                    {displayedRoute.steps.slice(0, 8).map((step, index) => (
                      <li key={`${step.instruction}-${index}`}>
                        <span>{step.instruction}</span>
                        <small>{formatDistance(step.distanceMeters)}</small>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              <button className="primary-action-button" type="button" onClick={handleComplete}>
                <CheckCircle2 size={18} />
                Gorevi tamamla
              </button>
            </>
          )}
        </aside>
      </section>
    </AppLayout>
  );
}

export function DriverTripHistoryPage({ currentUser, municipalityName, onLogout }) {
  const [trips, setTrips] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadTrips() {
      setIsLoading(true);
      setError(null);

      try {
        const nextTrips = await fetchMyVehicleTrips();

        if (isMounted) {
          setTrips(nextTrips.filter(trip => trip.status !== 'ASSIGNED' && trip.status !== 'IN_PROGRESS'));
        }
      } catch (nextError) {
        if (isMounted) {
          setError(nextError.message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadTrips();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AppLayout
      activePage="driverHistory"
      connectionStatus="connected"
      headerIcon={Route}
      municipalityName={municipalityName}
      onLogout={onLogout}
      title="Gecmis Rotalar"
      user={currentUser}
    >
      <section className="driver-dashboard driver-history-list-dashboard">
        {error && <div className="inline-notice error">{error}</div>}

        <div className="driver-trip-list">
          {isLoading ? (
            <div className="empty-panel-state">Gecmis rotalar yukleniyor.</div>
          ) : trips.length === 0 ? (
            <div className="empty-panel-state">
              <strong>Gecmis rota yok</strong>
              <span>Tamamlanan veya iptal edilen rota henuz bulunmuyor.</span>
            </div>
          ) : trips.map(trip => (
            <article key={trip.id} className="driver-trip-card">
              <div className="driver-trip-heading">
                <div>
                  <span>{trip.vehiclePlate}</span>
                  <h2>{trip.destinationName ?? 'Harita hedefi'}</h2>
                </div>
                <em>{trip.status}</em>
              </div>

              <div className="driver-trip-grid">
                <div>
                  <MapPin size={17} />
                  <span>Cikis</span>
                  <strong>{trip.originFacilityName ?? 'Mevcut konum'}</strong>
                </div>
                <div>
                  <Clock3 size={17} />
                  <span>Sure</span>
                  <strong>{formatDuration(trip.actualDurationSeconds ?? trip.estimatedDurationSeconds)}</strong>
                </div>
                <div>
                  <Route size={17} />
                  <span>Mesafe</span>
                  <strong>{formatDistance(trip.actualDistanceMeters ?? trip.estimatedDistanceMeters)}</strong>
                </div>
                <div>
                  <CheckCircle2 size={17} />
                  <span>Atanma</span>
                  <strong>{formatDateTime(trip.assignedAt)}</strong>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </AppLayout>
  );
}
