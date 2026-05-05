/**
 * Anonymity Score calculator.
 *
 * The core product. Maps a set of nearby devices to a 0–100 score where:
 *  - 100 = total practical anonymity
 *  - 0   = saturated surveillance
 *
 * Algorithm:
 *  1. Filter to observations within radiusM of user
 *  2. For each observation, compute threat = weight * distanceFactor * confidence
 *  3. Sum to get raw threat level
 *  4. Map to 0-100 via sigmoid (calibrated so threat=10 -> score=50)
 *
 * The high-asymmetry flag fires if any wearable_high (smart glasses,
 * camera AirPods) is in range, because these warrant a separate UX warning
 * regardless of the numeric score.
 */

import { DeviceObservation, DeviceCategory } from '../ble/types';
import { CATEGORY_WEIGHTS } from './weights';

export interface ScoreBreakdown {
  /** 0–100, higher = more anonymous */
  score: number;
  /** Unbounded threat sum, useful for debugging */
  rawThreatLevel: number;
  /** Count of observations per category */
  byCategory: Partial<Record<DeviceCategory, number>>;
  /** Total observations in radius */
  observationCount: number;
  /** True if any wearable_high in range — UX should warn */
  highAsymmetryFlag: boolean;
  /** Radius used in meters */
  radiusM: number;
}

const SIGMOID_MIDPOINT = 10; // threat level at which score = 50

export function calculateScore(
  observations: DeviceObservation[],
  radiusM: number = 30
): ScoreBreakdown {
  const inRange = observations.filter((o) => o.estimatedDistanceM <= radiusM);

  let threat = 0;
  const byCategory: Partial<Record<DeviceCategory, number>> = {};

  for (const obs of inRange) {
    const weight = CATEGORY_WEIGHTS[obs.category] ?? 0;
    // Linear distance falloff with floor at 0.1
    const distanceFactor = Math.max(0.1, 1 - obs.estimatedDistanceM / radiusM);
    threat += weight * distanceFactor * obs.confidence;
    byCategory[obs.category] = (byCategory[obs.category] ?? 0) + 1;
  }

  // Sigmoid: 100 / (1 + threat/midpoint)
  // threat=0  -> 100
  // threat=10 -> 50
  // threat=30 -> 25
  // threat=90 -> 10
  const score = Math.round(100 / (1 + threat / SIGMOID_MIDPOINT));

  return {
    score,
    rawThreatLevel: threat,
    byCategory,
    observationCount: inRange.length,
    highAsymmetryFlag: (byCategory.wearable_high ?? 0) > 0,
    radiusM,
  };
}
