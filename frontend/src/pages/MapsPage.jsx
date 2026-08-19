import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import { Building2, ChevronDown, MapPin, Navigation, Route, Save, Search } from 'lucide-react';
import { GeoJSON, MapContainer, Marker, Polyline, TileLayer, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { appConfig } from '../config';
import {
  createFacility,
  createVehicleLocationConnection,
  fetchFacilities,
  fetchRoute,
  geocodeAddress
} from '../api';

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const facilityBoundaryStyles = {
  FIRE_STATION: { color: '#a33226', weight: 2, fillOpacity: 0.12 },
  HOSPITAL: { color: '#1769aa', weight: 2, fillOpacity: 0.12 },
  GARAGE: { color: '#7a4d13', weight: 2, fillOpacity: 0.12 },
  DEPOT: { color: '#52615a', weight: 2, fillOpacity: 0.12 }
};

const facilityTypeLabels = {
  FIRE_STATION: 'İtfaiye',
  HOSPITAL: 'Hastane',
  GARAGE: 'Garaj',
  DEPOT: 'Depo'
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

function getFacilityBoundaryStyle(facilityType) {
  return facilityBoundaryStyles[facilityType] ?? facilityBoundaryStyles.DEPOT;
}

function normalizeFacilityType(value) {
  return value
    ?.toString()
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toUpperCase() || 'UNKNOWN';
}

function formatFacilityTypeLabel(value) {
  const normalizedType = normalizeFacilityType(value);

  return facilityTypeLabels[normalizedType] ?? value ?? 'Diğer';
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

function DrawingTools({ onGeometryCreated }) {
  const map = useMap();

  useEffect(() => {
    map.pm.addControls({
      position: 'topright',
      drawCircle: false,
      drawCircleMarker: false,
      drawMarker: true,
      drawPolyline: false,
      drawRectangle: false,
      drawText: false,
      editMode: true,
      dragMode: true,
      removalMode: true
    });

    const handleCreate = event => {
      const geoJson = event.layer.toGeoJSON().geometry;
      onGeometryCreated(geoJson);
    };

    map.on('pm:create', handleCreate);

    return () => {
      map.off('pm:create', handleCreate);
      map.pm.removeControls();
    };
  }, [map, onGeometryCreated]);

  return null;
}

function MapClickTarget({ enabled, onTargetSelected }) {
  useMapEvents({
    click: event => {
      if (enabled) {
        onTargetSelected({
          latitude: event.latlng.lat,
          longitude: event.latlng.lng,
          label: 'Haritadan seçilen nokta'
        });
      }
    }
  });

  return null;
}

export function MapsPage() {
  const [facilities, setFacilities] = useState([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState('');
  const [addressQuery, setAddressQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [target, setTarget] = useState(null);
  const [route, setRoute] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [isPickMode, setIsPickMode] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftCode, setDraftCode] = useState('');
  const [draftType, setDraftType] = useState('FIRE_STATION');
  const [draftLocation, setDraftLocation] = useState(null);
  const [draftBoundary, setDraftBoundary] = useState(null);
  const [hiddenFacilityTypes, setHiddenFacilityTypes] = useState([]);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const targetRef = useRef(null);

  const availableFacilityTypes = useMemo(() => {
    const typesByCode = new Map();

    facilities.forEach(facility => {
      const code = normalizeFacilityType(facility.facilityType);

      if (!typesByCode.has(code)) {
        typesByCode.set(code, {
          code,
          label: formatFacilityTypeLabel(facility.facilityType),
          count: 0
        });
      }

      typesByCode.get(code).count += 1;
    });

    return Array.from(typesByCode.values()).sort((first, second) =>
      first.label.localeCompare(second.label, 'tr')
    );
  }, [facilities]);

  const visibleFacilities = useMemo(
    () => facilities.filter(facility =>
      !hiddenFacilityTypes.includes(normalizeFacilityType(facility.facilityType))
    ),
    [facilities, hiddenFacilityTypes]
  );

  const selectedFacility = useMemo(
    () => visibleFacilities.find(facility => facility.id === Number(selectedFacilityId)) ?? visibleFacilities[0] ?? null,
    [selectedFacilityId, visibleFacilities]
  );
  const routePositions = useMemo(() => routeToPositions(route), [route]);

  const toggleFacilityType = typeCode => {
    setHiddenFacilityTypes(currentHiddenTypes =>
      currentHiddenTypes.includes(typeCode)
        ? currentHiddenTypes.filter(currentTypeCode => currentTypeCode !== typeCode)
        : [...currentHiddenTypes, typeCode]
    );
  };

  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  const loadFacilities = useCallback(async () => {
    const nextFacilities = await fetchFacilities();
    setFacilities(nextFacilities);

    if (!selectedFacilityId && nextFacilities.length > 0) {
      setSelectedFacilityId(String(nextFacilities[0].id));
    }
  }, [selectedFacilityId]);

  useEffect(() => {
    loadFacilities().catch(nextError => setError(nextError.message));
  }, [loadFacilities]);

  useEffect(() => {
    if (visibleFacilities.length === 0) {
      setSelectedFacilityId('');
      return;
    }

    if (!visibleFacilities.some(facility => facility.id === Number(selectedFacilityId))) {
      setSelectedFacilityId(String(visibleFacilities[0].id));
    }
  }, [selectedFacilityId, visibleFacilities]);

  useEffect(() => {
    if (addressQuery.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      geocodeAddress(addressQuery)
        .then(setSuggestions)
        .catch(nextError => setError(nextError.message));
    }, 450);

    return () => window.clearTimeout(timeoutId);
  }, [addressQuery]);

  useEffect(() => {
    const connection = createVehicleLocationConnection(
      () => {},
      () => {},
      nextConnection => nextConnection.invoke('SubscribeToAllProviders'),
      async departure => {
        setNotice(`${departure.plate} ${departure.facilityName} tesisinden çıktı.`);
        setSelectedFacilityId(String(departure.facilityId));

        if (!targetRef.current) {
          return;
        }

        try {
          const nextRoute = await fetchRoute({
            fromFacilityId: departure.facilityId,
            toLat: targetRef.current.latitude,
            toLon: targetRef.current.longitude,
            vehiclePlate: departure.plate,
            providerCode: departure.provider
          });
          setRoute(nextRoute);
        } catch (nextError) {
          setError(nextError.message);
        }
      }
    );

    connection.start()
      .then(() => connection.invoke('SubscribeToAllProviders'))
      .catch(nextError => setError(nextError.message));

    return () => {
      connection.stop();
    };
  }, []);

  const handleGeometryCreated = useCallback(geometry => {
    if (geometry.type === 'Point') {
      setDraftLocation(geometry);
      return;
    }

    if (geometry.type === 'Polygon') {
      setDraftBoundary(geometry);
    }
  }, []);

  const handleSaveFacility = async () => {
    if (!draftLocation) {
      setError('Tesis için önce haritada bir nokta çizin.');
      return;
    }

    try {
      const created = await createFacility({
        name: draftName || 'Yeni Tesis',
        code: draftCode || `FACILITY_${Date.now()}`,
        facilityType: draftType,
        location: JSON.stringify(draftLocation),
        boundary: draftBoundary ? JSON.stringify(draftBoundary) : null
      });

      setFacilities(current => [...current, created]);
      setHiddenFacilityTypes(current => current.filter(type => type !== normalizeFacilityType(created.facilityType)));
      setSelectedFacilityId(String(created.id));
      setDraftName('');
      setDraftCode('');
      setDraftLocation(null);
      setDraftBoundary(null);
      setNotice('Tesis kaydedildi.');
      setError(null);
    } catch (nextError) {
      setError(nextError.message);
    }
  };

  const handleRoute = async () => {
    if (!selectedFacility || !target) {
      setError('Rota için tesis ve hedef seçin.');
      return;
    }

    try {
      const nextRoute = await fetchRoute({
        fromFacilityId: selectedFacility.id,
        toLat: target.latitude,
        toLon: target.longitude
      });
      setRoute(nextRoute);
      setNotice('Rota hazır.');
      setError(null);
    } catch (nextError) {
      setError(nextError.message);
    }
  };

  return (
    <section className="maps-workspace">
      <MapContainer center={appConfig.mapCenter} zoom={appConfig.mapZoom} className="maps-canvas" scrollWheelZoom zoomControl={false}>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ZoomControl position="topright" />
        <DrawingTools onGeometryCreated={handleGeometryCreated} />
        <MapClickTarget enabled={isPickMode} onTargetSelected={nextTarget => {
          setTarget(nextTarget);
          setIsPickMode(false);
        }} />

        {visibleFacilities.map(facility => {
          const position = pointToLatLng(facility.location);
          const boundary = parseGeometry(facility.boundary);

          return (
            <Fragment key={facility.id}>
              {boundary && <GeoJSON data={boundary} style={getFacilityBoundaryStyle(facility.facilityType)} />}
              {position && <Marker position={position} icon={markerIcon} />}
            </Fragment>
          );
        })}

        {target && <Marker position={[target.latitude, target.longitude]} icon={markerIcon} />}
        {routePositions.length > 0 && <Polyline positions={routePositions} pathOptions={{ color: '#17623a', weight: 5 }} />}
      </MapContainer>

      <aside className={`route-drawer ${isDrawerOpen ? 'open' : 'closed'}`}>
        <button className="drawer-toggle" type="button" onClick={() => setIsDrawerOpen(value => !value)}>
          <ChevronDown size={20} />
        </button>

        <div className="drawer-content">
          <div className="drawer-heading">
            <div>
              <span>Haritalar</span>
              <h2>Tesis ve yol tarifi</h2>
            </div>
            <Route size={24} />
          </div>

          {notice && <div className="notice-banner">{notice}</div>}
          {error && <div className="error-banner">{error}</div>}

          <label className="field-stack">
            <span>Tesis</span>
            <select value={selectedFacility?.id ?? ''} onChange={event => setSelectedFacilityId(event.target.value)}>
              {visibleFacilities.length === 0 && <option value="">Görünen tesis yok</option>}
              {visibleFacilities.map(facility => (
                <option key={facility.id} value={facility.id}>{facility.name}</option>
              ))}
            </select>
          </label>

          {availableFacilityTypes.length > 0 && (
            <div className="facility-type-filter">
              <div className="facility-type-filter-heading">
                <span>Tesis türü</span>
                <button
                  type="button"
                  onClick={() => setHiddenFacilityTypes([])}
                  disabled={hiddenFacilityTypes.length === 0}
                >
                  Tümü
                </button>
              </div>
              <div className="facility-type-options">
                {availableFacilityTypes.map(facilityType => {
                  const isVisible = !hiddenFacilityTypes.includes(facilityType.code);

                  return (
                    <button
                      key={facilityType.code}
                      className={isVisible ? 'active' : ''}
                      type="button"
                      onClick={() => toggleFacilityType(facilityType.code)}
                      aria-pressed={isVisible}
                    >
                      <Building2 size={16} />
                      <span>{facilityType.label}</span>
                      <strong>{facilityType.count}</strong>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="field-stack">
            <span>Hedef adres</span>
            <div className="inline-input">
              <Search size={18} />
              <input value={addressQuery} onChange={event => setAddressQuery(event.target.value)} placeholder="Mahalle + cadde ara" />
            </div>
            {suggestions.length > 0 && (
              <div className="suggestion-list">
                {suggestions.map(suggestion => (
                  <button key={`${suggestion.latitude}:${suggestion.longitude}`} type="button" onClick={() => {
                    setTarget({
                      latitude: suggestion.latitude,
                      longitude: suggestion.longitude,
                      label: suggestion.displayName
                    });
                    setSuggestions([]);
                  }}>
                    <MapPin size={16} />
                    <span>{suggestion.displayName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="drawer-actions">
            <button type="button" onClick={() => setIsPickMode(true)}>
              <MapPin size={18} />
              Haritadan seç
            </button>
            <button type="button" onClick={handleRoute}>
              <Navigation size={18} />
              Yol Tarifi Al
            </button>
          </div>

          {target && <div className="target-chip">{target.label}</div>}

          {route && (
            <section className="route-summary">
              <div>
                <span>Mesafe</span>
                <strong>{formatDistance(route.distanceMeters)}</strong>
              </div>
              <div>
                <span>Süre</span>
                <strong>{formatDuration(route.durationSeconds)}</strong>
              </div>
              <ol>
                {route.steps.map((step, index) => (
                  <li key={`${step.instruction}-${index}`}>
                    <span>{step.instruction}</span>
                    <small>{formatDistance(step.distanceMeters)}</small>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className="facility-editor">
            <div className="section-title">
              <Building2 size={18} />
              <strong>Yeni tesis</strong>
            </div>
            <input value={draftName} onChange={event => setDraftName(event.target.value)} placeholder="Tesis adı" />
            <input value={draftCode} onChange={event => setDraftCode(event.target.value)} placeholder="Kod" />
            <select value={draftType} onChange={event => setDraftType(event.target.value)}>
              <option value="FIRE_STATION">FIRE_STATION</option>
              <option value="HOSPITAL">HOSPITAL</option>
              <option value="GARAGE">GARAGE</option>
              <option value="DEPOT">DEPOT</option>
            </select>
            <div className="draft-state">
              <span>{draftLocation ? 'Nokta hazır' : 'Nokta bekleniyor'}</span>
              <span>{draftBoundary ? 'Poligon hazır' : 'Poligon opsiyonel'}</span>
            </div>
            <button type="button" onClick={handleSaveFacility}>
              <Save size={18} />
              Kaydet
            </button>
          </section>
        </div>
      </aside>
    </section>
  );
}
