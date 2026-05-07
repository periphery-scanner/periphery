import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeSyntheticEvent } from 'react-native';
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map as MapView,
  UserLocation,
  useCurrentPosition,
  type CameraRef,
  type TrackUserLocationChangeEvent,
  type ViewStateChangeEvent,
  type PressEventWithFeatures,
} from '@maplibre/maplibre-react-native';
import { PERIPHERY_MAP_STYLE } from './mapStyle';
import { geoCircle, offsetLatLon } from '../utils/geo';
import { useScanStore, EXPIRY_WINDOW_MS } from '../store/scanStore';
import { DeviceObservation } from '../ble/types';
import { DeviceDetailModal } from '../ui/DeviceDetailModal';

const SCAN_RADIUS_M = 30;
const GPS_EMA_ALPHA = 0.5;

// ── Animation constants ───────────────────────────────────────────────────────
const FADE_START_MS = 30_000;     // hold full opacity until 30s since last seen
const FADE_WINDOW_MS = EXPIRY_WINDOW_MS - FADE_START_MS; // 30s fade-out window
const PULSE_DURATION_MS = 300;    // pulse-in ramp on first detection
const POSITION_EMA_ALPHA = 0.35;  // per-device distance smoothing (mobile categories)
const ANIM_TICK_MS = 50;          // ~20fps animation loop

// Categories that can move — receive position EMA smoothing
const MOBILE_CATEGORIES = new Set(['phone', 'wearable_high', 'wearable_low', 'earbud']);

// ── Visual hierarchy (Section 4.6.7) ─────────────────────────────────────────
// wearable_high: deep coral, vivid but not alarming — "notable" on the muted basemap
// All others: desaturated, atmospheric, low contrast on #F4F1ED basemap
const CATEGORY_COLORS: Record<string, string> = {
  phone:         '#7CBFB0',
  earbud:        '#7AAAC0',
  wearable_low:  '#B8A868',
  wearable_high: '#D97757',
  doorbell:      '#B07060',
  home_camera:   '#B07060',
  speaker_mic:   '#B08848',
  vehicle:       '#8B949E',
  tracker:       '#6080A8',
  unknown:       '#6A7480',
};

// Two-tier radius scale: wearable_high elevated ~43% over standard quiet tier
const WEARABLE_HIGH_RADIUS = 10;
const STANDARD_RADIUS = 7;

interface Props {
  onBack: () => void;
}

export function MapScreen({ onBack }: Props) {
  const observations = useScanStore((s) => s.observations);

  // ── Location smoothing ────────────────────────────────────────────────────
  const rawPosition = useCurrentPosition();
  const smoothedRef = useRef<[number, number] | null>(null);
  const [smoothedPos, setSmoothedPos] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!rawPosition?.coords) return;
    const { longitude, latitude } = rawPosition.coords;
    if (!smoothedRef.current) {
      smoothedRef.current = [longitude, latitude];
    } else {
      const [pLon, pLat] = smoothedRef.current;
      smoothedRef.current = [
        GPS_EMA_ALPHA * longitude + (1 - GPS_EMA_ALPHA) * pLon,
        GPS_EMA_ALPHA * latitude + (1 - GPS_EMA_ALPHA) * pLat,
      ];
    }
    setSmoothedPos([...smoothedRef.current] as [number, number]);
  }, [rawPosition]);

  // ── Camera tracking / panning ─────────────────────────────────────────────
  const cameraRef = useRef<CameraRef>(null);
  const [isTracking, setIsTracking] = useState(true);
  const [bearing, setBearing] = useState(0);

  const handleTrackingChange = useCallback(
    (e: NativeSyntheticEvent<TrackUserLocationChangeEvent>) => {
      if (e.nativeEvent.trackUserLocation === null) {
        setIsTracking(false);
      }
    },
    []
  );

  // Bearing updates only — setIsTracking NOT called here. MapLibre fires
  // userInteraction:true on compass rotations, which would race against
  // re-engaged tracking. onTrackUserLocationChange is the sole disengagement signal.
  const handleRegionChange = useCallback(
    (e: NativeSyntheticEvent<ViewStateChangeEvent>) => {
      setBearing(e.nativeEvent.bearing);
    },
    []
  );

  const handleRecenter = useCallback(() => {
    setIsTracking(true);
    // Intentionally preserves the user's current zoom level. Restoring the
    // default (16) would override their inspection intent mid-session.
    // Revisit only if user feedback indicates strong preference for full-reset.
  }, []);

  // ── Stable random bearings per device ────────────────────────────────────
  const deviceBearings = useRef<Record<string, number>>({});

  const getDeviceBearing = useCallback((id: string): number => {
    if (deviceBearings.current[id] === undefined) {
      deviceBearings.current[id] = Math.random() * 360;
    }
    return deviceBearings.current[id];
  }, []);

  // ── Animation tick (~20fps) — drives fade-out, pulse-in, position EMA ────
  const [animTick, setAnimTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setAnimTick((t) => t + 1), ANIM_TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Per-device smoothed distances for position EMA.
  //
  // Side-effect note: writing to this ref inside useMemo is technically impure.
  // In React StrictMode (Expo dev builds), useMemo may run twice per render,
  // applying EMA twice and causing visible dev-only position jitter. In
  // production release builds StrictMode is inactive — the side effect runs
  // exactly once and is correct. Refactor to useEffect+useState if dev jitter
  // becomes disruptive during future development.
  const deviceDistancesRef = useRef<Record<string, number>>({});

  // ── Device GeoJSON feature collection ────────────────────────────────────
  const deviceFeatures = useMemo((): GeoJSON.FeatureCollection => {
    if (!smoothedPos) return { type: 'FeatureCollection', features: [] };

    const now = Date.now();

    const features: GeoJSON.Feature[] = observations.map((obs) => {
      const isWearableHigh = obs.category === 'wearable_high';

      // Position EMA: smooth RSSI-driven distance changes for mobile categories
      let displayDist = obs.estimatedDistanceM;
      if (MOBILE_CATEGORIES.has(obs.category)) {
        const prev = deviceDistancesRef.current[obs.id];
        displayDist = prev !== undefined
          ? POSITION_EMA_ALPHA * obs.estimatedDistanceM + (1 - POSITION_EMA_ALPHA) * prev
          : obs.estimatedDistanceM;
        deviceDistancesRef.current[obs.id] = displayDist;
      }

      const coords = offsetLatLon(smoothedPos, displayDist, getDeviceBearing(obs.id));

      // Fade-out: full opacity for first 30s since last detection,
      // linear fade from 1.0 → 0 over the following 30s (Section 4.6.3)
      const sinceLastSeen = now - obs.lastSeenAt;
      const fadeOpacity = sinceLastSeen <= FADE_START_MS
        ? 1.0
        : Math.max(0, 1 - (sinceLastSeen - FADE_START_MS) / FADE_WINDOW_MS);

      // Pulse-in: opacity and radius ramp 0→1 over PULSE_DURATION_MS on
      // first detection (Section 4.6.3)
      const pulseProgress = Math.min(1, (now - obs.firstSeenAt) / PULSE_DURATION_MS);
      const baseRadius = isWearableHigh ? WEARABLE_HIGH_RADIUS : STANDARD_RADIUS;

      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: coords },
        properties: {
          id: obs.id,
          color: CATEGORY_COLORS[obs.category] ?? CATEGORY_COLORS.unknown,
          radius: baseRadius * (0.8 + 0.2 * pulseProgress),
          opacity: fadeOpacity * pulseProgress,
          // Honest position rendering (Section 4.6.8):
          // wearable_high: sharp solid fill — "presence is asserted"
          // all others: soft feathered glow — "approximately here"
          blur: isWearableHigh ? 0 : 0.6,
          strokeWidth: isWearableHigh ? 1.5 : 0,
        },
      };
    });

    return { type: 'FeatureCollection', features };
  }, [observations, smoothedPos, getDeviceBearing, animTick]);

  // ── Device tap → detail modal ─────────────────────────────────────────────
  const [selectedDevice, setSelectedDevice] = useState<DeviceObservation | null>(null);

  const handleDevicePress = useCallback(
    (e: NativeSyntheticEvent<PressEventWithFeatures>) => {
      const feature = e.nativeEvent.features[0];
      if (!feature?.properties?.id) return;
      const obs = observations.find((o) => o.id === feature.properties!.id);
      if (obs) setSelectedDevice(obs);
    },
    [observations]
  );

  // ── Radius circle ─────────────────────────────────────────────────────────
  const radiusFeature = smoothedPos ? geoCircle(smoothedPos, SCAN_RADIUS_M) : null;

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        mapStyle={PERIPHERY_MAP_STYLE}
        attribution={false}
        logo={false}
        compass={false}
        scaleBar={false}
        onRegionIsChanging={handleRegionChange}
      >
        <Camera
          ref={cameraRef}
          trackUserLocation={isTracking ? 'heading' : undefined}
          zoom={16}
          onTrackUserLocationChange={handleTrackingChange}
        />

        <UserLocation />

        {radiusFeature && (
          <GeoJSONSource id="scan-radius" data={radiusFeature}>
            <Layer
              id="radius-fill"
              type="fill"
              paint={{ 'fill-color': '#4A90D9', 'fill-opacity': 0.07 }}
            />
            <Layer
              id="radius-outline"
              type="line"
              paint={{
                'line-color': '#4A90D9',
                'line-opacity': 0.3,
                'line-width': 1.5,
              }}
            />
          </GeoJSONSource>
        )}

        <GeoJSONSource
          id="devices"
          data={deviceFeatures}
          onPress={handleDevicePress}
        >
          <Layer
            id="device-circles"
            type="circle"
            paint={{
              'circle-color':          ['get', 'color'],
              'circle-radius':         ['get', 'radius'],
              'circle-opacity':        ['get', 'opacity'],
              'circle-blur':           ['get', 'blur'],
              'circle-stroke-width':   ['get', 'strokeWidth'],
              'circle-stroke-color':   ['get', 'color'],
              'circle-stroke-opacity': ['get', 'opacity'],
            }}
          />
        </GeoJSONSource>
      </MapView>

      {/* Back button — top-left */}
      <Pressable
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        onPress={onBack}
        accessibilityLabel="Back to score view"
      >
        <Text style={styles.backText}>‹ Score</Text>
      </Pressable>

      {/* Compass — top-right, rotates with map bearing */}
      <View
        style={[styles.compass, { transform: [{ rotate: `${-bearing}deg` }] }]}
        pointerEvents="none"
      >
        <Text style={styles.compassArrow}>↑</Text>
        <Text style={styles.compassLabel}>N</Text>
      </View>

      {/* Recenter FAB — shown when user has panned away */}
      {!isTracking && (
        <Pressable
          style={({ pressed }) => [styles.recenterFab, pressed && styles.pressed]}
          onPress={handleRecenter}
          accessibilityLabel="Re-center on my location"
          accessibilityRole="button"
        >
          <Text style={styles.recenterIcon}>◎</Text>
        </Pressable>
      )}

      {/* Honest position footer — Section 4.6.8: present but unobtrusive */}
      <Text style={styles.positionDisclaimer} pointerEvents="none">
        Device positions are approximate. Bearings are estimated, not measured.
      </Text>

      {/* MapTiler attribution — required by ToS */}
      <Text style={styles.attribution}>© MapTiler © OpenStreetMap contributors</Text>

      <DeviceDetailModal
        visible={selectedDevice !== null}
        observation={selectedDevice}
        onClose={() => setSelectedDevice(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  map: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 48,
    left: 16,
    backgroundColor: 'rgba(13, 17, 23, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pressed: {
    opacity: 0.7,
  },
  backText: {
    color: '#c9d1d9',
    fontSize: 14,
    fontWeight: '600',
  },
  compass: {
    position: 'absolute',
    top: 48,
    right: 16,
    backgroundColor: 'rgba(13, 17, 23, 0.75)',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compassArrow: {
    color: '#c9d1d9',
    fontSize: 14,
    lineHeight: 16,
  },
  compassLabel: {
    color: '#8b949e',
    fontSize: 9,
    lineHeight: 10,
    letterSpacing: 0.5,
  },
  recenterFab: {
    position: 'absolute',
    bottom: 48,
    right: 16,
    backgroundColor: 'rgba(13, 17, 23, 0.85)',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recenterIcon: {
    color: '#7CBFB0',
    fontSize: 22,
  },
  positionDisclaimer: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#888888',
    fontSize: 10,
    paddingHorizontal: 16,
  },
  attribution: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    color: '#888888',
    fontSize: 9,
    backgroundColor: 'rgba(244, 241, 237, 0.75)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
  },
});
