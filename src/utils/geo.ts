export function offsetLatLon(
  center: [number, number],
  distanceM: number,
  bearingDeg: number
): [number, number] {
  const [lon, lat] = center;
  const latRad = lat * (Math.PI / 180);
  const bearingRad = bearingDeg * (Math.PI / 180);
  const deltaLat = (distanceM * Math.cos(bearingRad)) / 111_320;
  const deltaLon =
    (distanceM * Math.sin(bearingRad)) / (111_320 * Math.cos(latRad));
  return [lon + deltaLon, lat + deltaLat];
}

export function geoCircle(
  center: [number, number],
  radiusM: number,
  numPoints = 64
): GeoJSON.Feature<GeoJSON.Polygon> {
  const [lon, lat] = center;
  const latRad = lat * (Math.PI / 180);
  const deltaLat = radiusM / 111_320;
  const deltaLon = radiusM / (111_320 * Math.cos(latRad));
  const coords: [number, number][] = [];
  for (let i = 0; i <= numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI;
    coords.push([
      lon + deltaLon * Math.cos(angle),
      lat + deltaLat * Math.sin(angle),
    ]);
  }
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [coords] },
    properties: {},
  };
}
