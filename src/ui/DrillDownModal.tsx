import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ScoreBreakdown } from '../score/calculator';
import { TIER_COLORS } from './tiers';
import { DeviceCategory } from '../ble/types';

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

function scoreContext(score: number): string {
  if (score >= 80) return 'The environment appears clear.';
  if (score >= 60) return 'Low background device density.';
  if (score >= 40) return 'Moderate number of recording-capable devices.';
  if (score >= 20) return 'High device density. Consider your surroundings.';
  return 'Saturated environment. Multiple high-risk devices present.';
}

interface Props {
  visible: boolean;
  breakdown: ScoreBreakdown;
  onClose: () => void;
}

export function DrillDownModal({ visible, breakdown, onClose }: Props) {
  const { score, tier, rawThreatLevel, byCategory, observationCount } = breakdown;
  const tierColor = TIER_COLORS[tier];
  const rows = Object.entries(byCategory) as [DeviceCategory, number][];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Anonymity Score</Text>
          <Pressable onPress={onClose} style={styles.closeButton} hitSlop={12}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.scoreNumber, { color: tierColor }]}>{score}%</Text>
          <Text style={styles.scoreSubtitle}>{scoreContext(score)}</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>
            {observationCount} device{observationCount !== 1 ? 's' : ''} in range
          </Text>

          {rows.map(([cat, count]) => (
            <View key={cat} style={styles.row}>
              <Text style={styles.rowLabel}>{CATEGORY_LABELS[cat]}</Text>
              <Text style={styles.rowCount}>{count}</Text>
            </View>
          ))}

          {rows.length === 0 && (
            <Text style={styles.empty}>No devices detected.</Text>
          )}

          <View style={styles.divider} />

          <Text style={styles.technicalLabel}>Technical</Text>
          <Text style={styles.technicalValue}>
            Raw threat level: {rawThreatLevel.toFixed(1)}
          </Text>
          <Text style={styles.technicalNote}>
            Score = 100 ÷ (1 + threat ÷ 10). Devices are weighted by category
            risk, distance, and classification confidence. Expiry: 60 s rolling
            window.
          </Text>
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
    paddingTop: 32,
    paddingBottom: 48,
  },
  scoreNumber: {
    fontSize: 80,
    fontWeight: '300',
    textAlign: 'center',
    lineHeight: 88,
    letterSpacing: 1,
  },
  scoreSubtitle: {
    color: '#8b949e',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
    lineHeight: 20,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#21262d',
    marginVertical: 24,
  },
  sectionLabel: {
    color: '#c9d1d9',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#21262d',
  },
  rowLabel: {
    color: '#c9d1d9',
    fontSize: 14,
    flex: 1,
    paddingRight: 8,
  },
  rowCount: {
    color: '#58a6ff',
    fontSize: 14,
    fontWeight: '700',
  },
  empty: {
    color: '#8b949e',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
  technicalLabel: {
    color: '#8b949e',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  technicalValue: {
    color: '#8b949e',
    fontSize: 13,
    marginBottom: 8,
  },
  technicalNote: {
    color: '#8b949e',
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.8,
  },
});
