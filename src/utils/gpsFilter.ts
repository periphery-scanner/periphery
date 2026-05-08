// Accept readings up to 200m accuracy. Realistic indoor/cold-start GPS commonly
// reports 50–150m. Cell-tower-fallback positions (the actual teleportation cause)
// report 500m+. The opacity-fade indicator honestly communicates lower-confidence
// readings while still showing the user their approximate position.
export const MAX_ACCURACY_METERS = 200;
export const MAX_PLAUSIBLE_SPEED_MPS = 10;
export const GPS_STALE_MS = 10_000;
export const GPS_CONFIDENCE_ACCURACY_M = 25;

export interface AcceptedReading {
  lon: number;
  lat: number;
  timestampMs: number;
}

export function passesAccuracyFilter(accuracyM: number): boolean {
  return accuracyM <= MAX_ACCURACY_METERS;
}

// Returns true if the new reading is plausible given the last accepted one.
// Cold-start (lastAccepted === null) always passes — no prior to compare against.
// Rejects retrograde or equal timestamps to avoid division-by-zero.
export function passesMotionFilter(
  lon: number,
  lat: number,
  timestampMs: number,
  lastAccepted: AcceptedReading | null,
): boolean {
  if (lastAccepted === null) return true;
  const dtS = (timestampMs - lastAccepted.timestampMs) / 1000;
  if (dtS <= 0) return false;
  const distM = haversineM(lastAccepted.lon, lastAccepted.lat, lon, lat);
  return distM / dtS <= MAX_PLAUSIBLE_SPEED_MPS;
}

function haversineM(
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number,
): number {
  const R = 6_371_000;
  const φ1 = lat1 * (Math.PI / 180);
  const φ2 = lat2 * (Math.PI / 180);
  const Δφ = (lat2 - lat1) * (Math.PI / 180);
  const Δλ = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
