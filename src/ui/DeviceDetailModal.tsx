import React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { DeviceObservation, DeviceCategory } from '../ble/types';
import { getManufacturerName } from '../ble/fingerprints';
import { renderReason, getConfidenceTier } from './reasonRendering';

const CATEGORY_LABELS: Record<DeviceCategory, string> = {
  phone:          'Phone',
  earbud:         'Earbuds',
  wearable_low:   'Wearable (watch/band)',
  wearable_high:  'Camera wearable',
  doorbell:       'Smart doorbell',
  home_camera:    'Home camera',
  speaker_mic:    'Smart speaker',
  vehicle:        'Vehicle',
  tracker:        'Tracker',
  unknown:        'Unknown',
};

const CATEGORY_COLORS: Record<DeviceCategory, string> = {
  phone:          '#7CBFB0',
  earbud:         '#7AAAC0',
  wearable_low:   '#C8B870',
  wearable_high:  '#D97757',
  doorbell:       '#B86860',
  home_camera:    '#B86860',
  speaker_mic:    '#C8904A',
  vehicle:        '#8B949E',
  tracker:        '#58A6FF',
  unknown:        '#444C56',
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
  color: string;
}

function SignalBars({ rssi, color }: SignalBarsProps) {
  const filled = signalBarCount(rssi);
  const dimColor = color + '33';
  return (
    <View style={barStyles.row} accessibilityLabel={`${filled} of 4 signal bars`}>
      {[1, 2, 3, 4].map((n) => (
        <View
          key={n}
          style={[
            barStyles.bar,
            { height: 6 + n * 3 },
            { backgroundColor: n <= filled ? color : dimColor },
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
});

interface Props {
  visible: boolean;
  observation: DeviceObservation | null;
  onClose: () => void;
}

export function DeviceDetailModal({ visible, observation, onClose }: Props) {
  if (!observation) return null;

  const color = CATEGORY_COLORS[observation.category];
  const manufacturer = getManufacturerName(observation.manufacturerId);
  const shortId = observation.id.slice(0, 4) + '…';
  const rendered = renderReason(observation.reason);
  const tier = getConfidenceTier(observation.confidence);
  const tierLabel = tier === 'high' ? 'High' : tier === 'medium' ? 'Medium' : 'Low';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <View style={styles.headerText}>
            <Text style={[styles.categoryLabel, { color }]}>
              {CATEGORY_LABELS[observation.category]}
            </Text>
            {!manufacturer.startsWith('Unknown') && (
              <Text style={styles.manufacturer}>{manufacturer}</Text>
            )}
          </View>
          <Pressable onPress={onClose} style={styles.closeButton} hitSlop={12}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          <View style={styles.row}>
            <SignalBars rssi={observation.rssi} color={color} />
            <Text style={styles.value}>{observation.rssi} dBm</Text>
            <Text style={styles.sep}>·</Text>
            <Text style={styles.value}>{formatDistance(observation.estimatedDistanceM)}</Text>
            <Text style={styles.sep}>·</Text>
            <Text style={styles.value}>{formatAge(observation.lastSeenAt)}</Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Confidence</Text>
            <Text style={styles.metaValue}>
              {Math.round(observation.confidence * 100)}%
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>ID</Text>
            <Text style={[styles.metaValue, styles.mono]}>{shortId}</Text>
          </View>

          {/* ── Why flagged ───────────────────────────────────────────── */}
          <View style={styles.whySection}>
            <Text style={styles.whySectionLabel}>Why flagged</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Signal</Text>
              <Text
                style={[styles.metaValue, styles.signalValue]}
                numberOfLines={2}
              >
                {rendered.signal}
              </Text>
            </View>
            <View style={[styles.metaRow, styles.metaRowLast]}>
              <Text style={styles.metaLabel}>Tier</Text>
              <Text style={styles.metaValue}>
                {tierLabel}
              </Text>
            </View>
            <Text style={styles.whyExplanation}>{rendered.explanation}</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#30363d',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#21262d',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
    marginTop: 2,
  },
  headerText: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 17,
    fontWeight: '600',
  },
  manufacturer: {
    color: '#8b949e',
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
    marginLeft: 12,
  },
  closeText: {
    color: '#8b949e',
    fontSize: 16,
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  value: {
    color: '#c9d1d9',
    fontSize: 14,
  },
  sep: {
    color: '#8b949e',
    marginHorizontal: 8,
    fontSize: 14,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#21262d',
  },
  metaLabel: {
    color: '#8b949e',
    fontSize: 14,
  },
  metaValue: {
    color: '#c9d1d9',
    fontSize: 14,
  },
  mono: {
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier New',
  },
  whySection: {
    marginTop: 8,
  },
  whySectionLabel: {
    color: '#8b949e',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingTop: 16,
    paddingBottom: 6,
  },
  signalValue: {
    flex: 1,
    textAlign: 'right',
    paddingLeft: 12,
    fontSize: 13,
  },
  metaRowLast: {
    borderBottomWidth: 0,
  },
  whyExplanation: {
    color: '#8b949e',
    fontSize: 13,
    lineHeight: 20,
    paddingTop: 14,
    paddingBottom: 8,
  },
});
