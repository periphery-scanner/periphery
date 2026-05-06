import React, { useEffect, useState } from 'react';
import {
  FlatList,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { startScanning } from './src/ble/scanner';
import { calculateScore } from './src/score/calculator';
import { useScanStore } from './src/store/scanStore';
import { DeviceCategory } from './src/ble/types';
import { TierDisplay } from './src/ui/TierDisplay';
import { AsymmetricFlag } from './src/ui/AsymmetricFlag';
import { DrillDownModal } from './src/ui/DrillDownModal';
import { WearableDetailModal } from './src/ui/WearableDetailModal';
import { MapScreen } from './src/map/MapScreen';

const CATEGORY_LABELS: Record<DeviceCategory, string> = {
  phone: 'Phones',
  earbud: 'Earbuds',
  wearable_low: 'Wearables (watch/band)',
  wearable_high: 'Smart glasses / camera wearable',
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
  const [drillDownOpen, setDrillDownOpen] = useState(false);
  const [wearableDetailOpen, setWearableDetailOpen] = useState(false);
  const [showMap, setShowMap] = useState(false);

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

  // Map view replaces the main screen — BLE scanning continues in App hooks above.
  if (showMap) {
    return <MapScreen onBack={() => setShowMap(false)} />;
  }

  const breakdown = calculateScore(observations);
  const { tier, byCategory, observationCount, highAsymmetryFlag } = breakdown;

  const rows = Object.entries(byCategory) as [DeviceCategory, number][];
  const wearableObservations = observations.filter(
    (o) => o.category === 'wearable_high'
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.title}>Periphery</Text>

      <TierDisplay tier={tier} onPress={() => setDrillDownOpen(true)} />

      {highAsymmetryFlag && (
        <AsymmetricFlag onPress={() => setWearableDetailOpen(true)} />
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

      <DrillDownModal
        visible={drillDownOpen}
        breakdown={breakdown}
        onClose={() => setDrillDownOpen(false)}
      />

      <WearableDetailModal
        visible={wearableDetailOpen}
        observations={wearableObservations}
        onClose={() => setWearableDetailOpen(false)}
      />

      {/* FAB — temporary entry point for map view. Phase 3c replaces with tab toggle. */}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.75 }]}
        onPress={() => setShowMap(true)}
        accessibilityLabel="Open radial map view"
        accessibilityRole="button"
      >
        <Text style={styles.fabIcon}>◎</Text>
      </Pressable>
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
    marginBottom: 4,
    letterSpacing: 1,
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
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1A2040',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  fabIcon: {
    color: '#7CBFB0',
    fontSize: 24,
  },
});
