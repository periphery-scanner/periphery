import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { TierLevel } from '../score/calculator';
import { TIER_COLORS } from './tiers';

interface Props {
  tier: TierLevel;
  deviceCount: number;
  wearableCount: number;
  onPress: () => void;
}

export function OverlayBadge({ tier, deviceCount, wearableCount, onPress }: Props) {
  const tierColor = TIER_COLORS[tier];
  const hasWearable = wearableCount > 0;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.badge,
        hasWearable && styles.badgeElevated,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${tier}, ${deviceCount} ${deviceCount === 1 ? 'device' : 'devices'} detected${hasWearable ? `, ${wearableCount} camera wearable${wearableCount !== 1 ? 's' : ''}` : ''}. Tap for details.`}
    >
      <Text style={[styles.tier, { color: tierColor }]}>{tier}</Text>
      <Text style={styles.sep}> · </Text>
      <Text style={styles.count}>
        {deviceCount}{' '}
        {deviceCount === 1 ? 'device' : 'devices'}
      </Text>
      {hasWearable && (
        <>
          <Text style={styles.sep}> · </Text>
          <Text style={styles.wearable}>
            {wearableCount}{' '}
            {wearableCount === 1 ? 'wearable' : 'wearables'}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13, 17, 23, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  badgeElevated: {
    backgroundColor: 'rgba(38, 22, 12, 0.90)',
    borderColor: 'rgba(217, 119, 87, 0.35)',
  },
  pressed: {
    opacity: 0.75,
  },
  tier: {
    fontSize: 14,
    fontWeight: '600',
  },
  sep: {
    color: '#8b949e',
    fontSize: 14,
  },
  count: {
    color: '#8b949e',
    fontSize: 14,
  },
  wearable: {
    color: '#D97757',
    fontSize: 14,
    fontWeight: '600',
  },
});
