/**
 * Passive BLE scanning loop.
 *
 * Privacy posture:
 *  - MAC addresses are hashed before being stored, never persisted raw
 *  - The BleManager never uploads anything; observations stay in memory
 *  - Stop scanning when app is backgrounded (iOS forces this anyway)
 */

import { BleManager, ScanMode, Device } from 'react-native-ble-plx';
import { classifyDevice, extractContinuityFingerprint } from './fingerprints';
import { DeviceObservation } from './types';
import { hashMacSync } from '../utils/hash';
import { rssiToDistance } from '../utils/distance';

const manager = new BleManager();

let isScanning = false;

/**
 * Start scanning. Calls onObservation for every detected, classifiable device.
 *
 * Returns a stop function. ALWAYS call it on screen unmount or background.
 */
export function startScanning(
  onObservation: (obs: DeviceObservation) => void
): () => void {
  if (isScanning) {
    console.warn('Scanner already running');
    return () => {};
  }
  isScanning = true;

  manager.startDeviceScan(
    null,                                       // null filter = scan all
    { scanMode: ScanMode.LowLatency, allowDuplicates: true },
    (error, device) => {
      if (error) {
        console.error('BLE scan error:', error);
        return;
      }
      if (!device || !device.manufacturerData) return;

      const obs = parseAdvertisement(device);
      if (obs) onObservation(obs);
    }
  );

  return stopScanning;
}

export function stopScanning() {
  if (!isScanning) return;
  manager.stopDeviceScan();
  isScanning = false;
}

function parseAdvertisement(device: Device): DeviceObservation | null {
  if (!device.manufacturerData) return null;

  // manufacturerData is base64-encoded
  const bytes = base64ToBytes(device.manufacturerData);
  if (bytes.length < 3) return null;

  // First two bytes = Company ID, little-endian
  const manufacturerId = bytes[0] | (bytes[1] << 8);
  const payload = bytes.slice(2);

  const { category, confidence } = classifyDevice(manufacturerId, payload);
  if (category === 'unknown') return null;

  const rssi = device.rssi ?? -100;
  const now = Date.now();
  const continuityFingerprint = extractContinuityFingerprint(manufacturerId, payload) ?? undefined;

  return {
    id: hashMacSync(device.id).slice(0, 16),
    category,
    manufacturerId,
    rssi,
    estimatedDistanceM: rssiToDistance(rssi),
    firstSeenAt: now,
    lastSeenAt: now,
    confidence,
    continuityFingerprint,
  };
}

function base64ToBytes(b64: string): Uint8Array {
  // React Native compatible base64 decoder
  const binary =
    typeof atob !== 'undefined'
      ? atob(b64)
      : Buffer.from(b64, 'base64').toString('binary');
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}
