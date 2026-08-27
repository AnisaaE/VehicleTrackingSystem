function parseNumber(value, fallback) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

export const appConfig = {
  municipalityName: import.meta.env.VITE_MUNICIPALITY_NAME ?? 'Municipality',
  appTitle: import.meta.env.VITE_APP_TITLE ?? 'Vehicle Tracking System',
  defaultProviderCode: import.meta.env.VITE_DEFAULT_PROVIDER_CODE ?? '',
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '',
  googleMapType: import.meta.env.VITE_GOOGLE_MAP_TYPE ?? 'hybrid',
  mapCenter: [
    parseNumber(import.meta.env.VITE_MAP_CENTER_LATITUDE, 40.765),
    parseNumber(import.meta.env.VITE_MAP_CENTER_LONGITUDE, 29.94)
  ],
  mapZoom: parseNumber(import.meta.env.VITE_MAP_ZOOM, 12)
};
