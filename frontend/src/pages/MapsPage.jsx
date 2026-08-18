import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import { Building2, ChevronDown, MapPin, Navigation, Plus, Route, Save, Search } from 'lucide-react';
import { GeoJSON, MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet';
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

function DrawingTools({ onGeometryCreated }) {
  const map = useMap();

  useEffect(() => {
    map.pm.addControls({
      position: 'topleft',
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
          label: 'Haritadan secilen nokta'
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
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const targetRef = useRef(null);

  const selectedFacility = useMemo(
    () => facilities.find(facility => facility.id === Number(selectedFacilityId)) ?? facilities[0],
    [facilities, selectedFacilityId]
  );
  const routePositions = useMemo(() => routeToPositions(route), [route]);

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
        setNotice(`${departure.plate} ${departure.facilityName} tesisinden cikti.`);
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
      setError('Tesis icin once haritada bir nokta cizin.');
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
      setError('Rota icin tesis ve hedef secin.');
      return;
    }

    try {
      const nextRoute = await fetchRoute({
        fromFacilityId: selectedFacility.id,
        toLat: target.latitude,
        toLon: target.longitude
      });
      setRoute(nextRoute);
      setNotice('Rota hazir.');
      setError(null);
    } catch (nextError) {
      setError(nextError.message);
    }
  };

  return (
    <section className="maps-workspace">
      <MapContainer center={appConfig.mapCenter} zoom={appConfig.mapZoom} className="maps-canvas" scrollWheelZoom>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <DrawingTools onGeometryCreated={handleGeometryCreated} />
        <MapClickTarget enabled={isPickMode} onTargetSelected={nextTarget => {
          setTarget(nextTarget);
          setIsPickMode(false);
        }} />

        {facilities.map(facility => {
          const position = pointToLatLng(facility.location);
          const boundary = parseGeometry(facility.boundary);

          return (
            <Fragment key={facility.id}>
              {boundary && <GeoJSON data={boundary} style={{ color: '#a33226', weight: 2, fillOpacity: 0.12 }} />}
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
              {facilities.map(facility => (
                <option key={facility.id} value={facility.id}>{facility.name}</option>
              ))}
            </select>
          </label>

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
              Haritadan sec
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
                <span>Sure</span>
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
            <input value={draftName} onChange={event => setDraftName(event.target.value)} placeholder="Tesis adi" />
            <input value={draftCode} onChange={event => setDraftCode(event.target.value)} placeholder="Kod" />
            <select value={draftType} onChange={event => setDraftType(event.target.value)}>
              <option value="FIRE_STATION">FIRE_STATION</option>
              <option value="GARAGE">GARAGE</option>
              <option value="DEPOT">DEPOT</option>
            </select>
            <div className="draft-state">
              <span>{draftLocation ? 'Nokta hazir' : 'Nokta bekleniyor'}</span>
              <span>{draftBoundary ? 'Poligon hazir' : 'Poligon opsiyonel'}</span>
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
