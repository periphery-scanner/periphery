import React, { useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { startScanning } from './src/ble/scanner';
import { calculateScore } from './src/score/calculator';
import { useScanStore } from './src/store/scanStore';
import { useSettingsStore } from './src/store/settingsStore';
import { DeviceObservation } from './src/ble/types';
import { MapScreen } from './src/map/MapScreen';
import { OnboardingScreen } from './src/ui/OnboardingScreen';
import {
  dispatchWearableAlert,
} from './src/notifications/wearableAlertDispatcher';

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

  // Settings — single-value selectors (object selector causes infinite re-render loop;
  // see Phase 3d commit for details)
  const hydrated = useSettingsStore((s) => s.hydrated);
  const hasCompletedOnboarding = useSettingsStore((s) => s.hasCompletedOnboarding);
  const wearableNotificationsEnabled = useSettingsStore((s) => s.wearableNotificationsEnabled);
  const lastNotificationFiredAt = useSettingsStore((s) => s.lastNotificationFiredAt);
  const setLastNotificationFiredAt = useSettingsStore((s) => s.setLastNotificationFiredAt);

  // Keep ref in sync so score sampling interval never closes over stale observations
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

  // Set up Android notification channel on mount. Idempotent — safe to call every launch.
  // Platform guard: channel API is Android-specific; iOS does not use channels.
  useEffect(() => {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('wearable-alerts', {
        name: 'Camera Wearable Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#D97757',
      });
    }
  }, []);

  // Wearable alert dispatcher — fires on every observations change, fast no-ops when
  // conditions aren't met (notifications disabled, no new wearable, cooldown active)
  const prevObservationsRef = useRef<DeviceObservation[]>([]);
  useEffect(() => {
    dispatchWearableAlert(
      observations,
      prevObservationsRef.current,
      { wearableNotificationsEnabled, lastNotificationFiredAt },
      () => setLastNotificationFiredAt(Date.now()),
    );
    prevObservationsRef.current = observations;
  }, [observations, wearableNotificationsEnabled, lastNotificationFiredAt, setLastNotificationFiredAt]);

  // While store is hydrating from AsyncStorage, render a blank dark screen.
  // This prevents a ~100ms flash of the onboarding screen for returning users
  // (hasCompletedOnboarding defaults to false before hydration resolves).
  if (!hydrated) {
    return <View style={{ flex: 1, backgroundColor: '#0d1117' }} />;
  }

  return (
    <>
      <StatusBar style="light" />
      {hasCompletedOnboarding
        ? <MapScreen permissionsGranted={permissionsGranted} />
        : <OnboardingScreen />
      }
    </>
  );
}
