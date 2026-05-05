/**
 * RSSI-to-distance estimation.
 *
 * Bluetooth signal strength is notoriously noisy. The path-loss model below
 * is a starting point — REQUIRES EMPIRICAL CALIBRATION with known devices
 * at known distances in the actual deployment environment.
 *
 * Path loss: rssi = measuredPower - 10 * n * log10(distance)
 *  - measuredPower: RSSI at 1m reference distance, typically -59 dBm
 *  - n: path-loss exponent, 2.0 in free space, 2.5–4.0 in built environments
 *
 * Do NOT show the user a precise distance — show a confidence band
 * (e.g., "very close" / "nearby" / "in range" / "edge").
 */

const REFERENCE_RSSI = -59; // RSSI at 1m
const PATH_LOSS_EXPONENT = 2.5; // tune for environment

export function rssiToDistance(rssi: number): number {
  if (rssi >= 0) return 1; // sanity
  const distance = Math.pow(10, (REFERENCE_RSSI - rssi) / (10 * PATH_LOSS_EXPONENT));
  return Math.max(0.5, Math.min(distance, 100)); // clamp to [0.5, 100] meters
}

export type ProximityBand = 'very_close' | 'nearby' | 'in_range' | 'edge';

export function distanceToBand(distanceM: number): ProximityBand {
  if (distanceM < 2) return 'very_close';
  if (distanceM < 8) return 'nearby';
  if (distanceM < 25) return 'in_range';
  return 'edge';
}
