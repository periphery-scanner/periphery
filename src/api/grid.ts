/**
 * Privacy-preserving spatial aggregation.
 *
 * Before any observation leaves the device, lat/lng are snapped to a ~50m
 * grid cell. This makes individual user trails mathematically irrecoverable
 * from the uploaded data.
 *
 * 50m cell size chosen because:
 *  - Block-level resolution is sufficient for the heatmap UX
 *  - Sub-50m resolution would let an adversary correlate trails
 *  - At 50m, even repeated visits to a specific home are blurred
 */

const GRID_CELL_DEGREES = 0.00045; // ~50m at the equator

export interface GridCell {
  cellLat: number;
  cellLng: number;
  cellId: string;
}

export function snapToGrid(lat: number, lng: number): GridCell {
  const cellLat = Math.round(lat / GRID_CELL_DEGREES) * GRID_CELL_DEGREES;
  const cellLng = Math.round(lng / GRID_CELL_DEGREES) * GRID_CELL_DEGREES;
  return {
    cellLat,
    cellLng,
    cellId: `${cellLat.toFixed(5)},${cellLng.toFixed(5)}`,
  };
}

export function gridCellId(lat: number, lng: number): string {
  return snapToGrid(lat, lng).cellId;
}
