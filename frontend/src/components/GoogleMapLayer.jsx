import { useEffect, useState } from 'react';
import GoogleMutant from 'leaflet.gridlayer.googlemutant/src/Leaflet.GoogleMutant.mjs';
import { TileLayer, useMap } from 'react-leaflet';
import { appConfig } from '../config';

const GOOGLE_MAPS_SCRIPT_ID = 'google-maps-javascript-api';

let googleMapsLoader = null;

function loadGoogleMaps(apiKey) {
  if (window.google?.maps) {
    return Promise.resolve();
  }

  if (googleMapsLoader) {
    return googleMapsLoader;
  }

  googleMapsLoader = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);

    if (existingScript) {
      existingScript.addEventListener('load', resolve, { once: true });
      existingScript.addEventListener('error', reject, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return googleMapsLoader;
}

export function GoogleMapLayer({ type = appConfig.googleMapType }) {
  const map = useMap();
  const [isReady, setIsReady] = useState(Boolean(window.google?.maps));
  const [hasLoadError, setHasLoadError] = useState(false);
  const apiKey = appConfig.googleMapsApiKey;

  useEffect(() => {
    if (!apiKey) {
      setHasLoadError(true);
      return;
    }

    loadGoogleMaps(apiKey)
      .then(() => setIsReady(true))
      .catch(() => setHasLoadError(true));
  }, [apiKey]);

  useEffect(() => {
    if (!isReady || hasLoadError) {
      return undefined;
    }

    let googleLayer;

    try {
      googleLayer = new GoogleMutant({ type });
    } catch {
      setHasLoadError(true);
      return undefined;
    }

    googleLayer.addTo(map);

    return () => {
      map.removeLayer(googleLayer);
    };
  }, [hasLoadError, isReady, map, type]);

  if (hasLoadError) {
    return (
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
    );
  }

  return null;
}
