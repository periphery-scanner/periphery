import * as Notifications from 'expo-notifications';
import { DeviceObservation } from '../ble/types';

export const NOTIFICATION_COOLDOWN_MS = 5 * 60 * 1000;

// What counts as a "new wearable": a wearable_high observation whose device ID
// was not present in the previous observations snapshot. ID-based dedup means
// a device that stays in range across multiple scan cycles fires only once.
//
// Cooldown applies globally (not per-device) for two reasons:
// 1. Product intent: the alert is about the environment ("something is here"),
//    not tracking a specific device. Multiple wearables in the same space don't
//    warrant multiple alerts — one is enough to prompt the user to check the map.
// 2. Noise control: wearables can drop and re-appear in the scan window as BLE
//    advertisements vary. Per-device cooldowns would require persistent state per
//    ID and would still fire repeatedly if the device cycles in and out.
//
// 5 minutes was chosen as the minimum interval that feels "quiet" during normal
// use: long enough that the user isn't spammed on a busy street, short enough
// that a genuinely new wearable entering the space after the last alert fires
// a fresh notification rather than being silently swallowed.

export async function dispatchWearableAlert(
  current: DeviceObservation[],
  previous: DeviceObservation[],
  settings: {
    wearableNotificationsEnabled: boolean;
    lastNotificationFiredAt: number | null;
  },
  onFired: () => void,
): Promise<void> {
  if (!settings.wearableNotificationsEnabled) return;

  const prevIds = new Set(previous.map((o) => o.id));
  const hasNewWearable = current.some(
    (o) => o.category === 'wearable_high' && !prevIds.has(o.id)
  );
  if (!hasNewWearable) return;

  if (
    settings.lastNotificationFiredAt !== null &&
    Date.now() - settings.lastNotificationFiredAt < NOTIFICATION_COOLDOWN_MS
  ) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Periphery',
      body: 'A camera-equipped wearable was detected near you.',
    },
    trigger: null,
  });

  onFired();
}
