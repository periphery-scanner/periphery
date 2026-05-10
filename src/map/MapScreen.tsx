import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeSyntheticEvent } from 'react-native';
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map as MapView,
  useCurrentPosition,
  type CameraRef,
  type TrackUserLocationChangeEvent,
  type ViewStateChangeEvent,
  type PressEventWithFeatures,
} from '@maplibre/maplibre-react-native';
import { PERIPHERY_MAP_STYLE } from './mapStyle';
import { geoCircle, offsetLatLon } from '../utils/geo';
import {
  passesAccuracyFilter,
  passesMotionFilter,
  GPS_STALE_MS,
  GPS_CONFIDENCE_ACCURACY_M,
  type AcceptedReading,
} from '../utils/gpsFilter';
import { useScanStore, EXPIRY_WINDOW_MS } from '../store/scanStore';
import { calculateScore } from '../score/calculator';
import { DeviceObservation, DeviceCategory } from '../ble/types';
import { OverlayBadge } from '../ui/OverlayBadge';
import { CategoryLegend } from '../ui/CategoryLegend';
import { DetailSurface } from '../ui/DetailSurface';
import { DeviceDetailModal } from '../ui/DeviceDetailModal';
import { RadiusSliderChip } from '../ui/RadiusSliderChip';
import { RadiusPresetPopover } from '../ui/RadiusPresetPopover';
import { RadiusFlashIndicator } from '../ui/RadiusFlashIndicator';
import { SettingsSheet } from '../ui/SettingsSheet';
import { WhyClassifiedPage } from '../ui/WhyClassifiedPage';
import { PrivacyWhitepaperPage } from '../ui/PrivacyWhitepaperPage';
import { TermsOfServicePage } from '../ui/TermsOfServicePage';
import { useSettingsStore } from '../store/settingsStore';

const USER_POSITION_EMA_ALPHA = 0.25;

const FADE_START_MS = 30_000;
const FADE_WINDOW_MS = EXPIRY_WINDOW_MS - FADE_START_MS;
const PULSE_DURATION_MS = 300;
const POSITION_EMA_ALPHA = 0.35;
const ANIM_TICK_MS = 50;

const MOBILE_CATEGORIES = new Set(['phone', 'wearable_high', 'wearable_low', 'earbud']);

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

const WEARABLE_HIGH_RADIUS = 10;
const STANDARD_RADIUS = 7;
const DESATURATED_COLOR = '#4A5260';

// Display order for the category legend — highest threat first
const CATEGORY_ORDER: DeviceCategory[] = [
  'wearable_high', 'home_camera', 'doorbell', 'speaker_mic',
  'vehicle', 'phone', 'wearable_low', 'tracker', 'earbud', 'unknown',
];

interface Props {
  permissionsGranted: boolean;
  onMapReady?: () => void;
}

export function MapScreen({ permissionsGranted, onMapReady }: Props) {
  // Two separate useScanStore calls (not a single object selector) because
  // Zustand's default equality check is Object.is. A selector returning
  // {observations, scoreHistory} would create a fresh object on every call,
  // causing infinite re-renders when combined with the 20fps animTick loop.
  // Single-value selectors return stable array references that Zustand
  // compares correctly. See git history for the Phase 3d crash this prevented.
  const observations = useScanStore((s) => s.observations);
  const scoreHistory = useScanStore((s) => s.scoreHistory);

  // Settings — single-value selectors for the same reason above
  const scanRadiusMeters = useSettingsStore((s) => s.scanRadiusMeters);
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);
  const settingsHydrated = useSettingsStore((s) => s.hydrated);
  const setScanRadiusMeters = useSettingsStore((s) => s.setScanRadiusMeters);
  const disabledCategoriesArr = useSettingsStore((s) => s.disabledCategories);
  const disabledCategoriesSet = useMemo(
    () => new Set<DeviceCategory>(disabledCategoriesArr as DeviceCategory[]),
    [disabledCategoriesArr]
  );

  // ── Radius animation ──────────────────────────────────────────────────────
  // displayRadiusM drives geoCircle and outside-radius opacity.
  // During drag: setValue() for instant visual response.
  // On preset select: Animated.timing() for 200ms easeOut.
  const animRadiusRef = useRef(new Animated.Value(scanRadiusMeters));
  const currentAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const [displayRadiusM, setDisplayRadiusM] = useState(scanRadiusMeters);

  useEffect(() => {
    const id = animRadiusRef.current.addListener(({ value }) => setDisplayRadiusM(value));
    return () => animRadiusRef.current.removeListener(id);
  }, []);

  // ── Flash indicator + preset popover state ────────────────────────────────
  // flashTrigger declared before the callbacks that call setFlashTrigger
  const [flashTrigger, setFlashTrigger] = useState(0);
  const [presetOpen, setPresetOpen] = useState(false);

  const handleRadiusDrag = useCallback((v: number) => {
    currentAnimRef.current?.stop();
    animRadiusRef.current.setValue(v);
    setScanRadiusMeters(v);
    setFlashTrigger((n) => n + 1);
  }, [setScanRadiusMeters]);

  const handleRadiusPreset = useCallback((v: number) => {
    currentAnimRef.current?.stop();
    currentAnimRef.current = Animated.timing(animRadiusRef.current, {
      toValue: v,
      duration: 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    });
    currentAnimRef.current.start(() => { currentAnimRef.current = null; });
    setScanRadiusMeters(v);
    setFlashTrigger((n) => n + 1);
  }, [setScanRadiusMeters]);

  // ── Location smoothing with quality filtering ─────────────────────────────
  // Location components must be gated on permissionsGranted because MapScreen
  // is the root view in Phase 3d (mounts before permissions resolve). MapLibre's
  // native location modules silently fail if started before permissions are
  // granted — they never activate, never recover, and the user dot never appears.
  // See git history for the Phase 3d location-lifecycle bug this prevents.
  const rawPosition = useCurrentPosition({ enabled: permissionsGranted });
  const smoothedRef = useRef<[number, number] | null>(null);
  const [smoothedPos, setSmoothedPos] = useState<[number, number] | null>(null);

  // Filter state — refs so updates don't trigger re-renders
  const lastAcceptedRef = useRef<AcceptedReading | null>(null);
  const lastPositionUpdateMsRef = useRef<number>(0);
  const lastAcceptedAccuracyRef = useRef<number>(Infinity);

  useEffect(() => {
    if (!rawPosition?.coords) return;
    const { longitude, latitude, accuracy } = rawPosition.coords;
    const timestampMs = rawPosition.timestamp;

    // Debug: console.log('[GPS] raw', { lat: latitude, lon: longitude, accuracy, accuracyPass: passesAccuracyFilter(accuracy), motionPass: passesMotionFilter(longitude, latitude, timestampMs, lastAcceptedRef.current) });

    // Reject cell-tower fallback positions and other low-accuracy readings
    if (!passesAccuracyFilter(accuracy)) return;

    // Reject physically impossible jumps (>10 m/s implies teleportation artifact)
    if (!passesMotionFilter(longitude, latitude, timestampMs, lastAcceptedRef.current)) return;

    // Reading accepted — update filter state
    lastAcceptedRef.current = { lon: longitude, lat: latitude, timestampMs };
    lastPositionUpdateMsRef.current = Date.now();
    lastAcceptedAccuracyRef.current = accuracy;

    // EMA smoothing (α=0.25 — heavier smoothing than Phase 3c to reduce zigzag)
    if (!smoothedRef.current) {
      smoothedRef.current = [longitude, latitude];
    } else {
      const [pLon, pLat] = smoothedRef.current;
      smoothedRef.current = [
        USER_POSITION_EMA_ALPHA * longitude + (1 - USER_POSITION_EMA_ALPHA) * pLon,
        USER_POSITION_EMA_ALPHA * latitude + (1 - USER_POSITION_EMA_ALPHA) * pLat,
      ];
    }
    // Debug: console.log('[GPS] smoothedPos updated', smoothedRef.current);
    setSmoothedPos([...smoothedRef.current] as [number, number]);
  }, [rawPosition]);

  // ── Camera tracking / panning ─────────────────────────────────────────────
  const cameraRef = useRef<CameraRef>(null);
  const [isTracking, setIsTracking] = useState(true);
  const [bearing, setBearing] = useState(0);

  const handleTrackingChange = useCallback(
    (e: NativeSyntheticEvent<TrackUserLocationChangeEvent>) => {
      if (e.nativeEvent.trackUserLocation === null) setIsTracking(false);
    },
    []
  );

  // Bearing updates only — tracking disengagement handled solely by
  // onTrackUserLocationChange (MapLibre fires userInteraction:true on compass
  // rotations, which would race against re-engaged tracking).
  const handleRegionChange = useCallback(
    (e: NativeSyntheticEvent<ViewStateChangeEvent>) => {
      setBearing(e.nativeEvent.bearing);
    },
    []
  );

  const handleRecenter = useCallback(() => {
    setIsTracking(true);
    // Intentionally preserves user zoom level — see Phase 3b notes.
  }, []);

  // ── Score breakdown ───────────────────────────────────────────────────────
  const breakdown = useMemo(
    () => calculateScore(observations),
    [observations]
  );

  // ── Category legend / desaturation ───────────────────────────────────────
  const [desaturatedCategories, setDesaturatedCategories] = useState<
    Set<DeviceCategory>
  >(new Set());

  const toggleCategory = useCallback((cat: DeviceCategory) => {
    setDesaturatedCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }, []);

  // Enabled categories with currently detected devices — feeds the legend's normal rows.
  // Persistently-disabled categories are excluded here; they appear in the legend
  // separately via the disabledCategoriesSet prop.
  const detectedCategories = useMemo(
    () =>
      CATEGORY_ORDER.filter(
        (c) => !disabledCategoriesSet.has(c) && observations.some((o) => o.category === c)
      ),
    [observations, disabledCategoriesSet]
  );

  // ── Detail surface ────────────────────────────────────────────────────────
  const [detailOpen, setDetailOpen] = useState(false);

  // ── Settings sheet ────────────────────────────────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false);

  // ── Why classified page ───────────────────────────────────────────────────
  // Rendered here (sibling of DetailSurface) rather than inside DetailSurface
  // to avoid nested Modal issues on Android — hardware back button routes to
  // the first Modal in the tree, not the most recently opened one.
  const [whyClassifiedOpen, setWhyClassifiedOpen] = useState(false);

  // ── Document pages (Privacy Whitepaper, Terms of Service) ─────────────────
  // Same sibling-Modal pattern as WhyClassifiedPage.
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [tosOpen, setTosOpen] = useState(false);

  const wearableObservations = useMemo(
    () => observations.filter((o) => o.category === 'wearable_high'),
    [observations]
  );

  // ── Per-device drill-down ─────────────────────────────────────────────────
  const [selectedDevice, setSelectedDevice] = useState<DeviceObservation | null>(null);

  // ── Stable random bearings per device ────────────────────────────────────
  const deviceBearings = useRef<Record<string, number>>({});
  const getDeviceBearing = useCallback((id: string): number => {
    if (deviceBearings.current[id] === undefined) {
      deviceBearings.current[id] = Math.random() * 360;
    }
    return deviceBearings.current[id];
  }, []);

  // ── Animation tick (~20fps) ───────────────────────────────────────────────
  const [animTick, setAnimTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setAnimTick((t) => t + 1), ANIM_TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Per-device smoothed distances — side effect in useMemo is intentional.
  // See Phase 3c comment: safe in production (no StrictMode), minor dev jitter only.
  const deviceDistancesRef = useRef<Record<string, number>>({});

  // ── Device GeoJSON feature collection ────────────────────────────────────
  const deviceFeatures = useMemo((): GeoJSON.FeatureCollection => {
    if (!smoothedPos) return { type: 'FeatureCollection', features: [] };

    const now = Date.now();

    const features: GeoJSON.Feature[] = observations
      .filter((obs) => !disabledCategoriesSet.has(obs.category))
      .map((obs) => {
        const isWearableHigh = obs.category === 'wearable_high';
        const isDesaturated = desaturatedCategories.has(obs.category);

      // Position EMA for mobile categories
      let displayDist = obs.estimatedDistanceM;
      if (MOBILE_CATEGORIES.has(obs.category)) {
        const prev = deviceDistancesRef.current[obs.id];
        displayDist =
          prev !== undefined
            ? POSITION_EMA_ALPHA * obs.estimatedDistanceM +
              (1 - POSITION_EMA_ALPHA) * prev
            : obs.estimatedDistanceM;
        deviceDistancesRef.current[obs.id] = displayDist;
      }

      const coords = offsetLatLon(smoothedPos, displayDist, getDeviceBearing(obs.id));

      // Fade-out: full opacity for 30s, linear fade to 0 over following 30s
      const sinceLastSeen = now - obs.lastSeenAt;
      const fadeOpacity =
        sinceLastSeen <= FADE_START_MS
          ? 1.0
          : Math.max(
              0,
              1 - (sinceLastSeen - FADE_START_MS) / FADE_WINDOW_MS
            );

      // Pulse-in: ramp from 0 over PULSE_DURATION_MS on first detection
      const pulseProgress = Math.min(
        1,
        (now - obs.firstSeenAt) / PULSE_DURATION_MS
      );

      const baseRadius = isWearableHigh ? WEARABLE_HIGH_RADIUS : STANDARD_RADIUS;
      const color = isDesaturated
        ? DESATURATED_COLOR
        : (CATEGORY_COLORS[obs.category] ?? CATEGORY_COLORS.unknown);

      // Devices outside the chosen radius render at ≤0.3 opacity (display-only;
      // score and category counts reflect all detected devices regardless).
      const outsideRadius = displayDist > displayRadiusM;
      const opacity = isDesaturated
        ? 0.25 * pulseProgress
        : outsideRadius
          ? Math.min(fadeOpacity, 0.3) * pulseProgress
          : fadeOpacity * pulseProgress;

      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: coords },
        properties: {
          id: obs.id,
          color,
          radius: baseRadius * (0.8 + 0.2 * pulseProgress),
          opacity,
          blur: isWearableHigh ? 0 : 0.6,
          strokeWidth: isWearableHigh && !isDesaturated ? 1.5 : 0,
        },
      };
    });

    return { type: 'FeatureCollection', features };
  }, [observations, smoothedPos, getDeviceBearing, desaturatedCategories, disabledCategoriesSet, displayRadiusM, animTick]);

  const handleDevicePress = useCallback(
    (e: NativeSyntheticEvent<PressEventWithFeatures>) => {
      const feature = e.nativeEvent.features[0];
      if (!feature?.properties?.id) return;
      const obs = observations.find((o) => o.id === feature.properties!.id);
      if (obs) setSelectedDevice(obs);
    },
    [observations]
  );

  const radiusFeature = smoothedPos
    ? geoCircle(smoothedPos, displayRadiusM)
    : null;

  // User dot GeoJSON — recomputed on animTick so staleness (>10s) is detected
  // without needing a separate interval. Opacity fades to 0.6 when GPS is stale
  // or inaccurate (>25m); full opacity when confident.
  const userDotFeature = useMemo((): GeoJSON.FeatureCollection | null => {
    if (!smoothedPos) return null;
    const stale =
      lastPositionUpdateMsRef.current === 0 ||
      Date.now() - lastPositionUpdateMsRef.current > GPS_STALE_MS;
    const inaccurate = lastAcceptedAccuracyRef.current > GPS_CONFIDENCE_ACCURACY_M;
    const opacity = stale || inaccurate ? 0.6 : 1.0;
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: smoothedPos },
          properties: { opacity },
        },
      ],
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [smoothedPos, animTick]);

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
        onDidFinishLoadingStyle={onMapReady}
      >
        <Camera
          ref={cameraRef}
          trackUserLocation={permissionsGranted && isTracking ? 'heading' : undefined}
          zoom={16}
          onTrackUserLocationChange={handleTrackingChange}
        />

        {/* Scan radius — drawn first so it sits below all dots */}
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

        {/* Device dots — above radius, below user dot */}
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

        {/* User dot — topmost layer, single source of truth with radius circle.
            Rendered from smoothedPos (filtered + EMA) so dot and circle always
            agree. Opacity fades to 0.6 when GPS is stale or inaccurate. */}
        {userDotFeature && (
          <GeoJSONSource id="user-position" data={userDotFeature}>
            <Layer
              id="user-dot"
              type="circle"
              paint={{
                'circle-color':          '#4A90D9',
                'circle-radius':         8,
                'circle-opacity':        ['get', 'opacity'],
                'circle-stroke-width':   2,
                'circle-stroke-color':   '#ffffff',
                'circle-stroke-opacity': ['get', 'opacity'],
              }}
            />
          </GeoJSONSource>
        )}
      </MapView>

      {/* ── Row 1 (top: 52): legend | [space] | compass ── */}
      <View style={styles.topRow} pointerEvents="box-none">
        <CategoryLegend
          detectedCategories={detectedCategories}
          desaturated={desaturatedCategories}
          onToggle={toggleCategory}
          disabledCategories={disabledCategoriesSet}
          onDisabledTap={() => setSettingsOpen(true)}
        />
        {/* Compass — top-right, rotates with map bearing */}
        <View
          style={[
            styles.compass,
            { transform: [{ rotate: `${-bearing}deg` }] },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.compassArrow}>↑</Text>
          <Text style={styles.compassLabel}>N</Text>
        </View>
      </View>

      {/* Radius slider chip — top-right, below compass (top 108 = compass top 52 + height 40 + gap 16) */}
      <View style={styles.sliderChipPosition} pointerEvents="box-none">
        <RadiusSliderChip
          value={displayRadiusM}
          hydrated={settingsHydrated}
          unit={distanceUnit}
          onDrag={handleRadiusDrag}
          onLongPress={() => setPresetOpen(true)}
        />
      </View>

      {/* ── Row 2 (top: 104): overlay badge centered ── */}
      <View style={styles.badgeRow} pointerEvents="box-none">
        <OverlayBadge
          tier={breakdown.tier}
          deviceCount={breakdown.observationCount}
          wearableCount={breakdown.byCategory.wearable_high ?? 0}
          onPress={() => setDetailOpen(true)}
        />
      </View>

      {/* ── Bottom-right slot: settings FAB (tracking) | recenter pill (panned) ── */}
      {isTracking ? (
        <Pressable
          style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
          onPress={() => setSettingsOpen(true)}
          accessibilityLabel="Open settings"
          accessibilityRole="button"
        >
          <Text style={styles.fabIcon}>⚙︎</Text>
        </Pressable>
      ) : (
        <Pressable
          style={({ pressed }) => [styles.recenterPill, pressed && styles.pressed]}
          onPress={handleRecenter}
          accessibilityLabel="Re-center on my location"
          accessibilityRole="button"
        >
          <Text style={styles.recenterText}>◎  Recenter</Text>
        </Pressable>
      )}

      {/* Honest position footer — Section 4.6.8 */}
      <Text style={styles.positionDisclaimer} pointerEvents="none">
        Device positions are approximate. Bearings are estimated, not measured.
      </Text>

      {/* MapTiler attribution — required by ToS */}
      <Text style={styles.attribution}>© MapTiler © OpenStreetMap contributors</Text>

      {!permissionsGranted && (
        <View style={styles.permissionPending} pointerEvents="none">
          <Text style={styles.permissionPendingText}>
            Awaiting location permission…
          </Text>
        </View>
      )}

      {/* Flash indicator — shows current radius on change, fades after 1s idle */}
      {smoothedPos !== null && flashTrigger > 0 && (
        <RadiusFlashIndicator
          value={displayRadiusM}
          unit={distanceUnit}
          triggerCount={flashTrigger}
        />
      )}

      <DetailSurface
        visible={detailOpen}
        breakdown={breakdown}
        scoreHistory={scoreHistory}
        wearableObservations={wearableObservations}
        onClose={() => setDetailOpen(false)}
        onOpenMethodology={() => setWhyClassifiedOpen(true)}
      />

      <DeviceDetailModal
        visible={selectedDevice !== null}
        observation={selectedDevice}
        onClose={() => setSelectedDevice(null)}
      />

      <RadiusPresetPopover
        visible={presetOpen}
        currentRadiusMeters={scanRadiusMeters}
        unit={distanceUnit}
        onSelect={handleRadiusPreset}
        onDismiss={() => setPresetOpen(false)}
      />

      <SettingsSheet
        visible={settingsOpen}
        onDismiss={() => setSettingsOpen(false)}
        onOpenPrivacy={() => setPrivacyOpen(true)}
        onOpenTos={() => setTosOpen(true)}
      />

      <WhyClassifiedPage
        visible={whyClassifiedOpen}
        onDismiss={() => setWhyClassifiedOpen(false)}
      />

      <PrivacyWhitepaperPage
        visible={privacyOpen}
        onDismiss={() => setPrivacyOpen(false)}
      />

      <TermsOfServicePage
        visible={tosOpen}
        onDismiss={() => setTosOpen(false)}
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

  // ── Top HUD ──────────────────────────────────────────────────────────────
  topRow: {
    position: 'absolute',
    top: 52,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badgeRow: {
    position: 'absolute',
    top: 104,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  compass: {
    backgroundColor: 'rgba(13, 17, 23, 0.75)',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderChipPosition: {
    position: 'absolute',
    top: 108,
    right: 12,
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

  // ── Bottom-right slot ─────────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(13, 17, 23, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIcon: {
    color: '#7CBFB0',
    fontSize: 20,
    fontWeight: '600',
  },
  recenterPill: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    backgroundColor: 'rgba(13, 17, 23, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recenterText: {
    color: '#7CBFB0',
    fontSize: 14,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
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

  // ── Permissions pending ───────────────────────────────────────────────────
  permissionPending: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  permissionPendingText: {
    color: '#8b949e',
    fontSize: 12,
    fontStyle: 'italic',
  },
});
