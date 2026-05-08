import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface Preset {
  label: string;
  description: string;
  meters: number;
  feet: number;
}

const PRESETS: Preset[] = [
  {
    label: 'Intimate',
    description: "Devices in arm's reach. Useful for confirming what's on\na specific surface or person.",
    meters: 3,
    feet: 10,
  },
  {
    label: 'Personal',
    description: 'Devices in your immediate space. A small room, a bus\nseat, a coffee table.',
    meters: 10,
    feet: 33,
  },
  {
    label: 'Room',
    description: 'Devices in a typical room or store. The default radius\nPeriphery uses unless you change it.',
    meters: 30,
    feet: 98,
  },
  {
    label: 'Building',
    description: 'Devices in a building or block. Useful for mapping\nunfamiliar venues.',
    meters: 75,
    feet: 246,
  },
  {
    label: 'Vicinity',
    description: 'Devices in a wide area. May include devices in nearby\nbuildings that are not relevant.',
    meters: 150,
    feet: 492,
  },
];

interface Props {
  visible: boolean;
  currentRadiusMeters: number;
  unit: 'feet' | 'meters';
  onSelect: (meters: number) => void;
  onDismiss: () => void;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.48;
const DISMISS_VELOCITY = 0.5;
const DISMISS_DRAG = SHEET_HEIGHT * 0.35;

export function RadiusPresetPopover({
  visible,
  currentRadiusMeters,
  unit,
  onSelect,
  onDismiss,
}: Props) {
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const isDismissing = useRef(false);

  useEffect(() => {
    if (visible) {
      isDismissing.current = false;
      Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, translateY]);

  const dismiss = () => {
    if (isDismissing.current) return;
    isDismissing.current = true;
    Animated.timing(translateY, {
      toValue: SHEET_HEIGHT,
      duration: 220,
      useNativeDriver: true,
    }).start(onDismiss);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5 && g.dy > 0,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > DISMISS_DRAG || g.vy > DISMISS_VELOCITY) {
          dismiss();
        } else {
          Animated.timing(translateY, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={dismiss} />

      {/* Sheet */}
      <Animated.View
        style={[styles.sheet, { transform: [{ translateY }] }]}
        {...panResponder.panHandlers}
      >
        {/* Drag handle */}
        <View style={styles.handle} />

        <Text style={styles.sheetTitle}>Scan radius</Text>

        {PRESETS.map((preset) => {
          const isActive = preset.meters === currentRadiusMeters;
          const primaryValue = unit === 'feet' ? preset.feet : preset.meters;
          const primaryUnit = unit === 'feet' ? 'ft' : 'm';
          const secondaryValue = unit === 'feet' ? preset.meters : preset.feet;
          const secondaryUnit = unit === 'feet' ? 'm' : 'ft';

          return (
            <Pressable
              key={preset.meters}
              style={({ pressed }) => [
                styles.presetRow,
                isActive && styles.presetRowActive,
                pressed && styles.presetRowPressed,
              ]}
              onPress={() => {
                onSelect(preset.meters);
                dismiss();
              }}
            >
              <View style={styles.presetLeft}>
                <View style={styles.presetNameRow}>
                  {isActive && <View style={styles.activeIndicator} />}
                  <Text style={[styles.presetName, isActive && styles.presetNameActive]}>
                    {preset.label}
                  </Text>
                  <Text style={styles.presetDistance}>
                    {primaryValue} {primaryUnit}
                  </Text>
                  <Text style={styles.presetDistanceSecondary}>
                    {' '}/ {secondaryValue} {secondaryUnit}
                  </Text>
                </View>
                <Text style={styles.presetDescription}>{preset.description}</Text>
              </View>
            </Pressable>
          );
        })}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: 'rgba(13, 17, 23, 0.97)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(201, 209, 217, 0.25)',
    marginTop: 10,
    marginBottom: 14,
  },
  sheetTitle: {
    color: '#8b949e',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  presetRow: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  presetRowActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  presetRowPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  presetLeft: {
    flex: 1,
  },
  presetNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  activeIndicator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#4A90D9',
    marginRight: 6,
  },
  presetName: {
    color: '#c9d1d9',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  presetNameActive: {
    color: '#ffffff',
  },
  presetDistance: {
    color: '#c9d1d9',
    fontSize: 13,
  },
  presetDistanceSecondary: {
    color: '#6a7480',
    fontSize: 12,
  },
  presetDescription: {
    color: '#6a7480',
    fontSize: 11,
    lineHeight: 16,
    paddingLeft: 11, // indent to clear active indicator space
  },
});
