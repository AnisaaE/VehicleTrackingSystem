import { useEffect, useState } from 'react';
import { TileLayer } from 'react-leaflet';
import { GoogleMapLayer } from './GoogleMapLayer';

export const BASEMAP_STORAGE_KEY = 'vehicle-tracking-basemap';
export const BASEMAP_CHANGE_EVENT = 'vehicle-tracking-basemap-change';

export const basemapOptions = [
  {
    id: 'google-hybrid',
    label: 'Uydu (Google)',
    description: 'Uydu görüntüsü ve yol etiketleri',
    provider: 'Google',
    layer: 'google',
    type: 'hybrid'
  },
  {
    id: 'google-roadmap',
    label: 'Yol (Google)',
    description: 'Klasik Google yol haritası',
    provider: 'Google',
    layer: 'google',
    type: 'roadmap'
  },
  {
    id: 'google-satellite',
    label: 'Saf Uydu (Google)',
    description: 'Etiketsiz uydu görüntüsü',
    provider: 'Google',
    layer: 'google',
    type: 'satellite'
  },
  {
    id: 'google-terrain',
    label: 'Arazi (Google)',
    description: 'Yükselti ve yol detayları',
    provider: 'Google',
    layer: 'google',
    type: 'terrain'
  },
  {
    id: 'osm-standard',
    label: 'OpenStreetMap',
    description: 'Açık kaynak standart harita',
    provider: 'OSM',
    layer: 'tile',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors'
  },
  {
    id: 'opentopo',
    label: 'Topografik',
    description: 'Yükselti çizgileri ve arazi formu',
    provider: 'OpenTopoMap',
    layer: 'tile',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data &copy; OpenStreetMap contributors, SRTM | Map style &copy; OpenTopoMap'
  },
  {
    id: 'esri-imagery',
    label: 'Uydu (Esri)',
    description: 'Alternatif uydu görüntüsü',
    provider: 'Esri',
    layer: 'tile',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri'
  }
];

export const defaultBasemapId = basemapOptions[0].id;

export function getBasemapOption(id) {
  return basemapOptions.find(option => option.id === id) ?? basemapOptions[0];
}

export function getStoredBasemapId() {
  const storedValue = window.localStorage.getItem(BASEMAP_STORAGE_KEY);

  return basemapOptions.some(option => option.id === storedValue)
    ? storedValue
    : defaultBasemapId;
}

export function setStoredBasemapId(basemapId) {
  const nextBasemapId = getBasemapOption(basemapId).id;

  window.localStorage.setItem(BASEMAP_STORAGE_KEY, nextBasemapId);
  window.dispatchEvent(new CustomEvent(BASEMAP_CHANGE_EVENT, { detail: nextBasemapId }));
}

export function BasemapLayer({ basemapId }) {
  const [storedBasemapId, setStoredBasemapIdState] = useState(getStoredBasemapId);
  const activeBasemapId = basemapId ?? storedBasemapId;
  const option = getBasemapOption(activeBasemapId);

  useEffect(() => {
    if (basemapId) {
      return undefined;
    }

    const handleBasemapChange = event => {
      setStoredBasemapIdState(event.detail ?? getStoredBasemapId());
    };

    window.addEventListener(BASEMAP_CHANGE_EVENT, handleBasemapChange);
    window.addEventListener('storage', handleBasemapChange);

    return () => {
      window.removeEventListener(BASEMAP_CHANGE_EVENT, handleBasemapChange);
      window.removeEventListener('storage', handleBasemapChange);
    };
  }, [basemapId]);

  if (option.layer === 'google') {
    return <GoogleMapLayer type={option.type} />;
  }

  return (
    <TileLayer
      attribution={option.attribution}
      maxZoom={option.maxZoom ?? 19}
      url={option.url}
    />
  );
}
