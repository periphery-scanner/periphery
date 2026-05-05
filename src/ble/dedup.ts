/**
 * MAC-rotation deduplication for BLE observations.
 *
 * Problem: Modern phones rotate their BLE MAC address periodically (every ~15
 * minutes on iOS, more aggressively on Android). Each rotation creates a new
 * device.id in the scanner, so the same physical phone appears as 2–3 phantom
 * entries during the rotation window.
 *
 * Two-layer approach:
 *
 * Layer 1 — Continuity Protocol fingerprinting (Apple devices):
 *   If both the incoming and candidate observations carry a continuityFingerprint
 *   and those fingerprints match, that is strong evidence they are the same device
 *   subtype. A mismatch (e.g., iPhone vs iPad fingerprint at the same RSSI) is
 *   evidence they are distinct devices — we skip them.
 *
 * Layer 2 — RSSI proximity clustering (all manufacturers):
 *   A new MAC that matches an existing observation by (manufacturerId + category)
 *   and arrives within ±RSSI_TOLERANCE_DB of the stale entry is likely the same
 *   physical device after rotation. The staleness window guards against incorrectly
 *   merging two distinct devices that are simultaneously broadcasting.
 *
 * RSSI tolerance: ±15 dBm (conservative). We prefer slight over-counting
 * (a few phantom duplicates) over under-counting (merging distinct devices).
 * Loosen to ±20 if field testing shows real rotations being missed.
 *
 * Reference: Martin et al., "Handoff All Your Privacy" (PoPETs 2019)
 */

import { DeviceObservation, DeviceCategory } from './types';

const RSSI_TOLERANCE_DB = 15;

// A rotation candidate must be stale for at least this long: if a device was
// seen <5s ago it is almost certainly still broadcasting under its old MAC,
// meaning the new observation is a genuinely distinct device, not a rotation.
const ROTATION_MIN_STALENESS_MS = 5_000;

interface IncomingSignal {
  manufacturerId: number;
  category: DeviceCategory;
  rssi: number;
  continuityFingerprint?: string;
}

/**
 * Find an existing observation that is likely the same physical device as
 * `incoming` after a MAC rotation. Returns the matching observation (whose
 * `.id` the store should reuse), or null if this looks like a new device.
 *
 * @param incoming  - The newly parsed advertisement (not yet in the store)
 * @param existing  - Current live observations in the store
 * @param nowMs     - Current timestamp (pass Date.now() from the caller)
 * @param expiryWindowMs - The store's EXPIRY_WINDOW_MS constant
 */
export function findRotationCandidate(
  incoming: IncomingSignal,
  existing: DeviceObservation[],
  nowMs: number,
  expiryWindowMs: number
): DeviceObservation | null {
  let bestCandidate: DeviceObservation | null = null;
  let bestRssiDiff = Infinity;

  for (const obs of existing) {
    const age = nowMs - obs.lastSeenAt;

    // Must be stale but not expired.
    if (age < ROTATION_MIN_STALENESS_MS || age >= expiryWindowMs) continue;

    // Must be same manufacturer and category.
    if (obs.manufacturerId !== incoming.manufacturerId) continue;
    if (obs.category !== incoming.category) continue;

    // If both sides have a Continuity fingerprint, it must agree.
    // A mismatch means same manufacturer but different device subtype
    // (e.g., two iPhones of different generation) — do not merge.
    if (
      incoming.continuityFingerprint &&
      obs.continuityFingerprint &&
      incoming.continuityFingerprint !== obs.continuityFingerprint
    ) {
      continue;
    }

    const rssiDiff = Math.abs(obs.rssi - incoming.rssi);
    if (rssiDiff > RSSI_TOLERANCE_DB) continue;

    // Pick the candidate with the closest RSSI as the best spatial match.
    if (rssiDiff < bestRssiDiff) {
      bestRssiDiff = rssiDiff;
      bestCandidate = obs;
    }
  }

  return bestCandidate;
}
