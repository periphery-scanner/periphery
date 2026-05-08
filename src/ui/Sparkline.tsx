import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScoreHistorySample } from '../store/scanStore';
import { TierLevel } from '../score/calculator';
import { TIER_COLORS } from './tiers';

const BAR_COUNT = 20;
const MIN_BAR_HEIGHT = 3;
const MAX_BAR_HEIGHT = 36;

interface Props {
  samples: ScoreHistorySample[];
  tier: TierLevel;
}

export function Sparkline({ samples, tier }: Props) {
  const color = TIER_COLORS[tier];

  if (samples.length < 2) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Trend builds over time</Text>
      </View>
    );
  }

  // Left-pad to BAR_COUNT with nulls so bars always fill the full width
  const padded: (number | null)[] = [
    ...Array(Math.max(0, BAR_COUNT - samples.length)).fill(null),
    ...samples.map((s) => s.score),
  ];

  return (
    <View style={styles.container}>
      <View style={styles.bars}>
        {padded.map((score, i) => {
          if (score === null) {
            return <View key={i} style={[styles.bar, styles.barEmpty]} />;
          }
          const height =
            MIN_BAR_HEIGHT + (score / 100) * (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT);
          return (
            <View
              key={i}
              style={[
                styles.bar,
                { height, backgroundColor: color, opacity: 0.55 },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: MAX_BAR_HEIGHT + 4,
    justifyContent: 'flex-end',
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: MAX_BAR_HEIGHT,
    gap: 2,
  },
  bar: {
    flex: 1,
    borderRadius: 2,
  },
  barEmpty: {
    height: MIN_BAR_HEIGHT,
    backgroundColor: '#21262d',
  },
  placeholder: {
    height: MAX_BAR_HEIGHT + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#5a6270',
    fontSize: 12,
    fontStyle: 'italic',
  },
});
