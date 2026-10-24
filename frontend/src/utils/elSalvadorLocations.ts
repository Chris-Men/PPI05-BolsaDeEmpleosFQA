import type { LocationZone } from '../types/profile';

/** Looks up municipalities in the API catalog rather than maintaining a second location list. */
export const municipalitiesOf = (department: string, zones: LocationZone[]): string[] =>
  zones.flatMap(zone => zone.departments).find(item => item.name === department)?.municipalities ?? [];
