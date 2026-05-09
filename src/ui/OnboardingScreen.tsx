import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { useSettingsStore } from '../store/settingsStore';

export function OnboardingScreen() {
  const setHasCompletedOnboarding = useSettingsStore((s) => s.setHasCompletedOnboarding);
  const setWearableNotificationsEnabled = useSettingsStore((s) => s.setWearableNotificationsEnabled);

  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  const handleAllow = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setWearableNotificationsEnabled(status === 'granted');
    setHasCompletedOnboarding(true);
  };

  const handleMaybeLater = () => {
    setWearableNotificationsEnabled(false);
    setHasCompletedOnboarding(true);
  };

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <View style={styles.content}>
        <Text style={styles.wordmark}>PERIPHERY</Text>
        <Text style={styles.tagline}>Restoring the right to know.</Text>

        <View style={styles.spacerLg} />

        <Text style={styles.body}>
          Periphery surfaces the recording-capable devices around you, so you can know when
          smart glasses or camera-equipped wearables are nearby. What's around you, made visible.
        </Text>

        <View style={styles.spacerLg} />
        <View style={styles.separator} />
        <View style={styles.spacerMd} />

        <Text style={styles.notificationRationale}>
          Get a quiet alert when a camera-equipped wearable is detected near you.
          Recommended for wearables only — other devices are common and would be noisy.
        </Text>

        <View style={styles.spacerLg} />

        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          onPress={handleAllow}
          accessibilityRole="button"
          accessibilityLabel="Allow notifications"
        >
          <Text style={styles.primaryButtonLabel}>Allow notifications</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          onPress={handleMaybeLater}
          accessibilityRole="button"
          accessibilityLabel="Maybe later"
        >
          <Text style={styles.secondaryButtonLabel}>Maybe later</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 36,
    alignItems: 'center',
    marginTop: -40, // slight upward bias from true center
  },
  wordmark: {
    color: '#D97757',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 6,
    textAlign: 'center',
    marginBottom: 10,
  },
  tagline: {
    color: '#8b949e',
    fontSize: 16,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  body: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
  },
  notificationRationale: {
    color: '#8b949e',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  separator: {
    width: 40,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  spacerLg: {
    height: 24,
  },
  spacerMd: {
    height: 16,
  },
  primaryButton: {
    backgroundColor: '#D97757',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
    marginBottom: 14,
  },
  primaryButtonLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  secondaryButtonLabel: {
    color: '#6a7480',
    fontSize: 13,
  },
  pressed: {
    opacity: 0.7,
  },
});
