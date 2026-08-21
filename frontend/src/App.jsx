import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CarFront,
  Clock3,
  Flag,
  Gauge,
  LocateFixed,
  MapPinned,
  MapPin,
  Navigation,
  Power,
  Route,
  Search,
  Wifi
} from 'lucide-react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import { appConfig } from './config';
import {
  cancelVehicleTrip,
  completeVehicleTrip,
  createVehicleTrip,
  fetchActiveVehicleTrips,
  fetchAppConfig,
  fetchDestinations,
  fetchEmployees,
  fetchFacilities,
  fetchRoute
} from './api';
import { useVehicleLocations } from './useVehicleLocations';
import { MapsPage } from './pages/MapsPage';
import { AppLayout } from './components/AppLayout';

function createVehicleIcon(iconUrl, className = '') {
  return new L.Icon({
    iconUrl,
    iconSize: [46, 46],
    iconAnchor: [23, 23],
    popupAnchor: [0, -24],
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

const destinationIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'destination-marker'
});

const vehicleTypeLabels = {
  AMBULANCE: 'Ambulans',
  FIRE_TRUCK: 'İtfaiye Aracı',
  GARBAGE_TRUCK: 'Çöp Kamyonu',
  WORK_MACHINE: 'İş Makinesi',
  SWEEPER: 'Süpürge Aracı'
};

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'medium'
  }).format(new Date(value));
}

function normalizePlate(value) {
  return value.replace(/\s|-/g, '').toUpperCase();
}

function getVehicleKey(vehicle) {
  return `${vehicle.provider}:${vehicle.plate}`;
}

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

  const minutes = Math.max(1, Math.round(value / 60));
  return `${minutes} dk`;
}

function normalizeVehicleType(value) {
  return value
    ?.toString()
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toUpperCase() || 'DEFAULT';
}

function getVehicleIcon(vehicle, isSelected = false) {
  const icon = vehicleIcons[normalizeVehicleType(vehicle.vehicleType)] ?? vehicleIcons.DEFAULT;

  if (!isSelected) {
    return icon;
  }

  return createVehicleIcon(icon.options.iconUrl, 'selected-vehicle-marker');
}

function formatVehicleTypeLabel(value) {
  const normalizedType = normalizeVehicleType(value);

  return vehicleTypeLabels[normalizedType] ?? value ?? 'Diğer';
}

function formatConnectionStatus(status) {
  const labels = {
    connecting: 'Bağlanıyor',
    connected: 'Bağlı',
    reconnecting: 'Yeniden bağlanıyor',
    disconnected: 'Bağlantı yok'
  };

  return labels[status] ?? status;
}

function MapFocus({ vehicles, selectedVehicle }) {
  const map = useMap();
  const previousSelectedPlate = useRef(null);
  const hasFitInitialBounds = useRef(false);

  useEffect(() => {
    const selectedPlate = selectedVehicle?.plate ?? null;

    if (selectedVehicle) {
      if (previousSelectedPlate.current !== selectedPlate) {
        map.flyTo([selectedVehicle.latitude, selectedVehicle.longitude], 15, {
          duration: 0.8
        });
      }

      previousSelectedPlate.current = selectedPlate;
      return;
    }

    if (vehicles.length > 0 && (!hasFitInitialBounds.current || previousSelectedPlate.current)) {
      const bounds = L.latLngBounds(
        vehicles.map(vehicle => [vehicle.latitude, vehicle.longitude])
      );

      map.fitBounds(bounds, {
        padding: [40, 40],
        maxZoom: 14
      });

      hasFitInitialBounds.current = true;
    }

    previousSelectedPlate.current = null;
  }, [map, selectedVehicle?.plate, vehicles.length]);

  return null;
}

function VehicleMap({ vehicles, selectedVehicle, destinationTarget, remainingRoute, travelledRoute, onSelectVehicle }) {
  const remainingPositions = routeToPositions(remainingRoute);
  const travelledPositions = routeToPositions(travelledRoute);

  return (
    <MapContainer
      center={appConfig.mapCenter}
      zoom={appConfig.mapZoom}
      className="vehicle-map"
      scrollWheelZoom
      zoomControl={false}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomControl position="topright" />
      <MapFocus vehicles={vehicles} selectedVehicle={selectedVehicle} />
      {travelledPositions.length > 0 && (
        <Polyline positions={travelledPositions} pathOptions={{ color: '#64748b', dashArray: '7 8', weight: 4 }} />
      )}
      {remainingPositions.length > 0 && (
        <Polyline positions={remainingPositions} pathOptions={{ color: '#2563eb', weight: 5 }} />
      )}
      {destinationTarget && (
        <Marker position={[destinationTarget.latitude, destinationTarget.longitude]} icon={destinationIcon} />
      )}
      {vehicles.map(vehicle => {
        const vehicleKey = getVehicleKey(vehicle);
        const isSelected = selectedVehicle && getVehicleKey(selectedVehicle) === vehicleKey;

        return (
          <Marker
            key={vehicleKey}
            position={[vehicle.latitude, vehicle.longitude]}
            icon={getVehicleIcon(vehicle, isSelected)}
            zIndexOffset={isSelected ? 1000 : 0}
            eventHandlers={{
              click: () => onSelectVehicle(vehicleKey)
            }}
          >
            <Popup>
              <strong>{vehicle.plate}</strong>
              <span>{vehicle.speed} km/h</span>
              <span>{vehicle.ignitionOn ? 'Kontak Açık' : 'Kontak Kapalı'}</span>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

function DetailItem({ icon: Icon, label, value }) {
  return (
    <div className="detail-item">
      <Icon size={18} />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function LiveTrackingPage({ municipalityName, onNavigate }) {
  const [selectedProviderCode, setSelectedProviderCode] = useState(
    appConfig.defaultProviderCode
  );
  const [departuresByVehicle, setDeparturesByVehicle] = useState({});
  const handleVehicleDeparture = useCallback(departure => {
    setDeparturesByVehicle(current => ({
      ...current,
      [`${departure.provider}:${departure.plate}`]: departure
    }));
  }, []);
  const { vehicles, providers, connectionStatus, lastUpdatedAt, error } =
    useVehicleLocations(selectedProviderCode, handleVehicleDeparture);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlate, setSelectedPlate] = useState(null);
  const [hiddenVehicleTypes, setHiddenVehicleTypes] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [manualOriginFacilityId, setManualOriginFacilityId] = useState('');
  const [selectedDestinationId, setSelectedDestinationId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [activeTrip, setActiveTrip] = useState(null);
  const [remainingRoute, setRemainingRoute] = useState(null);
  const [travelledRoute, setTravelledRoute] = useState(null);
  const [routeError, setRouteError] = useState(null);
  const [tripNotice, setTripNotice] = useState(null);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const routeRequestRef = useRef(0);

  const availableVehicleTypes = useMemo(() => {
    const typesByCode = new Map();

    vehicles.forEach(vehicle => {
      const code = normalizeVehicleType(vehicle.vehicleType);

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

  const toggleVehicleType = typeCode => {
    setHiddenVehicleTypes(currentHiddenTypes =>
      currentHiddenTypes.includes(typeCode)
        ? currentHiddenTypes.filter(currentTypeCode => currentTypeCode !== typeCode)
        : [...currentHiddenTypes, typeCode]
    );
  };

  const filteredVehicles = useMemo(() => {
    const normalizedSearch = normalizePlate(searchTerm);

    return vehicles.filter(vehicle =>
      !hiddenVehicleTypes.includes(normalizeVehicleType(vehicle.vehicleType)) &&
      (!normalizedSearch || normalizePlate(vehicle.plate).includes(normalizedSearch))
    );
  }, [hiddenVehicleTypes, vehicles, searchTerm]);

  const selectedVehicle = useMemo(
    () => filteredVehicles.find(vehicle => getVehicleKey(vehicle) === selectedPlate) ?? null,
    [filteredVehicles, selectedPlate]
  );

  const selectedVehicleKey = selectedVehicle ? getVehicleKey(selectedVehicle) : null;
  const selectedDeparture = selectedVehicleKey ? departuresByVehicle[selectedVehicleKey] : null;
  const originFacilityId = activeTrip?.originFacilityId
    ? String(activeTrip.originFacilityId)
    : selectedDeparture?.facilityId
    ? String(selectedDeparture.facilityId)
    : manualOriginFacilityId;
  const originFacility = useMemo(
    () => facilities.find(facility => String(facility.id) === String(originFacilityId)) ?? null,
    [facilities, originFacilityId]
  );
  const selectedDestination = useMemo(
    () => destinations.find(destination => String(destination.id) === String(selectedDestinationId)) ?? null,
    [destinations, selectedDestinationId]
  );
  const destinationTarget = useMemo(() => {
    if (activeTrip) {
      return {
        latitude: activeTrip.destinationLatitude,
        longitude: activeTrip.destinationLongitude,
        label: activeTrip.destinationName ?? 'Aktif gorev hedefi'
      };
    }

    if (!selectedDestination) {
      return null;
    }

    const position = pointToLatLng(selectedDestination.location);

    return position
      ? {
          latitude: position[0],
          longitude: position[1],
          label: selectedDestination.name
        }
      : null;
  }, [activeTrip, selectedDestination]);
  const totalDistanceMeters = (travelledRoute?.distanceMeters ?? 0) + (remainingRoute?.distanceMeters ?? 0);
  const routeProgressPercent = totalDistanceMeters > 0
    ? Math.min(100, Math.round(((travelledRoute?.distanceMeters ?? 0) / totalDistanceMeters) * 100))
    : 0;

  const selectedProviderName = selectedProviderCode
    ? providers.find(provider => provider.code === selectedProviderCode)?.name ?? selectedProviderCode
    : 'Tumu';

  useEffect(() => {
    setSelectedPlate(null);
    setSearchTerm('');
    setHiddenVehicleTypes([]);
    setManualOriginFacilityId('');
    setSelectedDestinationId('');
    setSelectedDriverId('');
    setActiveTrip(null);
    setRemainingRoute(null);
    setTravelledRoute(null);
    setRouteError(null);
    setTripNotice(null);
  }, [selectedProviderCode]);

  useEffect(() => {
    fetchFacilities()
      .then(setFacilities)
      .catch(nextError => setRouteError(nextError.message));

    fetchDestinations()
      .then(setDestinations)
      .catch(nextError => setRouteError(nextError.message));

    fetchEmployees()
      .then(setEmployees)
      .catch(nextError => setRouteError(nextError.message));
  }, []);

  useEffect(() => {
    if (
      selectedPlate &&
      !filteredVehicles.some(vehicle => getVehicleKey(vehicle) === selectedPlate)
    ) {
      setSelectedPlate(null);
    }
  }, [filteredVehicles, selectedPlate]);

  useEffect(() => {
    if (!selectedVehicle) {
      setActiveTrip(null);
      return;
    }

    let isMounted = true;

    fetchActiveVehicleTrips({
      providerCode: selectedVehicle.provider,
      plate: selectedVehicle.plate
    })
      .then(trips => {
        if (isMounted) {
          setActiveTrip(trips[0] ?? null);
        }
      })
      .catch(nextError => {
        if (isMounted) {
          setRouteError(nextError.message);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [
    selectedVehicle?.lastLocationTime,
    selectedVehicle?.plate,
    selectedVehicle?.provider
  ]);

  useEffect(() => {
    if (!selectedVehicle || !destinationTarget) {
      setRemainingRoute(null);
      setTravelledRoute(null);
      return;
    }

    const requestId = routeRequestRef.current + 1;
    routeRequestRef.current = requestId;
    setIsRouteLoading(true);
    setRouteError(null);

    const timeoutId = window.setTimeout(async () => {
      try {
        const nextRemainingRoute = await fetchRoute({
          fromLat: selectedVehicle.latitude,
          fromLon: selectedVehicle.longitude,
          toLat: destinationTarget.latitude,
          toLon: destinationTarget.longitude,
          vehiclePlate: selectedVehicle.plate,
          providerCode: selectedVehicle.provider
        });

        let nextTravelledRoute = null;

        if (originFacility) {
          nextTravelledRoute = await fetchRoute({
            fromFacilityId: originFacility.id,
            toLat: selectedVehicle.latitude,
            toLon: selectedVehicle.longitude,
            vehiclePlate: selectedVehicle.plate,
            providerCode: selectedVehicle.provider
          });
        }

        if (routeRequestRef.current !== requestId) {
          return;
        }

        setRemainingRoute(nextRemainingRoute);
        setTravelledRoute(nextTravelledRoute);
      } catch (nextError) {
        if (routeRequestRef.current === requestId) {
          setRouteError(nextError.message);
          setRemainingRoute(null);
        }
      } finally {
        if (routeRequestRef.current === requestId) {
          setIsRouteLoading(false);
        }
      }
    }, 650);

    return () => window.clearTimeout(timeoutId);
  }, [
    destinationTarget?.latitude,
    destinationTarget?.longitude,
    originFacility?.id,
    selectedVehicle?.latitude,
    selectedVehicle?.longitude,
    selectedVehicle?.plate,
    selectedVehicle?.provider
  ]);

  const handleAssignTrip = async () => {
    if (!selectedVehicle) {
      return;
    }

    if (!selectedDestinationId) {
      setRouteError('Gorev icin once hedef secin.');
      return;
    }

    try {
      const trip = await createVehicleTrip({
        providerCode: selectedVehicle.provider,
        vehiclePlate: selectedVehicle.plate,
        driverId: selectedDriverId ? Number(selectedDriverId) : null,
        assignedByEmployeeId: null,
        originFacilityId: originFacilityId ? Number(originFacilityId) : null,
        destinationId: Number(selectedDestinationId),
        notes: null
      });

      setActiveTrip(trip);
      setTripNotice('Gorev araca atandi.');
      setRouteError(null);
    } catch (nextError) {
      setRouteError(nextError.message);
    }
  };

  const handleCompleteTrip = async () => {
    if (!activeTrip) {
      return;
    }

    try {
      const trip = await completeVehicleTrip(activeTrip.id);
      setActiveTrip(null);
      setRemainingRoute(null);
      setTravelledRoute(null);
      setTripNotice(`${trip.vehiclePlate} gorevi tamamlandi.`);
      setRouteError(null);
    } catch (nextError) {
      setRouteError(nextError.message);
    }
  };

  const handleCancelTrip = async () => {
    if (!activeTrip) {
      return;
    }

    try {
      const trip = await cancelVehicleTrip(activeTrip.id);
      setActiveTrip(null);
      setRemainingRoute(null);
      setTravelledRoute(null);
      setTripNotice(`${trip.vehiclePlate} gorevi iptal edildi.`);
      setRouteError(null);
    } catch (nextError) {
      setRouteError(nextError.message);
    }
  };

  return (
    <AppLayout
      activePage="tracking"
      connectionLabel={formatConnectionStatus(connectionStatus)}
      connectionStatus={connectionStatus}
      headerIcon={MapPinned}
      lastUpdatedAt={lastUpdatedAt}
      municipalityName={municipalityName}
      onNavigate={onNavigate}
      title="Canlı Takip"
    >
      <section className={`tracking-dashboard ${selectedVehicle ? 'has-details' : ''}`}>
        <aside className="workspace-panel vehicle-panel">
          <div className="panel-heading">
            <div>
              <span>{municipalityName}</span>
              <h2>Araclar</h2>
            </div>
            <strong>{filteredVehicles.length}</strong>
          </div>

          <label className="field-stack panel-field">
            <span>Sağlayıcı</span>
            <select
              value={selectedProviderCode}
              onChange={event => setSelectedProviderCode(event.target.value)}
            >
              {providers.length === 0 ? (
                <option value="">Tumu</option>
              ) : (
                <>
                  <option value="">Tumu</option>
                  {providers
                    .filter(provider => provider.isActive)
                    .map(provider => (
                      <option key={provider.code} value={provider.code}>
                        {provider.name}
                      </option>
                    ))}
                </>
              )}
            </select>
          </label>

          <div className="search-box panel-search">
            <Search size={18} />
            <input
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder="Plaka ara..."
            />
            <button
              className="icon-button"
              type="button"
              onClick={() => setSelectedPlate(null)}
              aria-label="Tüm araçları göster"
              title="Tüm araçları göster"
            >
              <LocateFixed size={18} />
            </button>
          </div>

          {availableVehicleTypes.length > 0 && (
            <div className="type-filter">
              <div className="type-filter-heading">
                <span>Arac turu</span>
                <button
                  type="button"
                  onClick={() => setHiddenVehicleTypes([])}
                  disabled={hiddenVehicleTypes.length === 0}
                >
                  Tumu
                </button>
              </div>
              <div className="type-filter-options">
                {availableVehicleTypes.map(vehicleType => {
                  const isVisible = !hiddenVehicleTypes.includes(vehicleType.code);

                  return (
                    <button
                      key={vehicleType.code}
                      className={isVisible ? 'active' : ''}
                      type="button"
                      onClick={() => toggleVehicleType(vehicleType.code)}
                      aria-pressed={isVisible}
                    >
                      <CarFront size={16} />
                      <span>{vehicleType.label}</span>
                      <strong>{vehicleType.count}</strong>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="panel-subheading">
            <span>{selectedProviderName}</span>
            <strong>{filteredVehicles.length} arac</strong>
          </div>

          <div className="vehicle-list">
            {filteredVehicles.length === 0 ? (
              <div className="empty-panel-state">
                <strong>{selectedProviderName}</strong>
                <span>
                  {vehicles.length === 0
                    ? 'Bu sağlayıcı için kullanılabilir araç konumu yok.'
                    : 'Secili filtrelere uygun arac yok.'}
                </span>
              </div>
            ) : (
              filteredVehicles.map(vehicle => (
                <button
                  key={getVehicleKey(vehicle)}
                  className={`vehicle-row ${selectedPlate === getVehicleKey(vehicle) ? 'selected' : ''}`}
                  onClick={() => setSelectedPlate(getVehicleKey(vehicle))}
                  type="button"
                >
                  <CarFront size={18} />
                  <div>
                    <strong>{vehicle.plate}</strong>
                    <span>{vehicle.vehicleName}</span>
                  </div>
                  <div className="vehicle-row-meta">
                    <strong>{vehicle.speed} km/h</strong>
                    <span className={vehicle.ignitionOn ? 'status-text on' : 'status-text'}>
                      {vehicle.ignitionOn ? 'Kontak Açık' : 'Kontak Kapalı'}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="map-stage tracking-map-stage">
          <VehicleMap
            vehicles={filteredVehicles}
            selectedVehicle={selectedVehicle}
            destinationTarget={destinationTarget}
            remainingRoute={remainingRoute}
            travelledRoute={travelledRoute}
            onSelectVehicle={setSelectedPlate}
          />
          {error && (
            <div className="system-toast error">
              <strong>Sistem bildirimi</strong>
              <span>{error}</span>
            </div>
          )}
          {routeError && (
            <div className="system-toast error">
              <strong>Rota bildirimi</strong>
              <span>{routeError}</span>
            </div>
          )}
          {tripNotice && (
            <div className="system-toast success">
              <strong>Gorev</strong>
              <span>{tripNotice}</span>
            </div>
          )}
        </section>

        {selectedVehicle && (
          <aside className="workspace-panel details-panel">
            <div className="details-heading">
              <div>
                <span>Araç Detayları</span>
                <h2>{selectedVehicle.plate}</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => setSelectedPlate(null)}
                aria-label="Detayları kapat"
                title="Detayları kapat"
              >
                ×
              </button>
            </div>

            <div className="selected-vehicle-card">
              <CarFront size={24} />
              <div>
                <strong>{selectedVehicle.vehicleName}</strong>
                <span>{formatVehicleTypeLabel(selectedVehicle.vehicleType)}</span>
              </div>
            </div>

            <section className="detail-section">
              <h3>Canlı Durum</h3>
              <div className="details-grid">
                <DetailItem icon={Gauge} label="Hız" value={`${selectedVehicle.speed} km/h`} />
                <DetailItem
                  icon={Power}
                  label="Kontak"
                  value={selectedVehicle.ignitionOn ? 'Açık' : 'Kapalı'}
                />
                <DetailItem
                  icon={Wifi}
                  label="Son Konum"
                  value={formatDateTime(selectedVehicle.lastLocationTime)}
                />
              </div>
            </section>

            <section className="detail-section">
              <h3>Guzergah</h3>
              {activeTrip && (
                <div className="active-trip-card">
                  <div>
                    <span>Aktif Gorev</span>
                    <strong>{activeTrip.destinationName ?? destinationTarget?.label ?? 'Hedef'}</strong>
                  </div>
                  <em>{activeTrip.status}</em>
                  <small>
                    {activeTrip.driverName ? `${activeTrip.driverName} suruyor` : 'Sofor atanmadi'}
                  </small>
                </div>
              )}

              {!activeTrip && (
                <div className="no-active-trip-note">
                  <Route size={16} />
                  <span>Bu arac icin su anda atanmis gorev yok.</span>
                </div>
              )}

              <label className="field-stack panel-field compact-field">
                <span>Çıkış Noktası</span>
                <select
                  value={originFacilityId}
                  onChange={event => setManualOriginFacilityId(event.target.value)}
                  disabled={Boolean(activeTrip || selectedDeparture)}
                >
                  <option value="">Mevcut konum</option>
                  {facilities.map(facility => (
                    <option key={facility.id} value={facility.id}>{facility.name}</option>
                  ))}
                </select>
              </label>

              {selectedDeparture && (
                <div className="route-origin-note">
                  <Flag size={16} />
                  <span>{selectedDeparture.facilityName} tesisinden çıktı.</span>
                </div>
              )}

              {!activeTrip && !selectedDeparture && !originFacilityId && (
                <div className="route-origin-note">
                  <MapPin size={16} />
                  <span>Rota aracin mevcut konumundan baslayacak.</span>
                </div>
              )}

              <label className="field-stack panel-field compact-field">
                <span>Varış Noktası</span>
                <select
                  value={activeTrip?.destinationId ? String(activeTrip.destinationId) : selectedDestinationId}
                  onChange={event => setSelectedDestinationId(event.target.value)}
                  disabled={Boolean(activeTrip)}
                >
                  <option value="">Kayıtlı hedef seç</option>
                  {destinations.map(destination => (
                    <option key={destination.id} value={destination.id}>{destination.name}</option>
                  ))}
                </select>
              </label>

              <label className="field-stack panel-field compact-field">
                <span>Sofor</span>
                <select
                  value={activeTrip?.driverId ? String(activeTrip.driverId) : selectedDriverId}
                  onChange={event => setSelectedDriverId(event.target.value)}
                  disabled={Boolean(activeTrip)}
                >
                  <option value="">Sofor sec</option>
                  {employees
                    .filter(employee => employee.isActive && employee.role === 'DRIVER')
                    .map(employee => (
                      <option key={employee.id} value={employee.id}>{employee.fullName}</option>
                    ))}
                </select>
              </label>

              {destinationTarget && (
                <div className="route-live-summary">
                  <div>
                    <Clock3 size={18} />
                    <span>Kalan Sure</span>
                    <strong>{isRouteLoading ? 'Güncelleniyor' : formatDuration(remainingRoute?.durationSeconds)}</strong>
                  </div>
                  <div>
                    <Navigation size={18} />
                    <span>Kalan Mesafe</span>
                    <strong>{formatDistance(remainingRoute?.distanceMeters)}</strong>
                  </div>
                  <div>
                    <Route size={18} />
                    <span>Gidilen</span>
                    <strong>{formatDistance(travelledRoute?.distanceMeters)}</strong>
                  </div>
                </div>
              )}

              {remainingRoute && (
                <div className="route-progress">
                  <span style={{ width: `${routeProgressPercent}%` }} />
                  <strong>{routeProgressPercent}%</strong>
                </div>
              )}

              {activeTrip ? (
                <div className="segmented-actions">
                  <button type="button" onClick={handleCompleteTrip}>
                    Tamamla
                  </button>
                  <button type="button" onClick={handleCancelTrip}>
                    Iptal
                  </button>
                </div>
              ) : (
                <button className="primary-action-button" type="button" onClick={handleAssignTrip} disabled={!selectedDestinationId}>
                  <Navigation size={18} />
                  Gorevlendir
                </button>
              )}
            </section>

            <section className="detail-section">
              <h3>Konum</h3>
              <div className="details-grid">
                <DetailItem icon={MapPin} label="Enlem" value={selectedVehicle.latitude} />
                <DetailItem icon={MapPin} label="Boylam" value={selectedVehicle.longitude} />
              </div>
            </section>

            <section className="detail-section">
              <h3>Sağlayıcı</h3>
              <div className="details-grid">
                <DetailItem icon={MapPin} label="Takip Sağlayıcısı" value={selectedVehicle.provider} />
                <DetailItem icon={CarFront} label="Arac Tipi" value={formatVehicleTypeLabel(selectedVehicle.vehicleType)} />
              </div>
            </section>
          </aside>
        )}
      </section>
    </AppLayout>
  );
}

export default function App() {
  const [activePage, setActivePage] = useState('tracking');
  const [runtimeConfig, setRuntimeConfig] = useState(appConfig);

  useEffect(() => {
    fetchAppConfig()
      .then(nextConfig => {
        setRuntimeConfig(currentConfig => ({
          ...currentConfig,
          ...nextConfig
        }));
      })
      .catch(() => {
        setRuntimeConfig(appConfig);
      });
  }, []);

  return (
    <div className="root-shell">
      {activePage === 'tracking'
        ? <LiveTrackingPage municipalityName={runtimeConfig.municipalityName} onNavigate={setActivePage} />
        : <MapsPage municipalityName={runtimeConfig.municipalityName} onNavigate={setActivePage} />}
    </div>
  );
}

