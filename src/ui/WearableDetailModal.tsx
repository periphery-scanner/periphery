import React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { DeviceObservation } from '../ble/types';

const MANUFACTURER_NAMES: Partial<Record<number, string>> = {
  0x004C: 'Apple',
  0x00E0: 'Google',
  0x0006: 'Microsoft',
  0x0075: 'Samsung',
  0x0171: 'Amazon',
  0x0644: 'Meta',
  0x0218: 'Sonos',
  0x0067: 'Tile',
  0x05F1: 'Tesla',
  0x009E: 'Bose',
  0x0087: 'Garmin',
  0x0085: 'GoPro',
};

function signalBarCount(rssi: number): number {
  if (rssi >= -60) return 4;
  if (rssi >= -70) return 3;
  if (rssi >= -80) return 2;
  return 1;
}

function formatAge(lastSeenAt: number): string {
  const s = Math.floor((Date.now() - lastSeenAt) / 1000);
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

function formatDistance(m: number): string {
  if (m < 1) return '<1 m';
  return `~${Math.round(m)} m`;
}

interface SignalBarsProps {
  rssi: number;
}

function SignalBars({ rssi }: SignalBarsProps) {
  const filled = signalBarCount(rssi);
  return (
    <View style={barStyles.row} accessibilityLabel={`${filled} of 4 signal bars`}>
      {[1, 2, 3, 4].map((n) => (
        <View
          key={n}
          style={[
            barStyles.bar,
            { height: 6 + n * 3 },
            n <= filled ? barStyles.barFilled : barStyles.barEmpty,
          ]}
        />
      ))}
    </View>
  );
}

const barStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginRight: 8,
    gap: 3,
  },
  bar: {
    width: 5,
    borderRadius: 1,
  },
  barFilled: {
    backgroundColor: '#e87070',
  },
  barEmpty: {
    backgroundColor: '#3a2020',
  },
});

interface Props {
  visible: boolean;
  observations: DeviceObservation[];
  onClose: () => void;
}

export function WearableDetailModal({ visible, observations, onClose }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Camera Wearables Detected</Text>
          <Pressable onPress={onClose} style={styles.closeButton} hitSlop={12}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.subheading}>
            These devices are capable of unannounced recording at face height.
          </Text>

          {observations.map((obs) => {
            const manufacturer = MANUFACTURER_NAMES[obs.manufacturerId];
            const shortId = obs.id.slice(0, 4) + '…';
            return (
              <View key={obs.id} style={styles.card}>
                {manufacturer !== undefined && (
                  <Text style={styles.manufacturer}>{manufacturer}</Text>
                )}
                <Text style={styles.idText}>ID {shortId}</Text>
                <View style={styles.statsRow}>
                  <SignalBars rssi={obs.rssi} />
                  <Text style={styles.stat}>{obs.rssi} dBm</Text>
                  <Text style={styles.separator}>·</Text>
                  <Text style={styles.stat}>{formatDistance(obs.estimatedDistanceM)}</Text>
                  <Text style={styles.separator}>·</Text>
                  <Text style={styles.stat}>{formatAge(obs.lastSeenAt)}</Text>
                </View>
                <Text style={styles.confidence}>
                  Confidence: {Math.round(obs.confidence * 100)}%
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#21262d',
  },
  headerTitle: {
    color: '#c9d1d9',
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    paddingRight: 12,
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    color: '#8b949e',
    fontSize: 16,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 48,
  },
  subheading: {
    color: '#8b949e',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#161b22',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#30363d',
  },
  manufacturer: {
    color: '#e87070',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  idText: {
    color: '#8b949e',
    fontSize: 12,
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier New',
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stat: {
    color: '#c9d1d9',
    fontSize: 13,
  },
  separator: {
    color: '#8b949e',
    marginHorizontal: 6,
  },
  confidence: {
    color: '#8b949e',
    fontSize: 12,
  },
});
