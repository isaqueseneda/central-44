/**
 * Geographic utility functions for distance calculations
 */

export interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * Calculate the Haversine distance between two points in kilometers.
 * The Haversine formula accounts for Earth's curvature.
 */
export function haversineDistance(a: GeoPoint, b: GeoPoint): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/**
 * Calculate total distance for a route (array of points) in kilometers.
 */
export function calculateRouteDistance(points: GeoPoint[]): number {
  if (points.length < 2) return 0;

  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += haversineDistance(points[i], points[i + 1]);
  }
  return total;
}

/**
 * Calculate distances between consecutive points in a route.
 * Returns an array where index i is the distance from point i to point i+1.
 */
export function calculateSegmentDistances(points: GeoPoint[]): number[] {
  if (points.length < 2) return [];

  const distances: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    distances.push(haversineDistance(points[i], points[i + 1]));
  }
  return distances;
}

/**
 * Format distance for display (e.g., "45.3 km")
 */
export function formatDistance(km: number): string {
  return `${Math.round(km * 10) / 10} km`;
}
