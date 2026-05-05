/**
 * Per-category threat weights.
 *
 * These encode the threat model. Tune empirically based on user research
 * and academic privacy literature.
 *
 * The relative ordering matters more than the absolute values, since the
 * sigmoid in calculator.ts normalizes the output.
 *
 * Rationale:
 *  - phone (1.0): baseline. Every modern phone is a potential recorder.
 *  - earbud (0.3): mic only, often paired to a phone (avoid double-counting).
 *  - wearable_low (0.4): watches with mics; less invasive than phones.
 *  - wearable_high (5.0): smart glasses, camera AirPods. Face-height,
 *    hidden recording, often cloud-uploading. The asymmetric threat.
 *  - doorbell (2.0): networked to large clouds with facial recognition.
 *    Higher than phone because of retention and recognition pipelines.
 *  - home_camera (2.5): more invasive than perimeter; indoor view.
 *  - speaker_mic (0.8): always-on mic but stationary and known to occupants.
 *  - vehicle (1.5): mobile, often cloud-uploading (Tesla Sentry).
 *  - tracker (0.0): not a recording threat. Counted for context only.
 */

import { DeviceCategory } from '../ble/types';

export const CATEGORY_WEIGHTS: Record<DeviceCategory, number> = {
  phone: 1.0,
  earbud: 0.3,
  wearable_low: 0.4,
  wearable_high: 5.0,
  doorbell: 2.0,
  home_camera: 2.5,
  speaker_mic: 0.8,
  vehicle: 1.5,
  tracker: 0.0,
  unknown: 0.0,
};
