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

/**
 * Human-readable display names for Bluetooth SIG Company IDs.
 * Keyed against MANUFACTURER_IDS constants — renaming a constant here propagates automatically.
 * Consume via getManufacturerName(); do not index this map directly.
 *
 * Naming convention: existing entries preserved verbatim from prior UI usage.
 * New wearable_high entries (task a) use full legal entity names.
 */
export const MANUFACTURER_DISPLAY_NAMES: Record<number, string> = {
  [MANUFACTURER_IDS.APPLE]: 'Apple',
  [MANUFACTURER_IDS.GOOGLE]: 'Google',
  [MANUFACTURER_IDS.MICROSOFT]: 'Microsoft',
  [MANUFACTURER_IDS.SAMSUNG]: 'Samsung',
  [MANUFACTURER_IDS.AMAZON]: 'Amazon',
  [MANUFACTURER_IDS.SONOS]: 'Sonos',
  [MANUFACTURER_IDS.TILE]: 'Tile',
  [MANUFACTURER_IDS.TESLA]: 'Tesla',
  [MANUFACTURER_IDS.BOSE]: 'Bose',
  [MANUFACTURER_IDS.GARMIN]: 'Garmin',
  [MANUFACTURER_IDS.GOPRO]: 'GoPro',
  [MANUFACTURER_IDS.META_PLATFORMS]: 'Meta Platforms, Inc.',
  [MANUFACTURER_IDS.META_PLATFORMS_TECHNOLOGIES]: 'Meta Platforms Technologies, LLC',
  [MANUFACTURER_IDS.ESSILORLUXOTTICA]: 'EssilorLuxottica S.A.',
  [MANUFACTURER_IDS.SNAP]: 'Snap, Inc.',
};

/**
 * Returns the display name for a Bluetooth SIG Company ID.
 * Falls back to "Unknown (0x____)" for unmapped IDs.
 * Never returns undefined or empty string.
 */
export function getManufacturerName(companyId: number): string {
  const name = (MANUFACTURER_DISPLAY_NAMES as Partial<Record<number, string>>)[companyId];
  if (name !== undefined) return name;
  return `Unknown (0x${companyId.toString(16).toUpperCase().padStart(4, '0')})`;
}

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
): { category: DeviceCategory; confidence: number; reason: string } {
  switch (messageType) {
    case APPLE_MESSAGE_TYPES.NEARBY:
      // Nearby is broadcast by every active iPhone/iPad
      return { category: 'phone', confidence: 0.9, reason: 'apple-continuity:nearby' };

    case APPLE_MESSAGE_TYPES.HANDOFF:
      return { category: 'phone', confidence: 0.85, reason: 'apple-continuity:handoff' };

    case APPLE_MESSAGE_TYPES.AIRDROP:
      return { category: 'phone', confidence: 0.8, reason: 'apple-continuity:airdrop' };

    case APPLE_MESSAGE_TYPES.AIRPODS: {
      if (payload.length < 2) {
        return { category: 'earbud', confidence: 0.4, reason: 'apple-continuity:airpods' };
      }
      const modelByte = payload[1];
      if (CAMERA_EQUIPPED_AIRPODS_MODELS.has(modelByte)) {
        return { category: 'wearable_high', confidence: 0.85, reason: 'apple-continuity:airpods-camera' };
      }
      if (modelByte === AIRPODS_MODELS.AIRPODS_MAX) {
        // Headphones, mic only — heavier than earbuds but not high-asymmetry
        return { category: 'wearable_low', confidence: 0.8, reason: 'apple-continuity:airpods-max' };
      }
      return { category: 'earbud', confidence: 0.85, reason: 'apple-continuity:airpods' };
    }

    case APPLE_MESSAGE_TYPES.FINDMY:
      // AirTag or lost device beacon — useful as density signal, not a threat
      return { category: 'tracker', confidence: 0.7, reason: 'apple-continuity:findmy' };

    case APPLE_MESSAGE_TYPES.IBEACON:
      return { category: 'unknown', confidence: 0.3, reason: 'apple-continuity:ibeacon' };

    case APPLE_MESSAGE_TYPES.APPLE_TV_PAIRING:
      // Apple TV is a stationary speaker_mic adjacent — Siri-enabled
      return { category: 'speaker_mic', confidence: 0.7, reason: 'apple-continuity:appletv-pairing' };

    default:
      return { category: 'unknown', confidence: 0.2, reason: 'apple-continuity:unknown' };
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
 * Broadcast name patterns for bonded-state Ray-Ban detection.
 *
 * When Ray-Ban Meta glasses are paired to a phone, RPA rotation and suppressed
 * advertising remove Company IDs from advertisement packets. The GAP Local Name
 * typically persists and is our only signal. Patterns ported from yj_nearbyglasses
 * (Nearby Glasses project) plus "rb meta" from Meta Lab NYC / Best Buy field captures.
 *
 * Read from device.localName (advertisement packet, no BLUETOOTH_CONNECT needed).
 * Do NOT use device.name / device.alias — those require CONNECT permission.
 */
const RAYBAN_NAME_PATTERNS = ['rayban', 'ray-ban', 'ray ban', 'rb meta'] as const;

function classifyByName(
  name: string
): { category: DeviceCategory; confidence: number; reason: string } | null {
  const lower = name.toLowerCase();
  for (const pattern of RAYBAN_NAME_PATTERNS) {
    if (lower.includes(pattern)) {
      return { category: 'wearable_high', confidence: 0.45, reason: `name-match:${pattern}` };
    }
  }
  return null;
}

/**
 * Top-level classifier. Routes by manufacturer ID, then delegates.
 * broadcastName is optional — pass device.localName when available for name-match fallback.
 */
export function classifyDevice(
  manufacturerId: number,
  payload: Uint8Array,
  broadcastName?: string
): { category: DeviceCategory; confidence: number; reason: string } {
  if (manufacturerId === MANUFACTURER_IDS.APPLE && payload.length >= 1) {
    return classifyAppleDevice(payload[0], payload);
  }

  // TODO: implement Google, Amazon (Ring) classifiers
  // Each manufacturer has its own protocol; this is empirical work.

  if (manufacturerId === MANUFACTURER_IDS.AMAZON) {
    // Most Amazon BLE = Ring devices or Echo. Conservative classification:
    return { category: 'doorbell', confidence: 0.5, reason: 'company-id:0x0171' };
  }

  if (manufacturerId === MANUFACTURER_IDS.META_PLATFORMS) {
    // Covers all Meta-branded BLE products including phones, Quest, Ray-Ban glasses
    return { category: 'wearable_high', confidence: 0.65, reason: 'company-id:0x01AB' };
  }

  // 0x058E also covers Meta Quest VR headsets — accepting false-positive rate for v1;
  // differentiation via Fast Pair Model ID or Service UUID is a post-WD6 task.
  if (manufacturerId === MANUFACTURER_IDS.META_PLATFORMS_TECHNOLOGIES) {
    // Covers Quest VR primarily, Ray-Ban Meta secondary
    return { category: 'wearable_high', confidence: 0.60, reason: 'company-id:0x058E' };
  }

  if (manufacturerId === MANUFACTURER_IDS.ESSILORLUXOTTICA) {
    // Eyewear-primary manufacturer — highest glasses signal-to-noise
    return { category: 'wearable_high', confidence: 0.80, reason: 'company-id:0x0D53' };
  }

  if (manufacturerId === MANUFACTURER_IDS.SNAP) {
    // Spectacles plus Snap SDK presence
    return { category: 'wearable_high', confidence: 0.65, reason: 'company-id:0x03C2' };
  }

  if (manufacturerId === MANUFACTURER_IDS.GOOGLE) {
    // Could be Pixel, Nest doorbell, Chromecast — needs sub-classification
    return { category: 'unknown', confidence: 0.3, reason: 'company-id:0x00E0' };
  }

  if (manufacturerId === MANUFACTURER_IDS.TESLA) {
    return { category: 'vehicle', confidence: 0.6, reason: 'company-id:0x05F1' };
  }

  if (manufacturerId === MANUFACTURER_IDS.SONOS) {
    return { category: 'speaker_mic', confidence: 0.7, reason: 'company-id:0x0218' };
  }

  // TODO: add unit tests — no test framework configured yet. Full matrix to cover:
  // Company ID branches: each MANUFACTURER_IDS key → correct category/confidence/reason
  // Name-match: "Ray-Ban Meta" → wearable_high/0.45/name-match:rayban; Company ID
  // priority (0x01AB + "Ray-Ban Meta" → conf 0.65/reason company-id:0x01AB, not 0.45);
  // case-insensitivity ("RAYBAN"/"rayban"/"RayBan" all match); non-matching names
  // ("AirPods Pro" no-op); "RB Meta-A1B2" → matches "rb meta".
  if (broadcastName) {
    const nameResult = classifyByName(broadcastName);
    if (nameResult) return nameResult;
  }

  return { category: 'unknown', confidence: 0.1, reason: 'fallthrough:none' };
}
