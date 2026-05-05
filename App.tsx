import React, { useEffect, useState } from 'react';
import {
  FlatList,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { startScanning } from './src/ble/scanner';
import { calculateScore } from './src/score/calculator';
import { useScanStore } from './src/store/scanStore';
import { DeviceCategory } from './src/ble/types';

const CATEGORY_LABELS: Record<DeviceCategory, string> = {
  phone: 'Phones',
  earbud: 'Earbuds',
  wearable_low: 'Wearables (watch/band)',
  wearable_high: '⚠ Smart glasses / camera wearable',
  doorbell: 'Smart doorbells',
  home_camera: 'Home cameras',
  speaker_mic: 'Smart speakers',
  vehicle: 'Vehicles',
  tracker: 'Trackers (AirTag/Tile)',
  unknown: 'Unknown',
};

async function requestBlePermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const results = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    // BLUETOOTH_SCAN and BLUETOOTH_CONNECT are Android 12+ (API 31+)
    'android.permission.BLUETOOTH_SCAN' as any,
    'android.permission.BLUETOOTH_CONNECT' as any,
  ]);
  return Object.values(results).every(
    (r) => r === PermissionsAndroid.RESULTS.GRANTED
  );
}

export default function App() {
  const { observations, upsertObservation, purgeExpired } = useScanStore();
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [permissionError, setPermissionError] = useState(false);

  useEffect(() => {
    requestBlePermissions().then((granted) => {
      if (granted) {
        setPermissionsGranted(true);
      } else {
        setPermissionError(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!permissionsGranted) return;
    const stop = startScanning(upsertObservation);
    return stop;
  }, [permissionsGranted, upsertObservation]);

  // Backstop purge: removes stale observations on a regular interval even
  // during quiet periods when upsertObservation is not being called.
  useEffect(() => {
    const id = setInterval(purgeExpired, 5_000);
    return () => clearInterval(id);
  }, [purgeExpired]);

  const { score, byCategory, observationCount, highAsymmetryFlag } =
    calculateScore(observations);

  const rows = Object.entries(byCategory) as [DeviceCategory, number][];

  const scoreColor =
    score >= 70 ? '#3fb950' : score >= 40 ? '#d29922' : '#f85149';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.title}>Periphery</Text>

      <Text style={[styles.score, { color: scoreColor }]}>{score}</Text>
      <Text style={styles.scoreLabel}>out of 100</Text>

      {highAsymmetryFlag && (
        <Text style={styles.warning}>
          ⚠ High-asymmetry device in range (smart glasses / camera wearable)
        </Text>
      )}

      <Text style={styles.sectionHeader}>
        {observationCount} device{observationCount !== 1 ? 's' : ''} detected
      </Text>

      {rows.length === 0 ? (
        <Text style={styles.empty}>
          {permissionError
            ? 'Bluetooth and Location permissions are required.'
            : 'Scanning… walk around to detect devices.'}
        </Text>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={([cat]) => cat}
          renderItem={({ item: [cat, count] }) => (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{CATEGORY_LABELS[cat]}</Text>
              <Text style={styles.rowCount}>{count}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
    paddingTop: 64,
    paddingHorizontal: 24,
  },
  title: {
    color: '#58a6ff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 1,
  },
  score: {
    fontSize: 96,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 100,
  },
  scoreLabel: {
    color: '#8b949e',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  warning: {
    color: '#f85149',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  sectionHeader: {
    color: '#c9d1d9',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 8,
  },
  empty: {
    color: '#8b949e',
    textAlign: 'center',
    marginTop: 32,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#21262d',
  },
  rowLabel: { color: '#c9d1d9', fontSize: 14, flex: 1, paddingRight: 8 },
  rowCount: { color: '#58a6ff', fontSize: 14, fontWeight: '700' },
});
