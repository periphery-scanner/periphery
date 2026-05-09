import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSettingsStore } from '../../store/settingsStore';

export function DistanceUnitSection() {
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);
  const setDistanceUnit = useSettingsStore((s) => s.setDistanceUnit);

  return (
    <View style={styles.section}>
      <Text style={styles.header}>DISTANCE UNIT</Text>
      <Text style={styles.description}>
        How distances are displayed throughout Periphery.
      </Text>

      <View style={styles.segmentedControl}>
        <Pressable
          style={[styles.segment, distanceUnit === 'feet' && styles.segmentActive]}
          onPress={() => setDistanceUnit('feet')}
          accessibilityRole="radio"
          accessibilityState={{ checked: distanceUnit === 'feet' }}
          accessibilityLabel="Feet"
        >
          <Text style={[styles.segmentLabel, distanceUnit === 'feet' && styles.segmentLabelActive]}>
            Feet
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segment, distanceUnit === 'meters' && styles.segmentActive]}
          onPress={() => setDistanceUnit('meters')}
          accessibilityRole="radio"
          accessibilityState={{ checked: distanceUnit === 'meters' }}
          accessibilityLabel="Meters"
        >
          <Text style={[styles.segmentLabel, distanceUnit === 'meters' && styles.segmentLabelActive]}>
            Meters
          </Text>
        </Pressable>
      </View>

      <View style={styles.separator} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },
  header: {
    color: '#6a7480',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  description: {
    color: '#8b949e',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 10,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  segmentLabel: {
    color: '#6a7480',
    fontSize: 14,
    fontWeight: '500',
  },
  segmentLabelActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginTop: 20,
  },
});
