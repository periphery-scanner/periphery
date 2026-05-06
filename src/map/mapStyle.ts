import type { StyleSpecification } from '@maplibre/maplibre-react-native';

// TODO v2: move to build variable before public release
// Sign up free at https://maptiler.com — paste your key below.
const MAPTILER_API_KEY = 'your_key_here';

// Periphery muted basemap style. Geography is the ground; device icons are
// the figure. Palette reference: Section 4.6.1 of the v1.1 spec.
//
// Tile schema: OpenMapTiles (MapTiler vector tiles v3)
// All road, landuse, and building layer names reference that schema.
export function createPeripheryStyle(apiKey: string = MAPTILER_API_KEY): StyleSpecification {
  const tilesJson = `https://api.maptiler.com/tiles/v3/tiles.json?key=${apiKey}`;
  const glyphs = `https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=${apiKey}`;

  return {
    version: 8,
    name: 'Periphery',
    sources: {
      openmaptiles: { type: 'vector', url: tilesJson },
    },
    glyphs,
    layers: [
      // ── Canvas ──────────────────────────────────────────────────────────
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': '#F4F1ED' },
      },

      // ── Water ───────────────────────────────────────────────────────────
      {
        id: 'water-area',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'water',
        paint: { 'fill-color': '#C8D8E8' },
      },
      {
        id: 'waterway-line',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'waterway',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#C8D8E8', 'line-width': 1.5 },
      },

      // ── Greenspace ──────────────────────────────────────────────────────
      {
        id: 'landuse-park',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landuse',
        filter: ['in', 'class', 'park', 'national_park', 'cemetery', 'garden', 'grass'],
        paint: { 'fill-color': '#B8C8B0' },
      },
      {
        id: 'landcover-green',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landcover',
        filter: ['in', 'class', 'grass', 'wood', 'forest'],
        paint: { 'fill-color': '#C0C8B8' },
      },

      // ── Buildings ───────────────────────────────────────────────────────
      {
        id: 'building-fill',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'building',
        paint: {
          'fill-color': '#C8C8C8',
          'fill-outline-color': '#B8B8B8',
        },
        minzoom: 14,
      },

      // ── Roads (casing drawn first, fill on top) ──────────────────────
      {
        id: 'road-casing-major',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        filter: ['in', 'class', 'motorway', 'primary'],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#E0DEDA',
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 5, 16, 13],
        },
      },
      {
        id: 'road-motorway',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        filter: ['==', 'class', 'motorway'],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#D0D0D0',
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 3, 16, 10],
        },
      },
      {
        id: 'road-primary',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        filter: ['==', 'class', 'primary'],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#D4D4D4',
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2, 16, 8],
        },
      },
      {
        id: 'road-secondary',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        filter: ['==', 'class', 'secondary'],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#D8D8D8',
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.5, 16, 7],
        },
      },
      {
        id: 'road-tertiary',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        filter: ['==', 'class', 'tertiary'],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#DCDCDC',
          'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1, 16, 5],
        },
      },
      {
        id: 'road-minor',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        filter: ['==', 'class', 'minor'],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#DCDCDC',
          'line-width': ['interpolate', ['linear'], ['zoom'], 13, 1, 16, 3],
        },
      },
      {
        id: 'road-service',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        filter: ['==', 'class', 'service'],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#E4E4E4',
          'line-width': ['interpolate', ['linear'], ['zoom'], 14, 0.5, 16, 2],
        },
        minzoom: 13,
      },
      {
        id: 'road-path',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        filter: ['==', 'class', 'path'],
        layout: { 'line-join': 'round' },
        paint: {
          'line-color': '#E8E8E8',
          'line-width': 1,
          'line-dasharray': [2, 2],
        },
        minzoom: 14,
      },

      // ── Labels (on top of all geometry) ─────────────────────────────────
      {
        id: 'road-label-major',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'transportation_name',
        filter: ['in', 'class', 'motorway', 'primary', 'secondary'],
        layout: {
          'text-field': '{name}',
          'text-font': ['Open Sans Regular'],
          'text-size': 10,
          'symbol-placement': 'line',
          'text-max-angle': 30,
          'text-padding': 20,
        },
        paint: {
          'text-color': '#888888',
          'text-halo-color': '#F4F1ED',
          'text-halo-width': 1.5,
        },
      },
      {
        id: 'road-label-minor',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'transportation_name',
        filter: ['in', 'class', 'tertiary', 'minor'],
        minzoom: 15,
        layout: {
          'text-field': '{name}',
          'text-font': ['Open Sans Regular'],
          'text-size': 9,
          'symbol-placement': 'line',
          'text-max-angle': 30,
          'text-padding': 20,
        },
        paint: {
          'text-color': '#AAAAAA',
          'text-halo-color': '#F4F1ED',
          'text-halo-width': 1.5,
        },
      },
      {
        id: 'place-suburb',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'place',
        filter: ['in', 'class', 'suburb', 'neighbourhood', 'quarter'],
        minzoom: 14,
        layout: {
          'text-field': '{name}',
          'text-font': ['Open Sans Regular'],
          'text-size': 10,
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.1,
          'text-max-width': 8,
        },
        paint: {
          'text-color': '#999999',
          'text-halo-color': '#F4F1ED',
          'text-halo-width': 1.5,
        },
      },
      {
        id: 'park-label',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'poi',
        filter: ['in', 'class', 'park', 'national_park'],
        minzoom: 14,
        layout: {
          'text-field': '{name}',
          'text-font': ['Open Sans Regular'],
          'text-size': 10,
          'text-max-width': 8,
        },
        paint: {
          'text-color': '#808080',
          'text-halo-color': '#F4F1ED',
          'text-halo-width': 1.5,
        },
      },
    ],
  } as unknown as StyleSpecification;
}

export const PERIPHERY_MAP_STYLE = createPeripheryStyle();
