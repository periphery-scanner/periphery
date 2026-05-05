import { create } from 'zustand';
import { DeviceObservation } from '../ble/types';
import { findRotationCandidate } from '../ble/dedup';

/**
 * Rolling expiry window for live observations (Fix 1 — Issue 17.1).
 *
 * Exported so other modules can share this constant without importing the store.
 * The radial map view (Section 4.6) imports this to drive icon fade-out
 * animation timing described in Section 4.6.3.
 */
export const EXPIRY_WINDOW_MS = 60_000;

interface ScanStore {
  observations: DeviceObservation[];
  upsertObservation: (obs: DeviceObservation) => void;
  purgeExpired: () => void;
  clear: () => void;
}

export const useScanStore = create<ScanStore>((set) => ({
  observations: [],

  upsertObservation: (obs) =>
    set((state) => {
      const now = Date.now();
      const cutoff = now - EXPIRY_WINDOW_MS;

      // Prune expired entries inline on every detection, not just on the interval
      // tick. This keeps scores accurate even during bursts of BLE activity.
      const live = state.observations.filter((o) => o.lastSeenAt >= cutoff);

      // Exact match: same hashed MAC seen again in this scan session.
      const exactIdx = live.findIndex((o) => o.id === obs.id);
      if (exactIdx >= 0) {
        const updated = [...live];
        updated[exactIdx] = { ...updated[exactIdx], lastSeenAt: obs.lastSeenAt, rssi: obs.rssi };
        return { observations: updated };
      }

      // MAC-rotation match: incoming looks like the same physical device with a
      // newly rotated MAC address. Reuse the existing entry so the device count
      // stays stable across rotations (Fix 3 — Issue 17.2).
      const rotationMatch = findRotationCandidate(obs, live, now, EXPIRY_WINDOW_MS);
      if (rotationMatch) {
        return {
          observations: live.map((o) =>
            o.id === rotationMatch.id
              ? { ...o, lastSeenAt: obs.lastSeenAt, rssi: obs.rssi }
              : o
          ),
        };
      }

      return { observations: [...live, obs] };
    }),

  purgeExpired: () =>
    set((state) => {
      const cutoff = Date.now() - EXPIRY_WINDOW_MS;
      const live = state.observations.filter((o) => o.lastSeenAt >= cutoff);
      // Skip state update when nothing was pruned to avoid unnecessary re-renders.
      if (live.length === state.observations.length) return state;
      return { observations: live };
    }),

  clear: () => set({ observations: [] }),
}));
