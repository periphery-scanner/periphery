import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { TierLevel } from '../score/calculator';
import { TIER_COLORS } from './tiers';

interface Props {
  tier: TierLevel;
  onPress: () => void;
}

export function TierDisplay({ tier, onPress }: Props) {
  const color = TIER_COLORS[tier];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${tier}. Tap for details.`}
    >
      <Text style={[styles.tierWord, { color }]}>{tier}</Text>
      <Text style={[styles.chevron, { color }]}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginVertical: 8,
  },
  pressed: {
    opacity: 0.65,
  },
  tierWord: {
    fontSize: 72,
    fontWeight: '300',
    letterSpacing: 2,
    lineHeight: 80,
  },
  chevron: {
    fontSize: 40,
    fontWeight: '200',
    opacity: 0.6,
    marginLeft: 6,
    lineHeight: 80,
    paddingBottom: 4,
  },
});
