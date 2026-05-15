/**
 * Passive BLE scanning loop.
 *
 * Privacy posture:
 *  - MAC addresses are hashed before being stored, never persisted raw
 *  - The BleManager never uploads anything; observations stay in memory
 *  - Stop scanning when app is backgrounded (iOS forces this anyway)
 */

import { BleManager, BleError, ScanMode, Device } from 'react-native-ble-plx';
import { classifyDevice, extractContinuityFingerprint } from './fingerprints';
import { DeviceObservation } from './types';
import { hashMacSync } from '../utils/hash';
import { rssiToDistance } from '../utils/distance';

const manager = new BleManager();

let isScanning = false;

// Android 7+ silently throttles or kills SCAN_MODE_LOW_LATENCY BLE scans during
// long sessions without calling the error callback — the stream just goes quiet.
// A periodic stop/start resets the throttle window and keeps callbacks alive.
//
// 30 s chosen because:
//   - Well under Android's "5 starts in 30 s" rate limit (we do 1 per 30 s)
//   - Empirically preempts the throttle before it fires (~5–30 min in the wild)
//   - Scan gap per restart is <100 ms, negligible against the 60 s expiry window
//
// Do not remove or lengthen significantly without first validating on-device over
// a 20+ minute session. The throttle is silent — no error is reported when it fires.
const SCAN_RESTART_INTERVAL_MS = 30_000;

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

  // Extracted so the same closure is reused across restart cycles — avoids
  // creating a new function object every 30 s.
  const onScan = (_error: BleError | null, device: Device | null) => {
    if (_error) {
      console.error('BLE scan error:', _error);
      return;
    }
    if (!device || !device.manufacturerData) return;
    const obs = parseAdvertisement(device);
    if (obs) onObservation(obs);
  };

  const startScan = () => {
    manager.startDeviceScan(
      null,                                       // null filter = scan all
      { scanMode: ScanMode.LowLatency, allowDuplicates: true },
      onScan
    );
    isScanning = true;
  };

  startScan();

  const restartId = setInterval(() => {
    manager.stopDeviceScan();
    isScanning = false;
    startScan();
  }, SCAN_RESTART_INTERVAL_MS);

  return () => {
    clearInterval(restartId);
    stopScanning();
  };
}

export function stopScanning() {
  if (!isScanning) return;
  manager.stopDeviceScan();
  isScanning = false;
}

function parseAdvertisement(device: Device): DeviceObservation | null {
  // device.localName = GAP Complete/Shortened Local Name from the advertisement packet.
  // Does NOT require BLUETOOTH_CONNECT permission. device.name/alias are excluded
  // because they may be populated from the system cache via a prior bonded connection.
  const broadcastName = device.localName ?? undefined;

  // Parse Company ID and payload from manufacturer data when present.
  // When absent (e.g. bonded Ray-Bans suppress advertising), manufacturerId stays 0
  // and payload stays empty — both fall through all Company ID branches to name-match.
  let manufacturerId = 0;
  let payload = new Uint8Array(0);
  if (device.manufacturerData) {
    const bytes = base64ToBytes(device.manufacturerData);
    if (bytes.length >= 3) {
      manufacturerId = bytes[0] | (bytes[1] << 8);
      payload = bytes.slice(2);
    }
  } else if (!broadcastName) {
    return null; // nothing to classify from
  }

  const { category, confidence, reason } = classifyDevice(manufacturerId, payload, broadcastName);
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
    reason,
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
