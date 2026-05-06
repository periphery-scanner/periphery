import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map as MapView,
  UserLocation,
  useCurrentPosition,
} from '@maplibre/maplibre-react-native';
import { PERIPHERY_MAP_STYLE } from './mapStyle';
import { geoCircle } from '../utils/geo';

// TODO: replace with user-controlled radius from Phase 4 (Section 4.4)
const SCAN_RADIUS_M = 30;

interface Props {
  onBack: () => void;
}

export function MapScreen({ onBack }: Props) {
  const position = useCurrentPosition();

  const userCoords: [number, number] | null = position?.coords
    ? [position.coords.longitude, position.coords.latitude]
    : null;

  const radiusFeature = userCoords ? geoCircle(userCoords, SCAN_RADIUS_M) : null;

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        mapStyle={PERIPHERY_MAP_STYLE}
        attribution={false}
        logo={false}
        compass={false}
        scaleBar={false}
      >
        {/* North-up, follows user. Compass rotation added in Phase 3b. */}
        <Camera trackUserLocation="default" zoom={16} />

        {/* Blue location puck — MapLibre default is soft blue on Android */}
        <UserLocation />

        {/* 30m scan radius circle */}
        {radiusFeature && (
          <GeoJSONSource id="scan-radius" data={radiusFeature}>
            <Layer
              id="radius-fill"
              type="fill"
              paint={{
                'fill-color': '#4A90D9',
                'fill-opacity': 0.07,
              }}
            />
            <Layer
              id="radius-outline"
              type="line"
              paint={{
                'line-color': '#4A90D9',
                'line-opacity': 0.30,
                'line-width': 1.5,
              }}
            />
          </GeoJSONSource>
        )}
      </MapView>

      {/* Back button — top-left */}
      <Pressable
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        onPress={onBack}
        accessibilityLabel="Back to score view"
      >
        <Text style={styles.backText}>‹ Score</Text>
      </Pressable>

      {/* Compass placeholder — top-right. Phase 3b replaces with live rotation. */}
      <View style={styles.compass} pointerEvents="none">
        <Text style={styles.compassArrow}>↑</Text>
        <Text style={styles.compassLabel}>N</Text>
      </View>

      {/* MapTiler attribution — required by ToS */}
      <Text style={styles.attribution}>© MapTiler © OpenStreetMap contributors</Text>
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
