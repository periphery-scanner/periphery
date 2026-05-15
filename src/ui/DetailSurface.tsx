import React, { useRef, useState } from 'react';
import {
  Animated,
  LayoutAnimation,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { ScoreBreakdown } from '../score/calculator';
import { ScoreHistorySample } from '../store/scanStore';
import { DeviceObservation, DeviceCategory } from '../ble/types';
import { TIER_COLORS } from './tiers';
import { Sparkline } from './Sparkline';
import { getManufacturerName } from '../ble/fingerprints';

// LayoutAnimation requires this flag on pre-new-arch Android builds
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CATEGORY_LABELS: Record<DeviceCategory, string> = {
  phone:         'Phones',
  earbud:        'Earbuds',
  wearable_low:  'Wearables (watch/band)',
  wearable_high: 'Camera wearables',
  doorbell:      'Smart doorbells',
  home_camera:   'Home cameras',
  speaker_mic:   'Smart speakers',
  vehicle:       'Vehicles',
  tracker:       'Trackers',
  unknown:       'Unknown',
};

function scoreContext(score: number): string {
  if (score >= 80) return 'The environment appears clear.';
  if (score >= 60) return 'Low background device density.';
  if (score >= 40) return 'Moderate number of recording-capable devices.';
  if (score >= 20) return 'High device density. Consider your surroundings.';
  return 'Saturated environment. Multiple high-risk devices present.';
}

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

function SignalBars({ rssi }: { rssi: number }) {
  const filled = signalBarCount(rssi);
  return (
    <View style={barStyles.row} accessibilityLabel={`${filled} of 4 bars`}>
      {[1, 2, 3, 4].map((n) => (
        <View
          key={n}
          style={[
            barStyles.bar,
            { height: 5 + n * 3 },
            { backgroundColor: n <= filled ? '#D97757' : '#3a2010' },
          ]}
        />
      ))}
    </View>
  );
}

const barStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', marginRight: 8, gap: 3 },
  bar: { width: 4, borderRadius: 1 },
});

interface Props {
  visible: boolean;
  breakdown: ScoreBreakdown;
  scoreHistory: ScoreHistorySample[];
  wearableObservations: DeviceObservation[];
  onClose: () => void;
  onOpenMethodology: () => void;
  onDevicePress: (obs: DeviceObservation) => void;
}

export function DetailSurface({
  visible,
  breakdown,
  scoreHistory,
  wearableObservations,
  onClose,
  onOpenMethodology,
  onDevicePress,
}: Props) {
  const [methodologyExpanded, setMethodologyExpanded] = useState(false);
  const translateY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dy, dx }) =>
        dy > 8 && Math.abs(dy) > Math.abs(dx),
      onPanResponderMove: (_, { dy }) => {
        if (dy > 0) translateY.setValue(dy);
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        if (dy > 80 || vy > 0.5) {
          translateY.setValue(0);
          onClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 140,
            friction: 12,
          }).start();
        }
      },
    })
  ).current;

  const toggleMethodology = () => {
    LayoutAnimation.easeInEaseOut();
    setMethodologyExpanded((v) => !v);
  };

  const { score, tier, rawThreatLevel, byCategory, observationCount } = breakdown;
  const tierColor = TIER_COLORS[tier];
  const categoryRows = Object.entries(byCategory) as [DeviceCategory, number][];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Backdrop tap to close */}
        <Pressable style={styles.backdrop} onPress={onClose} />

        {/* Sheet */}
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY }] }]}
        >
          {/* Drag handle — pan responder only on this area */}
          <View style={styles.handleArea} {...panResponder.panHandlers}>
            <View style={styles.handle} />
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* ── Wearable section (only when wearable_high present) ── */}
            {wearableObservations.length > 0 && (
              <View style={styles.wearableSection}>
                <Text style={styles.wearableHeader}>
                  Camera wearables detected
                </Text>
                {wearableObservations.map((obs) => {
                  const manufacturer = getManufacturerName(obs.manufacturerId);
                  return (
                    <TouchableOpacity
                      key={obs.id}
                      style={styles.wearableCard}
                      onPress={() => onDevicePress(obs)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.wearableCardRow}>
                        <View style={styles.wearableCardContent}>
                          {!manufacturer.startsWith('Unknown') && (
                            <Text style={styles.wearableManufacturer}>
                              {manufacturer}
                            </Text>
                          )}
                          <Text style={styles.wearableId}>
                            ID {obs.id.slice(0, 4)}…
                          </Text>
                          <View style={styles.wearableStats}>
                            <SignalBars rssi={obs.rssi} />
                            <Text style={styles.statText}>{obs.rssi} dBm</Text>
                            <Text style={styles.statSep}> · </Text>
                            <Text style={styles.statText}>
                              {formatDistance(obs.estimatedDistanceM)}
                            </Text>
                            <Text style={styles.statSep}> · </Text>
                            <Text style={styles.statText}>
                              {formatAge(obs.lastSeenAt)}
                            </Text>
                          </View>
                          <Text style={styles.wearableConfidence}>
                            Confidence: {Math.round(obs.confidence * 100)}%
                          </Text>
                        </View>
                        <Text style={styles.wearableChevron}>›</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                <View style={styles.divider} />
              </View>
            )}

            {/* ── Score ── */}
            <Text style={[styles.scoreNumber, { color: tierColor }]}>
              {score}%
            </Text>
            <Text style={styles.scoreSubtitle}>{scoreContext(score)}</Text>

            <View style={styles.divider} />

            {/* ── Category breakdown ── */}
            <Text style={styles.sectionLabel}>
              {observationCount}{' '}
              {observationCount === 1 ? 'device' : 'devices'} in range
            </Text>
            {categoryRows.map(([cat, count]) => (
              <View key={cat} style={styles.categoryRow}>
                <Text style={styles.categoryLabel}>{CATEGORY_LABELS[cat]}</Text>
                <Text style={styles.categoryCount}>{count}</Text>
              </View>
            ))}
            {categoryRows.length === 0 && (
              <Text style={styles.empty}>No devices detected.</Text>
            )}

            <View style={styles.divider} />

            {/* ── Sparkline ── */}
            <Text style={styles.sectionLabel}>Past 10 min</Text>
            <Sparkline samples={scoreHistory} tier={tier} />

            <View style={styles.divider} />

            {/* ── Methodology (collapsible) ── */}
            <Pressable
              style={styles.methodologyHeader}
              onPress={toggleMethodology}
              accessibilityRole="button"
              accessibilityState={{ expanded: methodologyExpanded }}
            >
              <Text style={styles.methodologyHeaderText}>
                Technical details
              </Text>
              <Text style={styles.methodologyChevron}>
                {methodologyExpanded ? '›' : '›'}
              </Text>
            </Pressable>
            {methodologyExpanded && (
              <View style={styles.methodologyBody}>
                <Text style={styles.methodologyValue}>
                  Raw threat level: {rawThreatLevel.toFixed(1)}
                </Text>
                <Text style={styles.methodologyNote}>
                  Score = 100 ÷ (1 + threat ÷ 10). Devices weighted by
                  category risk, distance falloff, and classification
                  confidence. 60 s rolling expiry window.
                </Text>
              </View>
            )}

            <View style={styles.divider} />

            {/* Methodology deep-dive — opens WhyClassifiedPage at MapScreen level
                (sibling Modal, not nested) to avoid Android back-button mis-routing */}
            <Pressable
              style={({ pressed }) => [
                styles.methodologyLink,
                pressed && styles.methodologyLinkPressed,
              ]}
              onPress={onOpenMethodology}
              accessibilityRole="button"
              accessibilityLabel="How Periphery classifies devices"
            >
              <Text style={styles.methodologyLinkText}>
                How Periphery classifies devices
              </Text>
              <Text style={styles.methodologyLinkChevron}>→</Text>
            </Pressable>

            <View style={styles.bottomPad} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#0d1117',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '78%',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#21262d',
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#30363d',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },

  // ── Wearable section ──────────────────────────────────────────────────
  wearableSection: {
    marginBottom: 4,
  },
  wearableHeader: {
    color: '#D97757',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  wearableCard: {
    backgroundColor: '#161b22',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(217, 119, 87, 0.25)',
  },
  wearableCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wearableCardContent: {
    flex: 1,
  },
  wearableChevron: {
    color: '#6a7480',
    fontSize: 18,
    marginLeft: 10,
  },
  wearableManufacturer: {
    color: '#D97757',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  wearableId: {
    color: '#8b949e',
    fontSize: 11,
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier New',
    marginBottom: 8,
  },
  wearableStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statText: { color: '#c9d1d9', fontSize: 13 },
  statSep: { color: '#8b949e', fontSize: 13 },
  wearableConfidence: {
    color: '#8b949e',
    fontSize: 12,
  },

  // ── Score ─────────────────────────────────────────────────────────────
  scoreNumber: {
    fontSize: 72,
    fontWeight: '300',
    textAlign: 'center',
    lineHeight: 80,
    letterSpacing: 1,
    marginTop: 8,
  },
  scoreSubtitle: {
    color: '#8b949e',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 4,
    lineHeight: 20,
  },

  // ── Category breakdown ────────────────────────────────────────────────
  sectionLabel: {
    color: '#c9d1d9',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#21262d',
  },
  categoryLabel: {
    color: '#c9d1d9',
    fontSize: 14,
    flex: 1,
    paddingRight: 8,
  },
  categoryCount: {
    color: '#58a6ff',
    fontSize: 14,
    fontWeight: '700',
  },
  empty: {
    color: '#8b949e',
    fontSize: 14,
    marginTop: 8,
  },

  // ── Methodology ───────────────────────────────────────────────────────
  methodologyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  methodologyHeaderText: {
    color: '#8b949e',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  methodologyChevron: {
    color: '#8b949e',
    fontSize: 16,
  },
  methodologyBody: {
    paddingTop: 10,
  },
  methodologyValue: {
    color: '#8b949e',
    fontSize: 13,
    marginBottom: 8,
  },
  methodologyNote: {
    color: '#8b949e',
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.8,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#21262d',
    marginVertical: 20,
  },
  bottomPad: {
    height: 32,
  },

  // ── Methodology link ──────────────────────────────────────────────────────
  methodologyLink: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  methodologyLinkPressed: {
    opacity: 0.6,
  },
  methodologyLinkText: {
    color: '#6a7480',
    fontSize: 13,
    flex: 1,
  },
  methodologyLinkChevron: {
    color: '#6a7480',
    fontSize: 13,
  },
});
