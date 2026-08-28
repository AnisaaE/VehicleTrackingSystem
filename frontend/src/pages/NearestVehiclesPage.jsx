import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  CarFront,
  ChevronDown,
  Clock3,
  Cross,
  Flame,
  Gauge,
  LocateFixed,
  MapPin,
  Navigation,
  Route,
  Save,
  Search,
  Warehouse
} from 'lucide-react';
import { GeoJSON, MapContainer, Marker, Polyline, Popup, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { appConfig } from '../config';
import { fetchActiveVehicleTrips, fetchDestinations, fetchFacilities, fetchRoute, geocodeAddress } from '../api';
import { AppLayout } from '../components/AppLayout';
import { GoogleMapLayer } from '../components/GoogleMapLayer';
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

const routeColors = [
  '#2563eb',
  '#dc2626',
  '#16a34a',
  '#ca8a04',
  '#7c3aed',
  '#0891b2',
  '#ea580c',
  '#be123c'
];

const SAVED_NEAREST_ROUTES_KEY = 'vehicle-tracking-nearest-saved-routes';

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

function targetToLatLng(target) {
  if (!target) {
    return null;
  }

  return [target.latitude, target.longitude];
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
    connecting: 'Bağlanıyor',
    connected: 'Bağlı',
    reconnecting: 'Yeniden bağlanıyor',
    disconnected: 'Bağlantı yok'
  };

  return labels[status] ?? status;
}

function formatVehicleTypeLabel(value) {
  const normalizedType = normalizeType(value, 'DEFAULT');

  return vehicleTypeLabels[normalizedType] ?? value ?? 'Diger';
}

function loadSavedRoutes() {
  try {
    const routes = JSON.parse(localStorage.getItem(SAVED_NEAREST_ROUTES_KEY) ?? '[]');
    return Array.isArray(routes) ? routes : [];
  } catch {
    return [];
  }
}

function persistSavedRoutes(routes) {
  localStorage.setItem(SAVED_NEAREST_ROUTES_KEY, JSON.stringify(routes));
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

function createTargetMarkerIcon() {
  return L.divIcon({
    className: 'nearest-target-marker',
    html: '<span></span>',
    iconSize: [34, 42],
    iconAnchor: [17, 42],
    popupAnchor: [0, -38]
  });
}

function getVehicleIcon(vehicle, isSelected = false) {
  const icon = vehicleIcons[normalizeType(vehicle.vehicleType, 'DEFAULT')] ?? vehicleIcons.DEFAULT;

  if (!isSelected) {
    return icon;
  }

  return createVehicleIcon(icon.options.iconUrl, 'selected-vehicle-marker');
}

function getVehicleIconUrl(vehicle) {
  const icon = vehicleIcons[normalizeType(vehicle.vehicleType, 'DEFAULT')] ?? vehicleIcons.DEFAULT;
  return icon.options.iconUrl;
}

function getActiveVehicleIcon(vehicle, routeColor, isSelected = false) {
  return L.divIcon({
    className: `active-route-vehicle-marker ${isSelected ? 'selected' : ''}`,
    html: `
      <span style="--route-color:${routeColor}">
        <img src="${getVehicleIconUrl(vehicle)}" alt="" />
      </span>
    `,
    iconSize: [54, 54],
    iconAnchor: [27, 27],
    popupAnchor: [0, -28]
  });
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

function NearbyTargetFocus({ selectedTarget }) {
  const map = useMap();

  useEffect(() => {
    const position = targetToLatLng(selectedTarget);

    if (position) {
      map.flyTo(position, Math.max(map.getZoom(), 14), { duration: 0.45 });
    }
  }, [map, selectedTarget]);

  return null;
}

function NearbyMapClickTarget({ enabled, onSelectTarget }) {
  useMapEvents({
    click: event => {
      if (enabled) {
        onSelectTarget({
          latitude: event.latlng.lat,
          longitude: event.latlng.lng,
          label: 'Haritadan secilen nokta',
          source: 'map'
        });
      }
    }
  });

  return null;
}

function NearbyMap({
  facilities,
  vehicles,
  selectedTarget,
  selectedVehicle,
  selectedRoute,
  extraRoute,
  activeTripRoutes,
  onSelectFacility,
  onSelectVehicle,
  onSelectTarget,
  canSelectMapTarget
}) {
  const routePositions = routeToPositions(selectedRoute);
  const extraRoutePositions = routeToPositions(extraRoute);
  const selectedTargetPosition = targetToLatLng(selectedTarget);
  const visibleVehicleKeys = new Set(vehicles.map(vehicle => `${vehicle.provider}:${normalizePlate(vehicle.plate)}`));
  const selectedVehicleKey = selectedVehicle ? `${selectedVehicle.provider}:${normalizePlate(selectedVehicle.plate)}` : null;
  const routeColorByVehicleKey = new Map(
    activeTripRoutes.map(routeItem => [
      routeItem.vehicleKey,
      routeItem.color
    ])
  );

  return (
    <MapContainer center={appConfig.mapCenter} zoom={appConfig.mapZoom} className="vehicle-map" scrollWheelZoom zoomControl={false}>
      <GoogleMapLayer />
      <ZoomControl position="topright" />
      <NearbyMapFocus
        facilities={facilities}
        vehicles={vehicles}
      />
      <NearbyTargetFocus selectedTarget={selectedTarget} />
      <NearbyMapClickTarget enabled={canSelectMapTarget} onSelectTarget={onSelectTarget} />

      {facilities.map(facility => {
        const position = pointToLatLng(facility.location);
        const boundary = parseGeometry(facility.boundary);
        const isSelected = selectedTarget?.source === 'facility' && String(selectedTarget.id) === String(facility.id);

        return (
          <Fragment key={facility.id}>
            {boundary && <GeoJSON data={boundary} style={getFacilityBoundaryStyle(facility.facilityType)} />}
            {position && (
              <Marker
                position={position}
                icon={createFacilityMarkerIcon(facility, isSelected)}
                zIndexOffset={isSelected ? 1000 : 0}
                eventHandlers={{
                  click: event => {
                    event.originalEvent?.stopPropagation();
                    onSelectFacility(String(facility.id));
                  }
                }}
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

      {activeTripRoutes
        .filter(routeItem => visibleVehicleKeys.has(routeItem.vehicleKey))
        .map(routeItem => {
          const positions = routeToPositions(routeItem.route);
          const isSelectedTrip = selectedVehicleKey === routeItem.vehicleKey;

          if (positions.length === 0) {
            return null;
          }

          return (
            <Polyline
              key={routeItem.trip.id}
              positions={positions}
              pathOptions={{
                color: routeItem.color,
                opacity: isSelectedTrip ? 0.95 : 0.62,
                weight: isSelectedTrip ? 6 : 4
              }}
            >
              <Popup>
                <strong>{routeItem.trip.vehiclePlate}</strong>
                <span>{routeItem.trip.destinationName ?? 'Görev hedefi'}</span>
                <span>{formatDuration(routeItem.route.durationSeconds)}</span>
              </Popup>
            </Polyline>
          );
        })}

      {routePositions.length > 0 && (
        <Polyline positions={routePositions} pathOptions={{ color: '#2563eb', weight: 5 }} />
      )}

      {extraRoutePositions.length > 0 && (
        <Polyline positions={extraRoutePositions} pathOptions={{ color: '#16a34a', weight: 5, dashArray: '8 8' }} />
      )}

      {selectedTargetPosition && selectedTarget?.source !== 'facility' && (
        <Marker position={selectedTargetPosition} icon={createTargetMarkerIcon()} zIndexOffset={1050}>
          <Popup>
            <strong>{selectedTarget.label}</strong>
            <span>{selectedTarget.latitude.toFixed(5)}, {selectedTarget.longitude.toFixed(5)}</span>
          </Popup>
        </Marker>
      )}

      {vehicles.map(vehicle => {
        const vehicleKey = getVehicleKey(vehicle);
        const normalizedVehicleKey = `${vehicle.provider}:${normalizePlate(vehicle.plate)}`;
        const isSelected = selectedVehicle && getVehicleKey(selectedVehicle) === vehicleKey;
        const routeColor = routeColorByVehicleKey.get(normalizedVehicleKey);

        return (
          <Marker
            key={vehicleKey}
            position={[vehicle.latitude, vehicle.longitude]}
            icon={routeColor ? getActiveVehicleIcon(vehicle, routeColor, isSelected) : getVehicleIcon(vehicle, isSelected)}
            zIndexOffset={isSelected ? 1100 : 0}
            eventHandlers={{
              click: event => {
                event.originalEvent?.stopPropagation();
                onSelectVehicle(vehicleKey);
              }
            }}
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
  const [destinations, setDestinations] = useState([]);
  const [activeTool, setActiveTool] = useState('nearest');
  const [isFacilityListOpen, setIsFacilityListOpen] = useState(false);
  const [nearestTargetSource, setNearestTargetSource] = useState('map');
  const [facilitySearchTerm, setFacilitySearchTerm] = useState('');
  const [addressQuery, setAddressQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [selectedSavedRouteId, setSelectedSavedRouteId] = useState('');
  const [selectedVehicleType, setSelectedVehicleType] = useState('');
  const [selectedVehicleKey, setSelectedVehicleKey] = useState('');
  const [nearestRoutes, setNearestRoutes] = useState([]);
  const [activeTrips, setActiveTrips] = useState([]);
  const [activeTripRoutes, setActiveTripRoutes] = useState([]);
  const [savedRoutes, setSavedRoutes] = useState(loadSavedRoutes);
  const [routeOriginFacilityId, setRouteOriginFacilityId] = useState('');
  const [routeDestinationId, setRouteDestinationId] = useState('');
  const [routeAddressQuery, setRouteAddressQuery] = useState('');
  const [routeSuggestions, setRouteSuggestions] = useState([]);
  const [routeTarget, setRouteTarget] = useState(null);
  const [routeResult, setRouteResult] = useState(null);
  const [routeNotice, setRouteNotice] = useState(null);
  const [isRoutePickMode, setIsRoutePickMode] = useState(false);
  const [routeError, setRouteError] = useState(null);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [isRouteRefreshing, setIsRouteRefreshing] = useState(false);
  const routeRequestRef = useRef(0);
  const filteredVehiclesRef = useRef([]);
  const activeTripsRef = useRef([]);

  useEffect(() => {
    fetchFacilities()
      .then(nextFacilities => {
        setFacilities(nextFacilities);
        if (!routeOriginFacilityId && nextFacilities.length > 0) {
          setRouteOriginFacilityId(String(nextFacilities[0].id));
        }
      })
      .catch(nextError => setRouteError(nextError.message));
  }, [routeOriginFacilityId]);

  useEffect(() => {
    fetchDestinations()
      .then(setDestinations)
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

  const filteredVehicles = useMemo(
    () => vehicles.filter(vehicle =>
      !selectedVehicleType || normalizeType(vehicle.vehicleType, 'DEFAULT') === selectedVehicleType
    ),
    [selectedVehicleType, vehicles]
  );

  useEffect(() => {
    filteredVehiclesRef.current = filteredVehicles;
  }, [filteredVehicles]);

  useEffect(() => {
    activeTripsRef.current = activeTrips;
  }, [activeTrips]);

  const selectedVehicle = useMemo(
    () => filteredVehicles.find(vehicle => getVehicleKey(vehicle) === selectedVehicleKey) ?? nearestRoutes[0]?.vehicle ?? null,
    [filteredVehicles, nearestRoutes, selectedVehicleKey]
  );

  const selectedRoute = useMemo(
    () => nearestRoutes.find(item => getVehicleKey(item.vehicle) === getVehicleKey(selectedVehicle ?? {}))?.route ?? nearestRoutes[0]?.route ?? null,
    [nearestRoutes, selectedVehicle]
  );

  const selectedSavedRoute = useMemo(
    () => savedRoutes.find(savedRoute => savedRoute.id === selectedSavedRouteId) ?? null,
    [savedRoutes, selectedSavedRouteId]
  );

  const selectedFacility = useMemo(
    () => facilities.find(facility => String(facility.id) === String(routeOriginFacilityId)) ?? facilities[0] ?? null,
    [facilities, routeOriginFacilityId]
  );

  const routeDisplayTarget = activeTool === 'route' ? routeTarget : selectedTarget;
  const routeDisplayRoute = activeTool === 'route'
    ? routeResult
    : selectedSavedRoute?.route ?? selectedRoute;

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
  }, [selectedTarget, selectedVehicleType]);

  useEffect(() => {
    if (addressQuery.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      geocodeAddress(addressQuery)
        .then(setSuggestions)
        .catch(nextError => setRouteError(nextError.message));
    }, 450);

    return () => window.clearTimeout(timeoutId);
  }, [addressQuery]);

  useEffect(() => {
    if (routeAddressQuery.trim().length < 3) {
      setRouteSuggestions([]);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      geocodeAddress(routeAddressQuery)
        .then(setRouteSuggestions)
        .catch(nextError => setRouteError(nextError.message));
    }, 450);

    return () => window.clearTimeout(timeoutId);
  }, [routeAddressQuery]);

  useEffect(() => {
    let isMounted = true;

    const loadActiveTrips = async () => {
      try {
        const trips = await fetchActiveVehicleTrips();

        if (isMounted) {
          setActiveTrips(trips);
        }
      } catch (nextError) {
        if (isMounted) {
          setRouteError(nextError.message);
        }
      }
    };

    loadActiveTrips();
    const intervalId = window.setInterval(loadActiveTrips, 12000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (activeTrips.length === 0) {
      setActiveTripRoutes([]);
      return;
    }

    let isMounted = true;

    const refreshActiveTripRoutes = async () => {
      const currentActiveTrips = activeTripsRef.current;
      const currentVehicles = filteredVehiclesRef.current;

      if (currentActiveTrips.length === 0 || currentVehicles.length === 0) {
        if (isMounted) {
          setActiveTripRoutes([]);
        }
        return;
      }

      const routeResults = await Promise.all(
        currentActiveTrips.map(async (trip, index) => {
          const vehicle = currentVehicles.find(currentVehicle =>
            currentVehicle.provider === trip.providerCode &&
            normalizePlate(currentVehicle.plate) === normalizePlate(trip.vehiclePlate)
          );

          if (!vehicle) {
            return null;
          }

          try {
            const route = await fetchRoute({
              fromLat: vehicle.latitude,
              fromLon: vehicle.longitude,
              toLat: trip.destinationLatitude,
              toLon: trip.destinationLongitude,
              vehiclePlate: vehicle.plate,
              providerCode: vehicle.provider
            });

            return {
              color: routeColors[index % routeColors.length],
              route,
              trip,
              vehicleKey: `${trip.providerCode}:${normalizePlate(trip.vehiclePlate)}`
            };
          } catch {
            return null;
          }
        })
      );

      if (isMounted) {
        setActiveTripRoutes(routeResults.filter(Boolean));
      }
    };

    refreshActiveTripRoutes();
    const intervalId = window.setInterval(refreshActiveTripRoutes, 12000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [activeTrips.length, selectedProviderCode, selectedVehicleType]);

  const refreshNearestRoutes = useCallback(async ({ showLoading = false } = {}) => {
    const currentVehicles = filteredVehiclesRef.current;

    const targetPosition = selectedSavedRoute?.origin
      ? [selectedSavedRoute.origin.latitude, selectedSavedRoute.origin.longitude]
      : targetToLatLng(selectedTarget);

    if ((!selectedTarget && !selectedSavedRoute) || !targetPosition || currentVehicles.length === 0) {
      routeRequestRef.current += 1;
      setNearestRoutes([]);
      setIsRouteLoading(false);
      setIsRouteRefreshing(false);
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

            if (!selectedSavedRoute) {
              return { vehicle, route, error: null };
            }

            return {
              vehicle,
              route: {
                ...route,
                durationSeconds: route.durationSeconds + selectedSavedRoute.route.durationSeconds,
                distanceMeters: route.distanceMeters + selectedSavedRoute.route.distanceMeters
              },
              approachRoute: route,
              savedRoute: selectedSavedRoute,
              error: null
            };
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
  }, [selectedSavedRoute, selectedTarget]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      refreshNearestRoutes({ showLoading: true });
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [
    filteredVehicles.length,
    refreshNearestRoutes,
    selectedTarget,
    selectedSavedRoute,
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
    const facility = facilities.find(currentFacility => String(currentFacility.id) === String(facilityId));
    const position = pointToLatLng(facility?.location);

    if (!facility || !position) {
      setRouteError('Secilen tesisin konum bilgisi yok.');
      return;
    }

    setSelectedTarget({
      id: facility.id,
      latitude: position[0],
      longitude: position[1],
      label: facility.name,
      source: 'facility',
      subtitle: formatFacilityTypeLabel(facility.facilityType)
    });
    setSuggestions([]);
    setRouteError(null);
  }, [facilities]);

  const handleSelectRouteOriginFacility = useCallback(facilityId => {
    const facility = facilities.find(currentFacility => String(currentFacility.id) === String(facilityId));

    if (!facility) {
      return;
    }

    setRouteOriginFacilityId(String(facility.id));
    setRouteNotice(null);
    setRouteError(null);
  }, [facilities]);

  const handleSelectSuggestion = useCallback(suggestion => {
    setSelectedTarget({
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      label: suggestion.displayName,
      source: 'search'
    });
    setSuggestions([]);
    setRouteError(null);
  }, []);

  const handleSelectRouteSuggestion = useCallback(suggestion => {
    setRouteTarget({
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      label: suggestion.displayName
    });
    setRouteDestinationId('');
    setRouteAddressQuery(suggestion.displayName);
    setRouteSuggestions([]);
    setRouteResult(null);
    setRouteNotice(null);
    setRouteError(null);
  }, []);

  const handleSelectRouteDestination = useCallback(destinationId => {
    setRouteDestinationId(destinationId);

    const destination = destinations.find(currentDestination => String(currentDestination.id) === String(destinationId));
    const position = pointToLatLng(destination?.location);

    if (!destination || !position) {
      return;
    }

    setRouteTarget({
      latitude: position[0],
      longitude: position[1],
      label: destination.name
    });
    setRouteAddressQuery('');
    setRouteSuggestions([]);
    setRouteResult(null);
    setRouteNotice(null);
    setRouteError(null);
  }, [destinations]);

  const handleSelectMapTarget = useCallback(nextTarget => {
    if (activeTool === 'route' && isRoutePickMode) {
      setRouteTarget(nextTarget);
      setRouteDestinationId('');
      setRouteAddressQuery('');
      setRouteResult(null);
      setRouteNotice(null);
      setIsRoutePickMode(false);
    } else {
      setSelectedTarget(nextTarget);
      setSelectedSavedRouteId('');
    }
    setSuggestions([]);
    setRouteSuggestions([]);
    setRouteNotice(null);
    setRouteError(null);
  }, [activeTool, isRoutePickMode]);

  const handleSelectNearestSource = source => {
    setNearestTargetSource(source);
    setRouteError(null);
    setSelectedVehicleKey('');

    if (source === 'map') {
      setSelectedSavedRouteId('');
    }
  };

  const handleClearTarget = () => {
    routeRequestRef.current += 1;
    setSelectedTarget(null);
    setSelectedSavedRouteId('');
    setNearestRoutes([]);
    setSelectedVehicleKey('');
    setAddressQuery('');
    setSuggestions([]);
    setRouteError(null);
  };

  const handleAddressSearch = () => {
    if (addressQuery.trim().length < 3) {
      return;
    }

    geocodeAddress(addressQuery)
      .then(setSuggestions)
      .catch(nextError => setRouteError(nextError.message));
  };

  const handleNearestSearch = () => {
    if (nearestTargetSource === 'address' && addressQuery.trim().length >= 3 && !selectedTarget) {
      handleAddressSearch();
      return;
    }

    if (!selectedTarget && !selectedSavedRoute) {
      setRouteError('En yakin araç icin harita, adres, tesis veya rota seçin.');
      return;
    }

    refreshNearestRoutes({ showLoading: true });
  };

  const handleRouteAddressSearch = () => {
    if (routeAddressQuery.trim().length < 3) {
      return;
    }

    geocodeAddress(routeAddressQuery)
      .then(setRouteSuggestions)
      .catch(nextError => setRouteError(nextError.message));
  };

  const handleRoute = async () => {
    if (!selectedFacility || !routeTarget) {
      setRouteError('Rota için çıkış noktasi ve hedef seçin.');
      return;
    }

    try {
      const nextRoute = await fetchRoute({
        fromFacilityId: selectedFacility.id,
        toLat: routeTarget.latitude,
        toLon: routeTarget.longitude,
        toDestinationId: routeDestinationId || undefined
      });
      setRouteResult(nextRoute);
      setRouteNotice('Rota hazir.');
      setRouteError(null);
    } catch (nextError) {
      setRouteError(nextError.message);
    }
  };

  const handleSaveRoute = () => {
    if (!selectedFacility || !routeTarget || !routeResult) {
      setRouteError('Kaydetmek icin once rota alin.');
      return;
    }

    const originPosition = pointToLatLng(selectedFacility.location);

    if (!originPosition) {
      setRouteError('Çıkış tesisinin konum bilgisi yok.');
      return;
    }

    const savedRoute = {
      id: String(Date.now()),
      name: `${selectedFacility.name} -> ${routeTarget.label}`,
      origin: {
        id: selectedFacility.id,
        latitude: originPosition[0],
        longitude: originPosition[1],
        label: selectedFacility.name
      },
      target: routeTarget,
      route: routeResult,
      createdAt: new Date().toISOString()
    };
    const nextSavedRoutes = [savedRoute, ...savedRoutes].slice(0, 12);
    setSavedRoutes(nextSavedRoutes);
    persistSavedRoutes(nextSavedRoutes);
    setSelectedSavedRouteId(savedRoute.id);
    setRouteNotice('Rota kaydedildi.');
    setRouteError(null);
  };

  const handleSelectSavedRoute = routeId => {
    const savedRoute = savedRoutes.find(currentRoute => currentRoute.id === routeId);

    setSelectedSavedRouteId(routeId);

    if (savedRoute) {
      setSelectedTarget({
        ...savedRoute.target,
        source: 'saved-route',
        subtitle: savedRoute.name
      });
    }
  };

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
              <h2>Hedef veya tesis</h2>
            </div>
            <button
              className={`collapse-toggle-button ${isFacilityListOpen ? 'open' : ''}`}
              type="button"
              onClick={() => setIsFacilityListOpen(current => !current)}
              aria-expanded={isFacilityListOpen}
              title={isFacilityListOpen ? 'Tesisleri kapat' : 'Tesisleri ac'}
            >
              <span>{visibleFacilities.length}</span>
              <ChevronDown size={17} />
            </button>
          </div>

          <div className="nearest-left-controls">
            <div className="segmented-actions nearest-tool-switch">
              <button type="button" className={activeTool === 'nearest' ? 'active' : ''} onClick={() => setActiveTool('nearest')}>
                En yakın araç bul
              </button>
              <button type="button" className={activeTool === 'route' ? 'active' : ''} onClick={() => setActiveTool('route')}>
                Rota bul
              </button>
            </div>

            {activeTool === 'route' ? (
              <>
                <label className="field-stack compact-field">
                  <span>Çıkış Noktası</span>
                  <select value={selectedFacility?.id ?? ''} onChange={event => setRouteOriginFacilityId(event.target.value)}>
                    {visibleFacilities.length === 0 && <option value="">Görünen tesis yok</option>}
                    {visibleFacilities.map(facility => (
                      <option key={facility.id} value={facility.id}>{facility.name}</option>
                    ))}
                  </select>
                </label>

                <div className="field-stack compact-field">
                  <span>Hedef</span>
                  <div className="inline-input">
                    <Search size={18} />
                    <input
                      value={routeAddressQuery}
                      onChange={event => {
                        setRouteAddressQuery(event.target.value);
                        setRouteDestinationId('');
                      }}
                      placeholder="Mahalle + cadde ara"
                    />
                    {routeAddressQuery && (
                      <button className="plain-icon-button" type="button" onClick={() => setRouteAddressQuery('')} aria-label="Temizle">
                        x
                      </button>
                    )}
                  </div>
                  {routeAddressQuery.trim().length === 0 && destinations.length > 0 && (
                    <div className="saved-destination-list">
                      {destinations.map(destination => (
                        <button
                          key={destination.id}
                          className={String(destination.id) === String(routeDestinationId) ? 'selected' : ''}
                          type="button"
                          onClick={() => handleSelectRouteDestination(String(destination.id))}
                        >
                          <MapPin size={15} />
                          <span>{destination.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {routeSuggestions.length > 0 && (
                    <div className="suggestion-list compact-suggestion-list">
                      {routeSuggestions.map(suggestion => (
                        <button
                          key={`${suggestion.latitude}:${suggestion.longitude}`}
                          type="button"
                          onClick={() => handleSelectRouteSuggestion(suggestion)}
                        >
                          <MapPin size={16} />
                          <span>{suggestion.displayName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="segmented-actions">
                  <button type="button" onClick={handleRouteAddressSearch}>
                    Adres Ara
                  </button>
                  <button type="button" onClick={() => setIsRoutePickMode(true)} className={isRoutePickMode ? 'active' : ''}>
                    Haritadan Seç
                  </button>
                </div>

                {routeTarget && (
                  <div className="address-card compact-address-card">
                    <MapPin size={18} />
                    <div>
                      <strong>{routeTarget.label}</strong>
                      <span>{routeTarget.latitude.toFixed(5)}, {routeTarget.longitude.toFixed(5)}</span>
                    </div>
                  </div>
                )}

                <button className="primary-action-button" type="button" onClick={handleRoute}>
                  <Navigation size={18} />
                  Yol Tarifi Al
                </button>

                {routeResult && (
                  <button className="primary-action-button secondary-action-button" type="button" onClick={handleSaveRoute}>
                    <Save size={18} />
                    Save rota
                  </button>
                )}

                {routeNotice && <div className="inline-notice success">{routeNotice}</div>}
              </>
            ) : (
              <>
                <div className="nearest-source-picker">
                  <button type="button" className={nearestTargetSource === 'map' ? 'active' : ''} onClick={() => handleSelectNearestSource('map')}>
                    <MapPin size={16} />
                    Harita
                  </button>
                  <button type="button" className={nearestTargetSource === 'address' ? 'active' : ''} onClick={() => handleSelectNearestSource('address')}>
                    <Search size={16} />
                    Adres
                  </button>
                  <button type="button" className={nearestTargetSource === 'facility' ? 'active' : ''} onClick={() => handleSelectNearestSource('facility')}>
                    <Building2 size={16} />
                    Tesis
                  </button>
                  <button type="button" className={nearestTargetSource === 'route' ? 'active' : ''} onClick={() => handleSelectNearestSource('route')}>
                    <Route size={16} />
                    Rota
                  </button>
                </div>

                {nearestTargetSource === 'address' && (
                  <>
                    <div className="field-stack compact-field">
                      <span>Adres ara</span>
                      <div className="inline-input">
                        <Search size={18} />
                        <input
                          value={addressQuery}
                          onChange={event => setAddressQuery(event.target.value)}
                          placeholder="Mahalle, cadde veya yer ara"
                        />
                        {addressQuery && (
                          <button className="plain-icon-button" type="button" onClick={() => setAddressQuery('')} aria-label="Temizle">
                            x
                          </button>
                        )}
                      </div>
                      {suggestions.length > 0 && (
                        <div className="suggestion-list compact-suggestion-list">
                          {suggestions.map(suggestion => (
                            <button
                              key={`${suggestion.latitude}:${suggestion.longitude}`}
                              type="button"
                              onClick={() => handleSelectSuggestion(suggestion)}
                            >
                              <MapPin size={16} />
                              <span>{suggestion.displayName}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="segmented-actions nearest-location-actions">
                      <button type="button" onClick={handleAddressSearch}>
                        Adres Ara
                      </button>
                      <button type="button" onClick={handleClearTarget}>
                        Temizle
                      </button>
                    </div>

                    {selectedTarget && (
                      <div className="address-card compact-address-card nearest-target-card">
                        <MapPin size={18} />
                        <div>
                          <strong>{selectedTarget.label}</strong>
                          <span>{selectedTarget.subtitle ?? `${selectedTarget.latitude.toFixed(5)}, ${selectedTarget.longitude.toFixed(5)}`}</span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {nearestTargetSource === 'route' && (
                  <div className="saved-route-list">
                    {savedRoutes.length === 0 ? (
                      <div className="empty-panel-state compact-empty-state">
                        <strong>Kayitli rota yok</strong>
                        <span>Rota bul panelinden rota kaydedin.</span>
                      </div>
                    ) : (
                      savedRoutes.map(savedRoute => (
                        <button
                          key={savedRoute.id}
                          className={selectedSavedRouteId === savedRoute.id ? 'selected' : ''}
                          type="button"
                          onClick={() => handleSelectSavedRoute(savedRoute.id)}
                        >
                          <Route size={17} />
                          <span>
                            <strong>{savedRoute.name}</strong>
                            <small>{formatDuration(savedRoute.route.durationSeconds)} / {formatDistance(savedRoute.route.distanceMeters)}</small>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}

                <label className="field-stack compact-field">
                  <span>Araç Türü</span>
                  <select value={selectedVehicleType} onChange={event => setSelectedVehicleType(event.target.value)}>
                    <option value="">Tüm araç türleri</option>
                    {availableVehicleTypes.map(vehicleType => (
                      <option key={vehicleType.code} value={vehicleType.code}>
                        {vehicleType.label} ({vehicleType.count})
                      </option>
                    ))}
                  </select>
                </label>

                <button className="primary-action-button" type="button" onClick={handleNearestSearch}>
                  <Navigation size={18} />
                  En Yakın Araçları Bul
                </button>
              </>
            )}
          </div>

          {isFacilityListOpen && (
            <>
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
                    <strong>Konum bulunamadı</strong>
                    <span>Arama metniyle eşleşen tesis yok.</span>
                  </div>
                ) : (
                  visibleFacilities.map(facility => {
                    const Icon = getFacilityIcon(facility.facilityType);
                    const isSelected = selectedTarget?.source === 'facility' && String(selectedTarget.id) === String(facility.id);

                    return (
                      <button
                        key={facility.id}
                        className={`facility-row ${isSelected ? 'selected' : ''}`}
                        type="button"
                        onClick={() => activeTool === 'route'
                          ? handleSelectRouteOriginFacility(String(facility.id))
                          : handleSelectFacility(String(facility.id))}
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
            </>
          )}
        </aside>

        <section className="map-stage nearest-map-stage">
          <NearbyMap
            facilities={visibleFacilities}
            vehicles={filteredVehicles}
            selectedTarget={routeDisplayTarget}
            selectedVehicle={selectedVehicle}
            selectedRoute={routeDisplayRoute}
            extraRoute={activeTool === 'nearest' ? nearestRoutes.find(item => getVehicleKey(item.vehicle) === getVehicleKey(selectedVehicle ?? {}))?.approachRoute : null}
            activeTripRoutes={activeTripRoutes}
            onSelectFacility={activeTool === 'route' ? handleSelectRouteOriginFacility : handleSelectFacility}
            onSelectVehicle={setSelectedVehicleKey}
            onSelectTarget={handleSelectMapTarget}
            canSelectMapTarget={activeTool === 'nearest' ? nearestTargetSource === 'map' : isRoutePickMode}
          />

          {selectedTarget && nearestRoutes[0] && (
            <div className="route-map-badge nearest-map-badge">
              <strong>{formatDuration(nearestRoutes[0].route.durationSeconds)}</strong>
              <span>{nearestRoutes[0].vehicle.plate}</span>
            </div>
          )}

          {vehicleError && (
            <div className="system-toast error">
              <strong>Araç verisi</strong>
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
              <span>{activeTool === 'route' ? 'Yol Tarifi' : 'En Yakın Araçlar'}</span>
              <h2>{activeTool === 'route' ? 'Rota' : selectedTarget?.label ?? 'Konum seçin'}</h2>
            </div>
            {activeTool === 'route' ? <Route size={22} /> : <Navigation size={22} />}
          </div>

          {activeTool === 'route' ? (
            <>
              {routeResult && (
                <section className="route-summary">
                  <div>
                    <span>Mesafe</span>
                    <strong>{formatDistance(routeResult.distanceMeters)}</strong>
                  </div>
                  <div>
                    <span>Tahmini Süre</span>
                    <strong>{formatDuration(routeResult.durationSeconds)}</strong>
                  </div>
                  {routeResult.steps.length > 0 && (
                    <ol>
                      {routeResult.steps.map((step, index) => (
                        <li key={`${step.instruction}-${index}`}>
                          <span>{step.instruction}</span>
                          <small>{formatDistance(step.distanceMeters)}</small>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              )}
            </>
          ) : (
            <>
              <div className="nearest-summary-grid">
            <div>
              <Clock3 size={18} />
              <span>En yakın süre</span>
              <strong>{isRouteLoading ? 'Hesaplaniyor' : formatDuration(nearestRoutes[0]?.route.durationSeconds)}</strong>
            </div>
            <div>
              <CarFront size={18} />
              <span>Uygun araç</span>
              <strong>{filteredVehicles.length}</strong>
            </div>
              </div>

              {isRouteRefreshing && (
                <div className="nearest-refresh-note">
                  <Clock3 size={15} />
                  <span>Süreler arka planda güncelleniyor.</span>
                </div>
              )}

              {bestByType.length > 0 && (
                <section className="nearest-type-leaders">
                  <h3>Türune göre en yakın</h3>
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
                    <strong>Rotalar hesaplanıyor</strong>
                    <span>Seçilen konuma göre araç süreleri yenileniyor.</span>
                  </div>
                ) : nearestRoutes.length === 0 ? (
                  <div className="empty-panel-state">
                    <strong>{selectedTarget || selectedSavedRoute ? 'Sonuç yok' : 'Konum seçin'}</strong>
                    <span>
                      {selectedTarget || selectedSavedRoute
                        ? `${selectedProviderName} icin bu filtrede rota bulunamadi.`
                        : 'Harita, adres, tesis veya kayıtlı rota seçin.'}
                    </span>
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
                    <span>Seçili araç</span>
                    <strong>{selectedVehicle.plate}</strong>
                    <small>{selectedVehicle.vehicleName}</small>
                  </div>
                  <div>
                    <Gauge size={16} />
                    <strong>{selectedVehicle.speed} km/h</strong>
                  </div>
                </section>
              )}
            </>
          )}
        </aside>
      </section>
    </AppLayout>
  );
}
