/**
 * Extract the last segment from a URL path (typically an ID in dynamic routes)
 * @param url - The full URL
 * @param fromEnd - Position from the end (1 = last segment, 2 = second to last, etc.)
 */
export function extractIdFromUrl(url: string, fromEnd: number = 1): string {
  const pathParts = new URL(url).pathname.split('/').filter(Boolean);
  return pathParts[pathParts.length - fromEnd];
}
