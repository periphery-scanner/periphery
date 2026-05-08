// IMPORTANT — selector pattern: always use single-value selectors when reading
// from this store (e.g. useSettingsStore(s => s.scanRadiusMeters) rather than
// returning an object literal). Zustand's default equality is Object.is; an
// object selector creates a new object on every call and triggers infinite
// re-renders when combined with high-frequency animation loops. The Phase 3d
// commit documents the crash this caused in MapScreen. This applies to any
// component that reads from any Zustand store in this project.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

function detectDefaultUnit(): 'feet' | 'meters' {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return locale === 'en-US' || locale.endsWith('-US') ? 'feet' : 'meters';
  } catch {
    return 'feet';
  }
}

interface SettingsState {
  scanRadiusMeters: number;
  distanceUnit: 'feet' | 'meters';
  hydrated: boolean;
  setScanRadiusMeters: (value: number) => void;
  setDistanceUnit: (unit: 'feet' | 'meters') => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      scanRadiusMeters: 30,
      distanceUnit: detectDefaultUnit(),
      hydrated: false,
      setScanRadiusMeters: (value) =>
        set({ scanRadiusMeters: Math.max(3, Math.min(150, value)) }),
      setDistanceUnit: (unit) => set({ distanceUnit: unit }),
    }),
    {
      name: 'periphery-settings',
      storage: createJSONStorage(() => AsyncStorage),
      // hydrated flag lets UI components hide "snap-from-default" glitch on first render
      onRehydrateStorage: () => () => {
        useSettingsStore.setState({ hydrated: true });
      },
    }
  )
);
