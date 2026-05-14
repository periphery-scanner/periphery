/**
 * Device fingerprint dictionary.
 *
 * Sources to validate against:
 *  - Martin et al., "Handoff All Your Privacy" (PoPETs 2019)
 *  - Celosia & Cunche, "Saving Private Addresses" (MobiQuitous 2019)
 *  - github.com/furiousMAC/continuity
 *  - Bluetooth SIG Assigned Numbers (bluetooth.com)
 *
 * This dictionary is the project's secret sauce. Expand empirically.
 */

import { DeviceCategory } from './types';

/** Bluetooth SIG Company Identifiers — first 2 bytes of manufacturer data */
export const MANUFACTURER_IDS = {
  APPLE: 0x004C,
  GOOGLE: 0x00E0,
  MICROSOFT: 0x0006,
  SAMSUNG: 0x0075,
  AMAZON: 0x0171,
  // BUG: 0x0644 is Apogee Instruments (scientific/environmental sensors), not Meta —
  // pre-existing misclassification. Flagged for removal in a separate commit after
  // field validation confirms no Ray-Ban signals are observed on this ID.
  APOGEE_INSTRUMENTS: 0x0644,
  SONOS: 0x0218,
  TILE: 0x0067,
  TESLA: 0x05F1,
  BOSE: 0x009E,
  GARMIN: 0x0087,
  GOPRO: 0x0085,
  // Camera wearable / eyewear manufacturers
  META_PLATFORMS: 0x01AB,              // Meta Platforms, Inc.
  META_PLATFORMS_TECHNOLOGIES: 0x058E, // Meta Platforms Technologies, LLC
  ESSILORLUXOTTICA: 0x0D53,            // EssilorLuxottica S.A.
  SNAP: 0x03C2,                        // Snap, Inc.
} as const;

/** Apple Continuity Protocol message types (byte after company ID) */
export const APPLE_MESSAGE_TYPES = {
  IBEACON: 0x02,
  AIRDROP: 0x05,
  AIRPODS: 0x07,
  AIRPLAY: 0x09,
  HANDOFF: 0x0C,
  NEARBY: 0x10,
  FINDMY: 0x12,
  APPLE_TV_PAIRING: 0x16,
} as const;

/**
 * AirPods model bytes (second byte of AIRPODS message payload).
 *
 * PLACEHOLDER — these need empirical confirmation. The list below is
 * synthesized from public reverse-engineering work; verify with real devices.
 *
 * The CAMERA_EQUIPPED set is what matters for our threat model — these are
 * the asymmetric threat (face-height recording with cloud upload).
 */
export const AIRPODS_MODELS = {
  AIRPODS_1: 0x02,
  AIRPODS_2: 0x0F,
  AIRPODS_PRO: 0x0E,
  AIRPODS_PRO_2: 0x14,
  AIRPODS_MAX: 0x0A,
  AIRPODS_3: 0x13,
  // AIRPODS_PRO_4_CAMERA: 0x?? — TBD when shipped and reverse-engineered
} as const;

/** Update this set as camera-equipped AirPods models become known */
const CAMERA_EQUIPPED_AIRPODS_MODELS: Set<number> = new Set([
  // 0x?? - AirPods Pro 4 (camera) — pending reverse-engineering
]);

export function classifyAppleDevice(
  messageType: number,
  payload: Uint8Array
): { category: DeviceCategory; confidence: number } {
  switch (messageType) {
    case APPLE_MESSAGE_TYPES.NEARBY:
      // Nearby is broadcast by every active iPhone/iPad
      return { category: 'phone', confidence: 0.9 };

    case APPLE_MESSAGE_TYPES.HANDOFF:
      return { category: 'phone', confidence: 0.85 };

    case APPLE_MESSAGE_TYPES.AIRDROP:
      return { category: 'phone', confidence: 0.8 };

    case APPLE_MESSAGE_TYPES.AIRPODS: {
      if (payload.length < 2) {
        return { category: 'earbud', confidence: 0.4 };
      }
      const modelByte = payload[1];
      if (CAMERA_EQUIPPED_AIRPODS_MODELS.has(modelByte)) {
        return { category: 'wearable_high', confidence: 0.85 };
      }
      if (modelByte === AIRPODS_MODELS.AIRPODS_MAX) {
        // Headphones, mic only — heavier than earbuds but not high-asymmetry
        return { category: 'wearable_low', confidence: 0.8 };
      }
      return { category: 'earbud', confidence: 0.85 };
    }

    case APPLE_MESSAGE_TYPES.FINDMY:
      // AirTag or lost device beacon — useful as density signal, not a threat
      return { category: 'tracker', confidence: 0.7 };

    case APPLE_MESSAGE_TYPES.IBEACON:
      return { category: 'unknown', confidence: 0.3 };

    case APPLE_MESSAGE_TYPES.APPLE_TV_PAIRING:
      // Apple TV is a stationary speaker_mic adjacent — Siri-enabled
      return { category: 'speaker_mic', confidence: 0.7 };

    default:
      return { category: 'unknown', confidence: 0.2 };
  }
}

/**
 * Extract a stable sub-identifier from an Apple Continuity Protocol payload
 * for use in MAC-rotation deduplication (see src/ble/dedup.ts).
 *
 * NEARBY (0x10): the upper nibble of the action-flags byte (payload[2]) encodes
 * device class — 0x1=iPhone, 0x2=iPad, 0x3=Mac, 0x9=Watch. This nibble is
 * stable across MAC rotations for a given device. The lower nibble (nearby action
 * code) changes frequently and is intentionally ignored.
 * Reference: Martin et al. "Handoff All Your Privacy" §3.2 (PoPETs 2019)
 *
 * AIRPODS (0x07): payload[1] is the model byte (see AIRPODS_MODELS), stable
 * per device model across rotations.
 *
 * Returns null for non-Apple devices or message types without stable payload bytes.
 */
export function extractContinuityFingerprint(
  manufacturerId: number,
  payload: Uint8Array
): string | null {
  if (manufacturerId !== MANUFACTURER_IDS.APPLE || payload.length < 1) return null;

  const messageType = payload[0];

  switch (messageType) {
    case APPLE_MESSAGE_TYPES.NEARBY: {
      if (payload.length < 3) return null;
      const deviceClass = (payload[2] >> 4) & 0xf;
      if (deviceClass === 0) return null; // unset / unknown class
      return `APPLE:NEARBY:${deviceClass.toString(16).padStart(2, '0')}`;
    }

    case APPLE_MESSAGE_TYPES.AIRPODS: {
      if (payload.length < 2) return null;
      return `APPLE:AIRPODS:${payload[1].toString(16).padStart(2, '0')}`;
    }

    default:
      return null;
  }
}

/**
 * Top-level classifier. Routes by manufacturer ID, then delegates.
 */
export function classifyDevice(
  manufacturerId: number,
  payload: Uint8Array
): { category: DeviceCategory; confidence: number } {
  if (manufacturerId === MANUFACTURER_IDS.APPLE && payload.length >= 1) {
    return classifyAppleDevice(payload[0], payload);
  }

  // TODO: implement Google, Amazon (Ring) classifiers
  // Each manufacturer has its own protocol; this is empirical work.

  if (manufacturerId === MANUFACTURER_IDS.AMAZON) {
    // Most Amazon BLE = Ring devices or Echo. Conservative classification:
    return { category: 'doorbell', confidence: 0.5 };
  }

  // BUG: APOGEE_INSTRUMENTS (0x0644) was mislabeled as META — this branch should be
  // removed once field data confirms no Ray-Ban signals use 0x0644.
  if (manufacturerId === MANUFACTURER_IDS.APOGEE_INSTRUMENTS) {
    return { category: 'wearable_high', confidence: 0.7 };
  }

  if (manufacturerId === MANUFACTURER_IDS.META_PLATFORMS) {
    // Covers all Meta-branded BLE products including phones, Quest, Ray-Ban glasses
    return { category: 'wearable_high', confidence: 0.65 };
  }

  // 0x058E also covers Meta Quest VR headsets — accepting false-positive rate for v1;
  // differentiation via Fast Pair Model ID or Service UUID is a post-WD6 task.
  if (manufacturerId === MANUFACTURER_IDS.META_PLATFORMS_TECHNOLOGIES) {
    // Covers Quest VR primarily, Ray-Ban Meta secondary
    return { category: 'wearable_high', confidence: 0.60 };
  }

  if (manufacturerId === MANUFACTURER_IDS.ESSILORLUXOTTICA) {
    // Eyewear-primary manufacturer — highest glasses signal-to-noise
    return { category: 'wearable_high', confidence: 0.80 };
  }

  if (manufacturerId === MANUFACTURER_IDS.SNAP) {
    // Spectacles plus Snap SDK presence
    return { category: 'wearable_high', confidence: 0.65 };
  }

  if (manufacturerId === MANUFACTURER_IDS.GOOGLE) {
    // Could be Pixel, Nest doorbell, Chromecast — needs sub-classification
    return { category: 'unknown', confidence: 0.3 };
  }

  if (manufacturerId === MANUFACTURER_IDS.TESLA) {
    return { category: 'vehicle', confidence: 0.6 };
  }

  if (manufacturerId === MANUFACTURER_IDS.SONOS) {
    return { category: 'speaker_mic', confidence: 0.7 };
  }

  return { category: 'unknown', confidence: 0.1 };
}
