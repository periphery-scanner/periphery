import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useSettingsStore } from '../../store/settingsStore';

export function NotificationsSection() {
  const wearableNotificationsEnabled = useSettingsStore((s) => s.wearableNotificationsEnabled);
  const setWearableNotificationsEnabled = useSettingsStore((s) => s.setWearableNotificationsEnabled);

  const handleToggle = async (value: boolean) => {
    if (value) {
      // Request permission if turning on. On Android 13+, if previously denied via
      // "Don't ask again," this returns 'denied' silently — no dialog shown.
      // The helper text below guides the user to System Settings in that case.
      const { status } = await Notifications.requestPermissionsAsync();
      setWearableNotificationsEnabled(status === 'granted');
    } else {
      setWearableNotificationsEnabled(false);
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.header}>NOTIFICATIONS</Text>
      <Text style={styles.description}>
        Get alerted when camera-equipped wearables are detected nearby.
      </Text>

      <View style={styles.row}>
        <Text style={styles.label}>Camera wearables</Text>
        <Switch
          value={wearableNotificationsEnabled}
          onValueChange={handleToggle}
          trackColor={{ false: 'rgba(255,255,255,0.08)', true: '#D97757' + '88' }}
          thumbColor={wearableNotificationsEnabled ? '#D97757' : '#6a7480'}
        />
      </View>

      <Text style={styles.helper}>
        You can also adjust system notification settings in Android Settings.
      </Text>

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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  label: {
    flex: 1,
    color: '#c9d1d9',
    fontSize: 14,
  },
  helper: {
    color: '#4a5260',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginTop: 8,
  },
});
