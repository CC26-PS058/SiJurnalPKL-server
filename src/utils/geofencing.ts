/**
 * Haversine formula to calculate distance between two GPS coordinates
 * Returns distance in meters
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Check if a student's GPS position is within the industry's geofence radius
 */
export function isWithinRadius(
  studentLat: number,
  studentLon: number,
  industryLat: number,
  industryLon: number,
  radiusMeters: number
): { within: boolean; distance: number } {
  const distance = haversineDistance(studentLat, studentLon, industryLat, industryLon);
  return {
    within: distance <= radiusMeters,
    distance: Math.round(distance),
  };
}
