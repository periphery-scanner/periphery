import React, { useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { startScanning } from './src/ble/scanner';
import { calculateScore } from './src/score/calculator';
import { useScanStore } from './src/store/scanStore';
import { DeviceObservation } from './src/ble/types';
import { MapScreen } from './src/map/MapScreen';

const SCORE_SAMPLE_INTERVAL_MS = 30_000;

async function requestBlePermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const results = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    'android.permission.BLUETOOTH_SCAN' as any,
    'android.permission.BLUETOOTH_CONNECT' as any,
  ]);
  return Object.values(results).every(
    (r) => r === PermissionsAndroid.RESULTS.GRANTED
  );
}

export default function App() {
  const { observations, upsertObservation, purgeExpired, recordScore } = useScanStore();
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const observationsRef = useRef<DeviceObservation[]>(observations);

  // Keep ref in sync so the score sampling interval never closes over stale observations
  useEffect(() => {
    observationsRef.current = observations;
  }, [observations]);

  useEffect(() => {
    requestBlePermissions().then((granted) => {
      if (granted) setPermissionsGranted(true);
    });
  }, []);

  useEffect(() => {
    if (!permissionsGranted) return;
    const stop = startScanning(upsertObservation);
    return stop;
  }, [permissionsGranted, upsertObservation]);

  // Backstop purge: clears stale observations during quiet BLE periods
  useEffect(() => {
    const id = setInterval(purgeExpired, 5_000);
    return () => clearInterval(id);
  }, [purgeExpired]);

  // Sample score every 30s to build sparkline history
  useEffect(() => {
    const id = setInterval(() => {
      const { score } = calculateScore(observationsRef.current);
      recordScore(score);
    }, SCORE_SAMPLE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [recordScore]);

  return (
    <>
      <StatusBar style="light" />
      <MapScreen permissionsGranted={permissionsGranted} />
    </>
  );
}
