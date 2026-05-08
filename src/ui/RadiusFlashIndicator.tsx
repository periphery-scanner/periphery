import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

interface Props {
  value: number;
  unit: 'feet' | 'meters';
  // Increments on each radius change (including continuous drag); drives timer reset
  triggerCount: number;
}

function metersToFeet(m: number): number {
  return Math.round(m * 3.28084);
}

export function RadiusFlashIndicator({ value, unit, triggerCount }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    // Cancel pending fade-out and reset to fully visible
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (fadeRef.current) {
      fadeRef.current.stop();
      fadeRef.current = null;
    }
    opacity.setValue(1);

    // Fade out 1s after the last trigger
    timerRef.current = setTimeout(() => {
      fadeRef.current = Animated.timing(opacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      });
      fadeRef.current.start(() => { fadeRef.current = null; });
      timerRef.current = null;
    }, 1000);

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  // triggerCount is the only meaningful dependency; value/unit changes
  // are reflected in the label text without needing to restart the timer.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerCount]);

  const displayValue = unit === 'feet' ? metersToFeet(value) : Math.round(value);
  const displayUnit = unit === 'feet' ? 'ft' : 'm';

  return (
    <Animated.View style={[styles.container, { opacity }]} pointerEvents="none">
      <Text style={styles.text}>
        {displayValue} {displayUnit}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '40%' as any,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  text: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
    backgroundColor: 'rgba(13, 17, 23, 0.72)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    overflow: 'hidden',
  },
});
