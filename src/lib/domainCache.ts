/**
 * In-memory cache for custom domain → station mappings.
 * Edge-compatible (synchronous Map, no Node.js APIs).
 * Refreshed via POST /api/admin/cache/refresh (SUPERADMIN only).
 */

export interface DomainMapping {
  stationId: string;
  brandName: string | null;
  brandColor: string | null;
  brandLogoUrl: string | null;
  brandFaviconUrl: string | null;
}

const domainCache = new Map<string, DomainMapping>();

/**
 * Look up a custom domain in the cache.
 * Returns undefined if the domain is not mapped.
 */
export function getDomainMapping(hostname: string): DomainMapping | undefined {
  return domainCache.get(hostname);
}

/**
 * Add or update a domain mapping in the cache.
 */
export function setDomainMapping(hostname: string, mapping: DomainMapping): void {
  domainCache.set(hostname, mapping);
}

/**
 * Remove a domain mapping from the cache.
 */
export function removeDomainMapping(hostname: string): void {
  domainCache.delete(hostname);
}

/**
 * Return a shallow copy of all mappings.
 * Useful for introspection / admin endpoints.
 */
export function getAllMappings(): Map<string, DomainMapping> {
  return new Map(domainCache);
}

/**
 * Clear all mappings (used during full refresh).
 */
export function clearAllMappings(): void {
  domainCache.clear();
}

/**
 * Bulk-set mappings from an array (used during cache refresh).
 */
export function setAllMappings(
  mappings: Array<{ hostname: string; mapping: DomainMapping }>
): void {
  domainCache.clear();
  for (const { hostname, mapping } of mappings) {
    domainCache.set(hostname, mapping);
  }
}
