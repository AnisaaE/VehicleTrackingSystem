import { useEffect, useMemo, useState } from 'react';
import { createVehicleLocationConnection, fetchVehicles, fetchProviders } from './api';

export function useVehicleLocations(providerCode) {
  const [vehicles, setVehicles] = useState([]);
  const [providers, setProviders] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProviders() {
      try {
        const nextProviders = await fetchProviders();

        if (isMounted) {
          setProviders(nextProviders);
        }
      } catch (providerError) {
        if (isMounted) {
          setError(providerError.message);
        }
      }
    }

    loadProviders();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const connection = createVehicleLocationConnection(
      nextVehicles => {
        if (!isMounted) {
          return;
        }

        setVehicles(nextVehicles);
        setLastUpdatedAt(new Date());
        setConnectionStatus('connected');
        setError(null);
      },
      setConnectionStatus,
      nextConnection => nextConnection.invoke('SubscribeToProvider', providerCode)
    );

    async function start() {
      try {
        setVehicles([]);
        const initialVehicles = await fetchVehicles(providerCode);

        if (isMounted) {
          setVehicles(initialVehicles);
          setLastUpdatedAt(new Date());
        }
      } catch (initialError) {
        if (isMounted) {
          setError(initialError.message);
        }
      }

      try {
        await connection.start();
        await connection.invoke('SubscribeToProvider', providerCode);

        if (isMounted) {
          setConnectionStatus('connected');
        }
      } catch (connectionError) {
        if (isMounted) {
          setConnectionStatus('disconnected');
          setError(connectionError.message);
        }
      }
    }

    start();

    return () => {
      isMounted = false;
      connection.stop();
    };
  }, [providerCode]);

  return useMemo(
    () => ({
      vehicles,
      providers,
      connectionStatus,
      lastUpdatedAt,
      error
    }),
    [vehicles, providers, connectionStatus, lastUpdatedAt, error]
  );
}
