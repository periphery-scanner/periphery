import React, { useRef } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';

interface Props {
  value: number;
  hydrated: boolean;
  unit: 'feet' | 'meters';
  onDrag: (value: number) => void;
  onLongPress: () => void;
}

const MIN_M = 3;
const MAX_M = 150;
const RANGE_M = MAX_M - MIN_M;
const TRACK_HEIGHT = 104; // chip content height minus top/bottom padding
const THUMB_BOTTOM_OFFSET = 20; // aligns thumb center with track coordinate (half of 28dp bottom padding minus half thumb height 8)
const LONG_PRESS_MS = 600;
const DRAG_THRESHOLD_PX = 3;

function metersToFeet(m: number): number {
  return Math.round(m * 3.28084);
}

export function RadiusSliderChip({ value, hydrated, unit, onDrag, onLongPress }: Props) {
  // Refs for PanResponder callbacks — avoids stale closure from single creation
  const valueRef = useRef(value);
  const onDragRef = useRef(onDrag);
  const onLongPressRef = useRef(onLongPress);
  valueRef.current = value;
  onDragRef.current = onDrag;
  onLongPressRef.current = onLongPress;

  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartValueRef = useRef(MIN_M);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        isDraggingRef.current = false;
        dragStartValueRef.current = valueRef.current;
        pressTimerRef.current = setTimeout(() => {
          if (!isDraggingRef.current) {
            onLongPressRef.current();
          }
        }, LONG_PRESS_MS);
      },
      onPanResponderMove: (_, gestureState) => {
        if (Math.abs(gestureState.dy) > DRAG_THRESHOLD_PX) {
          if (pressTimerRef.current !== null) {
            clearTimeout(pressTimerRef.current);
            pressTimerRef.current = null;
          }
          isDraggingRef.current = true;
          // Drag up = increase value (dy is negative when moving up)
          const delta = -(gestureState.dy / TRACK_HEIGHT) * RANGE_M;
          const next = Math.max(MIN_M, Math.min(MAX_M, dragStartValueRef.current + delta));
          onDragRef.current(next);
        }
      },
      onPanResponderRelease: () => {
        if (pressTimerRef.current !== null) {
          clearTimeout(pressTimerRef.current);
          pressTimerRef.current = null;
        }
        isDraggingRef.current = false;
      },
      onPanResponderTerminate: () => {
        if (pressTimerRef.current !== null) {
          clearTimeout(pressTimerRef.current);
          pressTimerRef.current = null;
        }
        isDraggingRef.current = false;
      },
    })
  ).current;

  // Thumb position from bottom (0 = min, TRACK_HEIGHT = max)
  const thumbFraction = (value - MIN_M) / RANGE_M;
  const thumbBottom = thumbFraction * TRACK_HEIGHT;

  const displayValue = unit === 'feet' ? metersToFeet(value) : Math.round(value);
  const displayUnit = unit === 'feet' ? 'ft' : 'm';

  return (
    <View style={styles.chip} {...panResponder.panHandlers}>
      {/* Track */}
      <View style={styles.track} />

      {/* Thumb — hidden until hydrated to prevent snap-from-default glitch */}
      {hydrated && (
        <View style={[styles.thumb, { bottom: thumbBottom + THUMB_BOTTOM_OFFSET }]} />
      )}

      {/* Unit label */}
      <Text style={styles.label}>{hydrated ? `${displayValue}` : '—'}</Text>
      <Text style={styles.unitLabel}>{displayUnit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    width: 40,
    height: 140,
    borderRadius: 20,
    backgroundColor: 'rgba(13, 17, 23, 0.75)',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 28, // room for value + unit labels at bottom
    justifyContent: 'flex-end',
    position: 'relative',
    overflow: 'hidden',
  },
  track: {
    position: 'absolute',
    width: 2,
    top: 8,
    bottom: 28,
    borderRadius: 1,
    backgroundColor: 'rgba(201, 209, 217, 0.25)',
  },
  thumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4A90D9',
    borderWidth: 2,
    borderColor: '#ffffff',
    left: 12,
  },
  label: {
    color: '#c9d1d9',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 13,
    textAlign: 'center',
  },
  unitLabel: {
    color: '#8b949e',
    fontSize: 9,
    lineHeight: 10,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
