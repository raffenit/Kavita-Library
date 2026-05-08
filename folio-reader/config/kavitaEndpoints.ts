// Kavita API Endpoint Configuration
// Centralized endpoint definitions for different API versions

export const KAVITA_ENDPOINTS = {
  // Library endpoints - tried in order
  libraries: [
    '/api/Library',         // Standard library endpoint
    '/api/library',         // Lowercase variant
    '/api/v2/library',      // v2 variant
    '/api/Library/all',     // Legacy fallback
  ],

  // Series endpoints - tried in order
  series: {
    // For fetching all series across libraries
    all: [
      '/api/Series/v2',     // Kavita v2 API (correct pattern)
      '/api/v2/series',     // Alternative v2 pattern
      '/api/series/all',    // Lowercase variant
      '/api/Series/all',    // Capitalized variant
    ],
    // For fetching series from a specific library
    byLibrary: [
      '/api/Series/v2',     // Kavita v2 API (correct pattern)
      '/api/v2/series',     // Alternative v2 pattern
      '/api/Series/all',    // v1 endpoint
    ],
  },

  // Other endpoints
  onDeck: '/api/Series/on-deck',
  login: '/api/Account/login',
  pluginAuth: '/api/Plugin/authenticate',
} as const;

// Helper to get the first endpoint to try
export const getFirstEndpoint = (endpoints: string[]): string => endpoints[0];

// Helper to iterate through endpoints with a callback
export async function tryEndpoints<T>(
  endpoints: string[],
  callback: (endpoint: string) => Promise<T>,
  context?: string
): Promise<T | null> {
  for (const endpoint of endpoints) {
    try {
      if (context) {
        console.log(`[${context}] Trying ${endpoint}...`);
      }
      const result = await callback(endpoint);
      if (result !== null && result !== undefined) {
        if (context) {
          console.log(`[${context}] Success with ${endpoint}`);
        }
        return result;
      }
    } catch (error: any) {
      if (context) {
        console.warn(`[${context}] ${endpoint} failed:`, error.response?.status || error.message);
      }
    }
  }
  return null;
}
