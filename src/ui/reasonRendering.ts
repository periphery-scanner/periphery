import { getManufacturerName } from '../ble/fingerprints';

export interface RenderedReason {
  signal: string;
  explanation: string;
}

// ── Company ID ────────────────────────────────────────────────────────────────

const COMPANY_ID_DETAIL: Record<string, string> = {
  '0x01AB':
    'Ray-Ban Meta smart glasses and other Meta Platforms BLE devices broadcast this Company ID. Any device advertising it is likely a Meta wearable.',
  '0x058E':
    'Meta Platforms Technologies devices — primarily Meta Quest headsets and Ray-Ban Meta hardware — broadcast this Company ID.',
  '0x0D53':
    'EssilorLuxottica S.A. manufactures Ray-Ban frames. This Company ID appears in Ray-Ban Meta smart glasses advertisements and carries the highest glasses signal-to-noise of any eyewear manufacturer ID.',
  '0x03C2':
    'Snap, Inc. Spectacles camera glasses broadcast this Company ID.',
  '0x0171':
    'Amazon devices — Ring doorbells and Echo smart speakers — broadcast this Company ID.',
  '0x05F1':
    'Tesla vehicles broadcast BLE for keyless entry and Sentry Mode. This Company ID is registered to Tesla, Inc.',
  '0x0218':
    'Sonos smart speakers, which include always-on microphones for voice control, broadcast this Company ID.',
  '0x00E0':
    'Google devices — Pixel phones, Nest doorbells, and Chromecast — share this Company ID. Precise sub-classification is not yet implemented.',
};

function renderCompanyId(hexId: string): RenderedReason {
  const companyId = parseInt(hexId, 16);
  const manufacturer = getManufacturerName(companyId);
  const signal = `Company ID · ${manufacturer}`;
  const explanation =
    COMPANY_ID_DETAIL[hexId] ??
    `This device broadcast the Bluetooth Company ID ${hexId}. No additional context is available for this manufacturer.`;
  return { signal, explanation };
}

// ── Apple Continuity ──────────────────────────────────────────────────────────

const APPLE_CONTINUITY_ENTRIES: Record<string, RenderedReason> = {
  nearby: {
    signal: 'Apple Continuity · Nearby',
    explanation:
      'Active iPhones and iPads broadcast the Nearby action protocol when the screen is unlocked. It is a reliable indicator of a person carrying an iPhone.',
  },
  handoff: {
    signal: 'Apple Continuity · Handoff',
    explanation:
      "Apple's Handoff protocol synchronizes tasks between Apple devices and is broadcast by iPhones and iPads. Confirms an Apple device is present.",
  },
  airdrop: {
    signal: 'Apple Continuity · AirDrop',
    explanation:
      'AirDrop availability is broadcast by iPhones and iPads when the feature is discoverable. The device is likely an active Apple phone or tablet.',
  },
  airpods: {
    signal: 'Apple Continuity · AirPods',
    explanation:
      'Standard AirPods earbuds broadcast this protocol. They include microphones but no cameras, and are classified as earbuds rather than a high-risk wearable.',
  },
  'airpods-max': {
    signal: 'Apple Continuity · AirPods Max',
    explanation:
      'AirPods Max headphones include microphones but no cameras, and are classified as a low-risk wearable.',
  },
  'airpods-camera': {
    signal: 'Apple Continuity · AirPods (camera)',
    explanation:
      'This AirPods model includes a camera. Camera-equipped earbuds are high-risk due to face-height recording capability in an inconspicuous form factor.',
  },
  findmy: {
    signal: 'Apple Continuity · Find My',
    explanation:
      'Apple Find My beacons are broadcast by AirTags and other trackable accessories. Not a direct recording threat, but contributes to total device density.',
  },
  'appletv-pairing': {
    signal: 'Apple Continuity · Apple TV',
    explanation:
      'Apple TV broadcasts pairing beacons and includes Siri, an always-on microphone. Stationary device classified as smart speaker/mic.',
  },
  ibeacon: {
    signal: 'Apple Continuity · iBeacon',
    explanation:
      'iBeacons are fixed infrastructure beacons used for indoor positioning. Generally a building-owned device, not a person-carried threat.',
  },
  unknown: {
    signal: 'Apple Continuity · Unknown',
    explanation:
      'This device broadcast an unrecognized Apple Continuity Protocol message type. It is Apple hardware; classification confidence is low.',
  },
};

function renderAppleContinuity(subtype: string): RenderedReason {
  return (
    APPLE_CONTINUITY_ENTRIES[subtype] ?? {
      signal: `Apple Continuity · ${subtype}`,
      explanation: `This device broadcast an Apple Continuity Protocol message of type '${subtype}'.`,
    }
  );
}

// ── Name match ────────────────────────────────────────────────────────────────

function renderNameMatch(pattern: string): RenderedReason {
  return {
    signal: `Broadcast name · '${pattern}'`,
    explanation: `This device advertised a name containing '${pattern}', matching known Ray-Ban Meta broadcast patterns. Manufacturer data was absent — typical of bonded Ray-Ban Meta glasses in paired mode — so Periphery fell back to name matching. Confidence is lower than Company ID matching.`,
  };
}

// ── Fallthrough ───────────────────────────────────────────────────────────────

function renderFallthrough(): RenderedReason {
  return {
    signal: 'No identifier matched',
    explanation:
      'No known Bluetooth Company ID or advertisement protocol was recognized. The classification is based on weak indirect signals.',
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export function renderReason(reason: string): RenderedReason {
  const colonIdx = reason.indexOf(':');
  if (colonIdx === -1) {
    return { signal: reason, explanation: 'No detail available for this signal.' };
  }
  const type = reason.slice(0, colonIdx);
  const id = reason.slice(colonIdx + 1);

  switch (type) {
    case 'company-id':       return renderCompanyId(id);
    case 'apple-continuity': return renderAppleContinuity(id);
    case 'name-match':       return renderNameMatch(id);
    case 'fallthrough':      return renderFallthrough();
    default:
      return { signal: type, explanation: `Unrecognized signal type '${type}'.` };
  }
}

export function getConfidenceTier(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 0.75) return 'high';
  if (confidence >= 0.50) return 'medium';
  return 'low';
}
