import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeSyntheticEvent } from 'react-native';
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map as MapView,
  Marker,
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
const EMA_ALPHA = 0.5;

const CATEGORY_COLORS: Record<string, string> = {
  phone:         '#7CBFB0',
  earbud:        '#7AAAC0',
  wearable_low:  '#C8B870',
  wearable_high: '#B86860',
  doorbell:      '#B86860',
  home_camera:   '#B86860',
  speaker_mic:   '#C8904A',
  vehicle:       '#8B949E',
  tracker:       '#58A6FF',
  unknown:       '#444C56',
};

const CATEGORY_RADIUS: Record<string, number> = {
  wearable_high: 10,
  doorbell:      10,
  home_camera:   10,
  speaker_mic:    8,
  vehicle:        9,
  phone:          8,
  wearable_low:   8,
  earbud:         7,
  tracker:        7,
  unknown:        5,
};

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
        EMA_ALPHA * longitude + (1 - EMA_ALPHA) * pLon,
        EMA_ALPHA * latitude + (1 - EMA_ALPHA) * pLat,
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

  // Only used for bearing updates — setIsTracking is NOT called here because
  // MapLibre fires userInteraction:true on compass rotations too, which would
  // immediately cancel re-engaged tracking. onTrackUserLocationChange is the
  // sole signal for disengagement.
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

  const getBearing = useCallback((id: string): number => {
    if (deviceBearings.current[id] === undefined) {
      deviceBearings.current[id] = Math.random() * 360;
    }
    return deviceBearings.current[id];
  }, []);

  // ── Device GeoJSON feature collection ────────────────────────────────────
  const deviceFeatures = useMemo((): GeoJSON.FeatureCollection => {
    if (!smoothedPos) return { type: 'FeatureCollection', features: [] };

    const now = Date.now();
    const cutoff = now - EXPIRY_WINDOW_MS;

    const features: GeoJSON.Feature[] = observations.map((obs) => {
      const b = getBearing(obs.id);
      const coords = offsetLatLon(smoothedPos, obs.estimatedDistanceM, b);
      const opacity = Math.max(0.15, (obs.lastSeenAt - cutoff) / EXPIRY_WINDOW_MS);

      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: coords },
        properties: {
          id: obs.id,
          color: CATEGORY_COLORS[obs.category] ?? CATEGORY_COLORS.unknown,
          radius: CATEGORY_RADIUS[obs.category] ?? 6,
          opacity,
        },
      };
    });

    return { type: 'FeatureCollection', features };
  }, [observations, smoothedPos, getBearing]);

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
              'circle-color': ['get', 'color'],
              'circle-radius': ['get', 'radius'],
              'circle-opacity': ['get', 'opacity'],
              'circle-stroke-width': 1.5,
              'circle-stroke-color': ['get', 'color'],
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
        style={[
          styles.compass,
          { transform: [{ rotate: `${-bearing}deg` }] },
        ]}
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
