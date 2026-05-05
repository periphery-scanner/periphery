/**
 * Core type definitions for the Periphery BLE detection system.
 *
 * Privacy invariant: DeviceObservation.id is a hash, never a raw MAC.
 */

export type DeviceCategory =
  | 'phone'           // Active smartphone
  | 'wearable_low'    // Watch, fitness band — camera-less
  | 'wearable_high'   // Smart glasses, camera AirPods — asymmetric threat
  | 'earbud'          // Standard wireless earbuds (microphone-only)
  | 'doorbell'        // Smart doorbell (Ring, Nest, Apple)
  | 'home_camera'     // Indoor smart cameras
  | 'speaker_mic'     // Smart speakers with always-on mic
  | 'vehicle'         // Tesla Sentry, dashcams
  | 'tracker'         // AirTag, Tile (not a threat itself but density signal)
  | 'unknown';

export interface DeviceObservation {
  /** SHA-256 of the BLE MAC, truncated to 16 chars. NEVER store raw MACs. */
  id: string;
  category: DeviceCategory;
  /** Bluetooth SIG Company ID */
  manufacturerId: number;
  /** Signal strength in dBm (negative number; -50 strong, -100 weak) */
  rssi: number;
  /** Empirically estimated distance in meters; do not claim sub-meter accuracy */
  estimatedDistanceM: number;
  /** Unix ms timestamp of first detection in current scan window */
  firstSeenAt: number;
  /** Unix ms timestamp of most recent detection */
  lastSeenAt: number;
  /** Classification confidence, 0–1 */
  confidence: number;
  /**
   * Stable sub-identifier extracted from Apple Continuity Protocol payload.
   * Format: "APPLE:<MSG_TYPE>:<HEX_BYTE>" — e.g. "APPLE:NEARBY:01" for iPhone.
   * Used by dedup.ts to distinguish device subtypes across MAC rotations.
   * Undefined for non-Apple devices or messages without stable identifiable bytes.
   */
  continuityFingerprint?: string;
}

export interface ScanWindow {
  startedAt: number;
  endedAt: number;
  observations: DeviceObservation[];
}
