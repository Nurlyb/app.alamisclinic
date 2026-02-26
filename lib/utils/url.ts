/**
 * Extract the last segment from a URL path (typically an ID in dynamic routes)
 */
export function extractIdFromUrl(url: string): string {
  const pathParts = new URL(url).pathname.split('/');
  return pathParts[pathParts.length - 1];
}
