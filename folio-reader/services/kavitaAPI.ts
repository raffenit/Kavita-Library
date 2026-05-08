import axios, { AxiosInstance } from 'axios';
import { Platform } from 'react-native';
import { KAVITA_ENDPOINTS, tryEndpoints } from '../config/kavitaEndpoints';
import { storage } from './storage';
import { PROXY_PATH, isProxied, extractTargetUrl } from '@/config/proxy';
import { credentials, STORAGE_KEYS } from '@/config/credentials';

/**
 * Dynamic Universal Tunnel Logic
 * Instead of hardcoding proxy URLs, we now stick to the user's original server URL
 * for everything, and only tunnel through the local origin when Bypass CORS is enabled.
 * 
 * Credentials are managed centrally via @/config/credentials
 */

export interface KavitaBookInfo {
  pages: number;
  bookTitle?: string;
  lastReadPage?: number; 
  chapterId?: number;
  
  // This allows other properties without errors
  [key: string]: any; 
}

export interface Library {
  id: number;
  name: string;
  type: number; // 0=Manga, 1=Comic, 2=Book
  coverImage?: string;
  series: number;
}

export interface Series {
  id: number;
  name: string;           // scanner-controlled, read-only
  originalName: string;
  localizedName?: string; // user-editable display override
  sortName: string;
  summary?: string;
  coverImage?: string;
  libraryId: number;
  libraryName?: string;
  pagesRead: number;
  pages: number;
  userRating: number;
  format: number; // 0=Unknown, 1=Archive(CBZ), 2=Unknown, 3=Epub, 4=PDF
  created: string;
  lastModified: string;
  server?: string;
}

export interface Volume {
  id: number;
  number: number;
  name: string;
  chapters: Chapter[];
  pagesRead: number;
  pages: number;
  coverImage?: string;
}

export interface Chapter {
  id: number;
  number: string;
  range: string;
  title: string;
  pages: number;
  pagesRead: number;
  coverImage?: string;
  volumeId: number;
  isSpecial: boolean;
  summary?: string;
  files: ChapterFile[];
}

export interface ChapterFile {
  id: number;
  filePath: string;
  pages: number;
  format: number; // 0=Unknown, 1=Archive(CBZ), 2=Unknown, 3=Epub, 4=PDF, 9=AZW3/MOBI
}

export interface SeriesDetail {
  id: number;
  name: string;           // scanner-controlled, read-only
  localizedName?: string; // user-editable display override
  sortName?: string;
  summary?: string;
  coverImage?: string;
  libraryId: number;
  volumes: Volume[];
}

export interface Collection {
  id: number;
  title: string;
  promoted: boolean;
  coverImage?: string;
  summary?: string;
}

export interface Genre {
  id: number;
  title: string;
}

export interface Tag {
  id: number;
  title: string;
}

// The metadata object returned by GET /api/Series/metadata?seriesId=X
export interface SeriesMetadata {
  id: number;
  seriesId: number;
  summary?: string;
  genres: Genre[];
  tags: Tag[];
  writers?: { id: number; name: string }[];
  coverArtists?: { id: number; name: string }[];
  publishers?: { id: number; name: string }[];
  characters?: { id: number; name: string }[];
  pencillers?: { id: number; name: string }[];
  inkers?: { id: number; name: string }[];
  colorists?: { id: number; name: string }[];
  letterers?: { id: number; name: string }[];
  editors?: { id: number; name: string }[];
  translators?: { id: number; name: string }[];
  ageRating?: number;
  releaseYear?: number;
  language?: string;
  maxCount?: number;
  totalCount?: number;
  publicationStatus?: number;
}

export interface BookTocEntry {
  title: string;
  page: number;
  children?: BookTocEntry[];
}

export interface ChapterInfo {
  chapterId: number;
  seriesId: number;
  volumeId: number;
  libraryId: number;
  pages: number;
  lastReadPage?: number; // Add this here
  title?: string;
  fileName?: string;
  isSpecial: boolean;
}

// Format preference order: PDF (4) > EPUB (3) > Archive/CBZ (1) > other
// Lower return value = higher preference
function formatPriority(fmt: number): number {
  if (fmt === 4) return 0; // PDF — highest preference
  if (fmt === 3) return 1; // EPUB
  if (fmt === 1) return 2; // Archive/CBZ
  return 3;                // Unknown / Azw3 / Mobi etc.
}

// Given a list of chapter files, return the one with the best (lowest priority) format
export function pickBestFile(files: ChapterFile[]): ChapterFile | undefined {
  if (!files?.length) return undefined;
  return [...files].sort((a, b) => formatPriority(a.format) - formatPriority(b.format))[0];
}

// Given a chapter, return its effective format using pickBestFile
export function chapterEffectiveFormat(chapter: Chapter): number {
  const best = pickBestFile(chapter.files);
  return best?.format ?? chapter.files?.[0]?.format ?? 0;
}

class KavitaAPI {
  private client: AxiosInstance;
  private serverUrl: string = '';
  private apiKey: string = '';
  private username: string = '';
  private password: string = '';
  private jwtToken: string = '';
  private progressTrackingEnabled: boolean = true;
  private proxyOrigin: string | null = null;
  private detectedEndpoints: Map<string, string> = new Map();
  private serverVersion: string | null = null;

  constructor() {
    // 1. Pull the URL from the environment variable as the "Source of Truth"
    const envUrl = process.env.EXPO_PUBLIC_KAVITA_URL || '';
    
    this.client = axios.create({ 
      baseURL: envUrl, // Set it immediately in the constructor
      timeout: 30000 
    });

    this.client.interceptors.request.use((config) => {
      // ── Proxy Mode ──────────────────────────────────────────────────────────
      // Build the full target URL (including auth) and wrap it in /dynamic-proxy?url=
      // When baseURL is set, Axios prepends it BEFORE the interceptor runs,
      // making config.url an absolute URL. Check for /api/ in both cases.
      const url = config.url || '';
      const isApiPath = url.startsWith('/api/') || url.includes('/api/');
      const shouldProxy = this.proxyOrigin && isApiPath && !isProxied(url);
      if (shouldProxy) {
        // Ensure we use the RAW server URL as the base for the proxy target.
        let rawTargetBase = this.serverUrl;
        const extractedTarget = extractTargetUrl(rawTargetBase);
        if (extractedTarget) {
          rawTargetBase = extractedTarget;
        } else if (rawTargetBase.includes(PROXY_PATH)) {
          // Fallback for edge cases
          const parts = rawTargetBase.split(PROXY_PATH);
          rawTargetBase = decodeURIComponent(parts[parts.length - 1]);
        }
        rawTargetBase = rawTargetBase.replace(/\/$/, '');

        // Split any existing params out of config.url (avoids double-? bug)
        const [cleanPath, existingSearch] = config.url!.split('?');
        const merged = new URLSearchParams(existingSearch || '');

        // Merge config.params first
        if (config.params) {
          Object.entries(config.params).forEach(([k, v]) => merged.set(k, String(v)));
        }
        // Kavita authenticates via Authorization header (forwarded by proxy).
        // For the /authenticate endpoint specifically, we need apiKey as a param.
        if (!this.jwtToken && this.apiKey) {
          merged.set('apiKey', this.apiKey);
          merged.set('pluginName', 'Folio');
        }

        const qs = merged.toString();
        const fullTarget = qs ? `${rawTargetBase}${cleanPath}?${qs}` : `${rawTargetBase}${cleanPath}`;

        if (__DEV__) {
          console.log(`[Kavita Proxy] ${config.method?.toUpperCase()} ${fullTarget}`);
        }

        config.url = this.proxyOrigin + encodeURIComponent(fullTarget);
        config.baseURL = '';
        config.params = undefined;
        if (this.jwtToken) {
          // Ensure headers object exists before setting Authorization
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${this.jwtToken}`;
          console.log(`[Kavita Proxy] Added JWT auth header: Bearer ${this.jwtToken.substring(0, 20)}...`);
        } else if (this.apiKey) {
          console.log('[Kavita Proxy] No JWT, using API key as param');
        } else {
          console.warn('[Kavita Proxy] No JWT or API key - request may fail');
        }
        return config;
      }

      // ── Direct Mode ─────────────────────────────────────────────────────────
      if (__DEV__) {
        console.log(`Kavita Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
      }

      if (this.jwtToken) {
        config.headers.Authorization = `Bearer ${this.jwtToken}`;
      } else if (this.apiKey && config.url) {
        // Add API key as query parameter when JWT is not available
        const separator = config.url.includes('?') ? '&' : '?';
        config.url = `${config.url}${separator}apiKey=${encodeURIComponent(this.apiKey)}`;
      }
      return config;
    });
  } // end constructor

  setProxy(origin: string | null) {
    this.proxyOrigin = origin;
  }

  getProxyOrigin(): string | null {
    return this.proxyOrigin;
  }

  async initialize() {
    try {
      const storedUrl = await credentials.kavita.getServerUrl();
      const storedKey = await credentials.kavita.getApiKey();
      const storedUsername = await credentials.kavita.getUsername();
      const storedPassword = await credentials.kavita.getPassword();
      this.progressTrackingEnabled = await credentials.kavita.isProgressTrackingEnabled();

      console.log('[KavitaAPI] Initialize - URL:', storedUrl ? 'set' : 'missing', 'User:', storedUsername ? 'set' : 'missing');

      if (storedUrl) {
        this.setServer(storedUrl, storedKey || '');

        // Load username/password for JWT auth
        if (storedUsername) this.username = storedUsername;
        if (storedPassword) this.password = storedPassword;

        // Try to load JWT token (profile-specific)
        const storedJwt = await credentials.kavita.getJwtToken();
        console.log('[KavitaAPI] Initialize - JWT:', storedJwt ? `present (${storedJwt.substring(0, 20)}...)` : 'missing');
        if (storedJwt) {
          this.jwtToken = storedJwt;
          this.client.defaults.headers.common['Authorization'] = `Bearer ${this.jwtToken}`;
        }
      }
    } catch (e) {
      console.error('Failed to initialize KavitaAPI', e);
    }
  }

  async setProgressTrackingEnabled(enabled: boolean): Promise<void> {
    this.progressTrackingEnabled = enabled;
    await credentials.kavita.setProgressTracking(enabled);
  }

  // ── Version & Endpoint Detection ─────────────────────────────────────────────

  async detectServerVersion(): Promise<void> {
    if (this.serverVersion) {
      console.log('[KavitaAPI] Server version already detected:', this.serverVersion);
      return;
    }

    try {
      // Try to get version from headers on a simple endpoint
      const response = await this.client.get('/api/Account');
      const version = response.headers['x-kavita-version'] ||
                      response.headers['x-version'] ||
                      response.headers['server'];
      if (version) {
        this.serverVersion = version;
        console.log('[KavitaAPI] Detected server version from headers:', version);
      }
    } catch (e) {
      console.log('[KavitaAPI] Could not detect version from headers, will use endpoint detection');
    }
  }

  async getEndpointForType(type: 'libraries' | 'series' | 'seriesByLibrary'): Promise<string> {
    const cacheKey = `${this.serverUrl}:${type}`;
    if (this.detectedEndpoints.has(cacheKey)) {
      console.log(`[KavitaAPI] Using cached endpoint for ${type}:`, this.detectedEndpoints.get(cacheKey));
      return this.detectedEndpoints.get(cacheKey)!;
    }

    const endpoints: readonly string[] = type === 'libraries'
      ? KAVITA_ENDPOINTS.libraries
      : type === 'series'
      ? KAVITA_ENDPOINTS.series.all
      : KAVITA_ENDPOINTS.series.byLibrary;

    // Try endpoints and cache the working one
    for (const endpoint of endpoints) {
      try {
        if (type === 'libraries') {
          const response = await this.client.get(endpoint);
          // Treat 204 (No Content) as failure - endpoint not working
          if (response.status === 204) {
            console.log(`[KavitaAPI] Endpoint ${endpoint} returned 204 (No Content) for ${type}`);
            continue;
          }
          if (Array.isArray(response.data) && response.data.length > 0) {
            this.detectedEndpoints.set(cacheKey, endpoint);
            console.log(`[KavitaAPI] Detected working endpoint for ${type}:`, endpoint);
            return endpoint;
          }
        } else {
          // For series endpoints, we need to make a POST request
          const response = await this.client.post(endpoint, {
            libraries: [0], // Dummy library ID for testing
            pageNumber: 0,
            pageSize: 1,
          });
          // Treat 204 (No Content) as failure - endpoint not working
          if (response.status === 204) {
            console.log(`[KavitaAPI] Endpoint ${endpoint} returned 204 (No Content) for ${type}`);
            continue;
          }
          if (Array.isArray(response.data)) {
            this.detectedEndpoints.set(cacheKey, endpoint);
            console.log(`[KavitaAPI] Detected working endpoint for ${type}:`, endpoint);
            return endpoint;
          }
        }
      } catch (e: any) {
        console.log(`[KavitaAPI] Endpoint ${endpoint} failed for ${type}:`, e.response?.status);
        continue;
      }
    }

    // If no endpoint returned data, don't cache anything
    // This allows the fallback logic in getLibraries to work properly
    console.log(`[KavitaAPI] No working endpoint found for ${type}, will try fallback`);
    return endpoints[0];
  }

  private setServer(url: string, key: string) {
    let clean = url.trim().replace(/\/$/, '');
    
    // If the URL is already a proxy URL, extract the inner target
    const extractedTarget = extractTargetUrl(clean);
    if (extractedTarget) {
      clean = extractedTarget.replace(/\/$/, '');
    }

    if (!/^https?:\/\//i.test(clean)) clean = 'http://' + clean;
    
    this.serverUrl = clean;
    this.apiKey = key;
    this.client.defaults.baseURL = clean;
  }

  async saveCredentials(serverUrl: string, username: string, password: string, apiKey?: string) {
    this.setServer(serverUrl, apiKey || '');
    this.username = username;
    this.password = password;
    await credentials.kavita.setServerUrl(this.serverUrl);
    await credentials.kavita.setUsername(username);
    await credentials.kavita.setPassword(password);
    if (apiKey) {
      await credentials.kavita.setApiKey(apiKey);
    }
  }

  async loadCredentials() {
    const storedUrl = await credentials.kavita.getServerUrl();
    const storedKey = await credentials.kavita.getApiKey();

    if (storedUrl && storedKey) {
      this.setServer(storedUrl, storedKey);
    }
  }

  async clearCredentials() {
    this.serverUrl = '';
    this.apiKey = '';
    this.username = '';
    this.password = '';
    this.client.defaults.baseURL = '';
    await credentials.kavita.clearAll();
  }

  async login(): Promise<boolean> {
    try {
      // New Kavita versions use JWT authentication via Account/login
      const response = await this.client.post('/api/Account/login', {
        username: this.username,
        password: this.password,
      });

      if (response.data?.token) {
        this.jwtToken = response.data.token;

        // CRITICAL: Set the default header so future requests aren't 401
        this.client.defaults.headers.common['Authorization'] = `Bearer ${this.jwtToken}`;

        await credentials.kavita.setJwtToken(this.jwtToken);
        console.log('[KavitaAPI] JWT login successful');
        return true;
      }
      return false;
    } catch (error: any) {
      const status = error?.response?.status;
      const message = error?.response?.data || error?.message;
      console.error('[KavitaAPI] Login error:', status, message);

      // 404 might mean old Kavita version - try deprecated Plugin API
      if (status === 404 && this.apiKey) {
        console.log('[KavitaAPI] Falling back to deprecated Plugin API...');
        try {
          const response = await this.client.get('/api/Plugin/authenticate', {
            params: {
              apiKey: this.apiKey,
              pluginName: 'Folio'
            },
          });
          if (response.data?.token) {
            this.jwtToken = response.data.token;
            this.client.defaults.headers.common['Authorization'] = `Bearer ${this.jwtToken}`;
            await credentials.kavita.setJwtToken(this.jwtToken);
            return true;
          }
        } catch (pluginError: any) {
          console.error('[KavitaAPI] Plugin API also failed:', pluginError?.response?.status);
          return false;
        }
      }

      return false;
    }
  }

  async logout() {
    this.jwtToken = '';
    this.apiKey = '';
    this.username = '';
    this.password = '';
    this.serverUrl = '';
    await credentials.kavita.clearJwtToken();
    await credentials.kavita.clearAll();
  }

  isAuthenticated(): boolean { return !!this.jwtToken; }

  hasCredentials(): boolean {
    // New JWT auth requires username/password; fallback to API key for older versions
    if (this.proxyOrigin) return !!this.username && !!this.password;
    return !!this.serverUrl && !!this.username && !!this.password;
  }

  isProgressTrackingEnabled(): boolean {
    return this.progressTrackingEnabled;
  }

  getServerUrl(): string { return this.serverUrl; }
  getToken(): string { return this.jwtToken; }
  getApiKey(): string { return this.apiKey; }
  getUsername(): string { return this.username; }
  getPassword(): string { return this.password; }

  // ── Libraries ───────────────────────────────────────────────────────────────

  async getLibraries(): Promise<Library[]> {
    console.log('[KavitaAPI] getLibraries() called. JWT:', !!this.jwtToken, 'APIKey:', !!this.apiKey);

    // Try to detect server version first
    await this.detectServerVersion();

    // Try all library endpoints directly (bypassing endpoint detection for libraries)
    // This ensures we don't get stuck with a cached non-working endpoint
    for (const endpoint of KAVITA_ENDPOINTS.libraries) {
      try {
        console.log(`[KavitaAPI] Trying ${endpoint}...`);
        const response = await this.client.get(endpoint);
        console.log(`[KavitaAPI] ${endpoint} response:`, response.status,
          Array.isArray(response.data) ? `${response.data.length} items` : typeof response.data);

        // Treat 204 as failure
        if (response.status === 204) {
          console.log(`[KavitaAPI] ${endpoint} returned 204 (No Content)`);
          continue;
        }

        if (Array.isArray(response.data) && response.data.length > 0) {
          console.log('[KavitaAPI] Returning libraries:', response.data.length);
          return response.data;
        }
      } catch (error: any) {
        console.warn(`[KavitaAPI] ${endpoint} failed:`, error.response?.status, error.message);
      }
    }

    // Fallback 1: discover libraries from on-deck series
    const libraryMap = new Map<number, Library>();
    try {
      console.log(`[KavitaAPI] Trying fallback ${KAVITA_ENDPOINTS.onDeck}...`);
      const response = await this.client.post(KAVITA_ENDPOINTS.onDeck, {
        pageNumber: 1,
        pageSize: 100,
        libraryId: 0
      });
      console.log(`[KavitaAPI] ${KAVITA_ENDPOINTS.onDeck} response:`, response.status,
        Array.isArray(response.data) ? `${response.data.length} items` : typeof response.data);

      if (Array.isArray(response.data) && response.data.length > 0) {
        response.data.forEach((series: any) => {
          if (series.libraryId && !libraryMap.has(series.libraryId)) {
            libraryMap.set(series.libraryId, {
              id: series.libraryId,
              name: series.libraryName || `Library ${series.libraryId}`,
              type: typeof series.libraryType === 'number' ? series.libraryType : 0,
              series: 0
            });
          }
        });
        console.log('[KavitaAPI] Extracted libraries from on-deck:', libraryMap.size);
      }
    } catch (error: any) {
      console.warn(`[KavitaAPI] ${KAVITA_ENDPOINTS.onDeck} failed:`, error.response?.status, error.message);
    }

    // Fallback 2: try common library IDs (1, 2, 3) to discover additional libraries
    console.log('[KavitaAPI] Trying fallback: probing common library IDs...');
    const commonLibraryIds = [1, 2, 3, 4, 5];

    for (const libId of commonLibraryIds) {
      try {
        // Try to fetch series from this library ID to see if it exists
        for (const endpoint of KAVITA_ENDPOINTS.series.byLibrary) {
          try {
            const response = await this.client.post(endpoint, {
              libraryId: libId,
              pageNumber: 0,
              pageSize: 1, // Only need 1 series to confirm library exists
            });
            if (Array.isArray(response.data) && response.data.length > 0) {
              const series = response.data[0];
              if (series.libraryId && !libraryMap.has(series.libraryId)) {
                libraryMap.set(series.libraryId, {
                  id: series.libraryId,
                  name: series.libraryName || `Library ${series.libraryId}`,
                  type: typeof series.libraryType === 'number' ? series.libraryType : 0,
                  series: 0
                });
                console.log(`[KavitaAPI] Discovered library ${series.libraryId}: ${series.libraryName || 'Unknown'}`);
              }
              break; // Found this library, move to next ID
            }
          } catch (error: any) {
            // Library might not exist, try next endpoint
            continue;
          }
        }
      } catch (error: any) {
        // Library doesn't exist, continue
        continue;
      }
    }

    const discoveredLibraries = Array.from(libraryMap.values());
    if (discoveredLibraries.length > 0) {
      console.log('[KavitaAPI] Discovered libraries from ID probing:', discoveredLibraries.length);
      return discoveredLibraries;
    }

    console.warn('[KavitaAPI] All library endpoints failed');
    return [];
  }

  // ── Series ──────────────────────────────────────────────────────────────────

  async getSeriesForLibrary(libraryId: number, page = 0, pageSize = 30): Promise<Series[]> {
    console.log(`[KavitaAPI] getSeriesForLibrary(${libraryId}) called`);

    // Use endpoint detection to find the working endpoint
    const endpoint = await this.getEndpointForType('seriesByLibrary');

    try {
      console.log(`[KavitaAPI] Using detected endpoint: ${endpoint}`);
      const response = await this.client.post(endpoint, {
        libraryId,
        pageNumber: page,
        pageSize,
      });
      console.log(`[KavitaAPI] ${endpoint} response:`, response.status,
        Array.isArray(response.data) ? `${response.data.length} series` : typeof response.data);
      if (Array.isArray(response.data)) {
        return response.data;
      }
    } catch (error: any) {
      console.warn(`[KavitaAPI] Detected endpoint ${endpoint} failed:`, error.response?.status, error.message);
    }

    console.error(`[KavitaAPI] All series endpoints failed for library ${libraryId}`);
    return [];
  }

  async getAllSeries(page = 0, pageSize = 30): Promise<Series[]> {
    // Kavita API requires a library context for /api/Series/all
    // So we first get all libraries, then fetch series from each
    console.log('[KavitaAPI] getAllSeries() called. JWT:', !!this.jwtToken, 'APIKey:', !!this.apiKey);
    try {
      const libraries = await this.getLibraries();
      console.log('[KavitaAPI] getLibraries returned:', libraries ? `${libraries.length} libraries` : 'null');
      if (!libraries || libraries.length === 0) {
        console.warn('[KavitaAPI] No libraries found - cannot fetch series');
        return [];
      }

      const libraryIds = libraries.map(l => l.id);
      console.log(`[KavitaAPI] Fetching series from ${libraryIds.length} libraries:`, libraryIds);

      // Use endpoint detection to find the working endpoint
      const endpoint = await this.getEndpointForType('series');

      try {
        console.log(`[KavitaAPI] Using detected endpoint: ${endpoint}`);
        const response = await this.client.post(endpoint, {
          libraries: libraryIds,
          pageNumber: page,
          pageSize,
        });
        console.log(`[KavitaAPI] ${endpoint} response:`, response.status,
          Array.isArray(response.data) ? `${response.data.length} series` : typeof response.data);
        if (Array.isArray(response.data)) {
          return response.data;
        }
      } catch (error: any) {
        console.warn(`[KavitaAPI] Detected endpoint ${endpoint} failed:`, error.response?.status, error.message);
      }

      // Fallback: fetch series for each library individually
      console.log('[KavitaAPI] Falling back to per-library series fetching...');
      const allSeries: Series[] = [];
      for (const library of libraries) {
        // Use endpoint detection for byLibrary endpoints
        const byLibraryEndpoint = await this.getEndpointForType('seriesByLibrary');
        try {
          console.log(`[KavitaAPI] Fetching series for library ${library.id} from ${byLibraryEndpoint}...`);
          const response = await this.client.post(byLibraryEndpoint, {
            libraryId: library.id,
            pageNumber: page,
            pageSize,
          });
          if (Array.isArray(response.data)) {
            console.log(`[KavitaAPI] Library ${library.id} (${byLibraryEndpoint}): ${response.data.length} series`);
            allSeries.push(...response.data);
          }
        } catch (error: any) {
          console.warn(`[KavitaAPI] Library ${library.id} ${byLibraryEndpoint} failed:`, error.response?.status);
        }
      }

      if (allSeries.length > 0) {
        console.log('[KavitaAPI] Total series from all libraries:', allSeries.length);
        return allSeries;
      }

      console.error('[KavitaAPI] All series fetching methods failed');
      return [];
    } catch (error: any) {
      console.error('[KavitaAPI] getAllSeries failed:', error.response?.status, error.message);
      return [];
    }
  }

  async updateSeries(series: Partial<Series> & { id: number; [key: string]: any }): Promise<void> {
    await this.client.post('/api/Series/update', series);
  }

  async getSeriesDetail(seriesId: number): Promise<SeriesDetail> {
    const [seriesRes, volumesRes] = await Promise.all([
      this.client.get(`/api/Series/${seriesId}`),
      this.client.get(`/api/Series/volumes?seriesId=${seriesId}`),
    ]);
    return { ...seriesRes.data, volumes: volumesRes.data };
  }

  async getChapter(chapterId: number): Promise<Chapter> {
    const response = await this.client.get(`/api/Chapter?chapterId=${chapterId}`);
    return response.data;
  }

  // ── Book (EPUB/PDF) reader ───────────────────────────────────────────────────

  async getBookInfo(chapterId: number, format: number = 1): Promise<KavitaBookInfo> {
    const key = this.apiKey;
    // Format: 0=Unknown, 1=Archive(CBZ), 2=Unknown, 3=Epub, 4=PDF
    // For image-based content (CBZ), use chapterId parameter
    // For PDF/EPUB, they use different endpoints entirely
    const param = format === 1 ? 'chapterId' : 'chapterId'; // Both use chapterId for image endpoint
    const url = `/api/Reader/image?${param}=${chapterId}&pageNum=0&apiKey=${key}`;
    const response = await this.client.get(url);
    return response.data;
  }

  async getBookPage(chapterId: number, page: number): Promise<string> {
    const url = `/api/Book/${chapterId}/book-page?page=${page}&apiKey=${this.apiKey}`;
    const response = await this.client.get(url, { responseType: 'text' });
    return response.data;
  }

  async getBookToc(chapterId: number): Promise<BookTocEntry[]> {
    try {
      const response = await this.client.get(`/api/Book/${chapterId}/chapters`);
      return Array.isArray(response.data) ? response.data : [];
    } catch {
      // Some Kavita versions return 500 on this endpoint
      // Return empty TOC so the reader can still load
      return [];
    }
  }

  async getChapterInfo(chapterId: number): Promise<ChapterInfo> {
    const response = await this.client.get(`/api/Reader/chapter-info?chapterId=${chapterId}`);
    if (__DEV__) {
      console.log(`[KavitaAPI] getChapterInfo() response status: ${response.status}`);
      console.log(`[KavitaAPI] getChapterInfo() response data:`, response.data);
    }
    // Kavita's chapter-info response does not include the chapterId itself — inject it.
    return {
      ...response.data,
      chapterId,
      pages: response.data.pages || response.data.pagesCount || 0,
      lastReadPage: response.data.lastReadPage ?? 0
    };
  }

  // ── Series Metadata ──────────────────────────────────────────────────────────

  async getSeriesMetadata(seriesId: number): Promise<SeriesMetadata | null> {
    try {
      const response = await this.client.get(`/api/Series/metadata?seriesId=${seriesId}`);
      return response.data;
    } catch {
      return null;
    }
  }

  async updateSeriesMetadata(metadata: SeriesMetadata): Promise<void> {
    await this.client.post('/api/Series/metadata', { seriesMetadata: metadata });
  }

  // ── Collections ─────────────────────────────────────────────────────────────

  async getCollections(): Promise<Collection[]> {
    try {
      const response = await this.client.get('/api/Collection');
      return Array.isArray(response.data) ? response.data : [];
    } catch {
      return [];
    }
  }

  async getSeriesForCollection(collectionId: number): Promise<Series[]> {
    const response = await this.client.get('/api/Series/series-by-collection', {
      params: { collectionId },
    });
    return Array.isArray(response.data) ? response.data : [];
  }

  async addSeriesToCollection(collectionId: number, seriesId: number): Promise<void> {
    await this.client.post('/api/Collection/update-for-series', {
      collectionTagId: collectionId,
      collectionTagTitle: '',
      seriesIds: [seriesId],
    });
  }

  async removeSeriesFromCollection(collection: Collection, seriesId: number): Promise<void> {
    await this.client.post('/api/Collection/update-series', {
      tag: collection,
      seriesIdsToRemove: [seriesId],
    });
  }

  // ── Metadata — genres & tags ─────────────────────────────────────────────────

  async getGenres(libraryId?: number): Promise<Genre[]> {
    try {
      const params = libraryId ? { libraryIds: libraryId } : {};
      const response = await this.client.get('/api/Metadata/genres', { params });
      return Array.isArray(response.data) ? response.data : [];
    } catch {
      return [];
    }
  }

  async getTags(libraryId?: number): Promise<Tag[]> {
    try {
      const params = libraryId ? { libraryIds: libraryId } : {};
      const response = await this.client.get('/api/Metadata/tags', { params });
      return Array.isArray(response.data) ? response.data : [];
    } catch {
      return [];
    }
  }

  async removeGenreFromAllSeries(genreId: number, onProgress?: (done: number, total: number) => void): Promise<void> {
    const allSeries = await this.getSeriesByGenre(genreId, 0, 500);
    for (let i = 0; i < allSeries.length; i++) {
      const meta = await this.getSeriesMetadata(allSeries[i].id);
      if (!meta) continue;
      const updated = { ...meta, genres: meta.genres.filter(g => g.id !== genreId) };
      await this.updateSeriesMetadata(updated);
      onProgress?.(i + 1, allSeries.length);
    }
  }

  async removeTagFromAllSeries(tagId: number, onProgress?: (done: number, total: number) => void): Promise<void> {
    const allSeries = await this.getSeriesByTag(tagId, 0, 500);
    for (let i = 0; i < allSeries.length; i++) {
      const meta = await this.getSeriesMetadata(allSeries[i].id);
      if (!meta) continue;
      const updated = { ...meta, tags: meta.tags.filter(t => t.id !== tagId) };
      await this.updateSeriesMetadata(updated);
      onProgress?.(i + 1, allSeries.length);
    }
  }

  async getSeriesByGenre(genreId: number, page = 0, pageSize = 30): Promise<Series[]> {
    const response = await this.client.post('/api/Series/all', {
      genres: [genreId],
      pageNumber: page,
      pageSize,
    });
    return response.data;
  }

  async getSeriesByTag(tagId: number, page = 0, pageSize = 30): Promise<Series[]> {
    const response = await this.client.post('/api/Series/all', {
      tags: [tagId],
      pageNumber: page,
      pageSize,
    });
    return response.data;
  }

  async addGenreToSeries(seriesId: number, genre: { id: number; title: string }): Promise<void> {
    const meta = await this.getSeriesMetadata(seriesId);
    if (!meta) return;
    // Check if genre already exists
    if (meta.genres.some(g => g.id === genre.id || g.title.toLowerCase() === genre.title.toLowerCase())) return;
    const updated = { ...meta, genres: [...meta.genres, genre] };
    await this.updateSeriesMetadata(updated);
  }

  async addTagToSeries(seriesId: number, tag: { id: number; title: string }): Promise<void> {
    const meta = await this.getSeriesMetadata(seriesId);
    if (!meta) return;
    // Check if tag already exists
    if (meta.tags.some(t => t.id === tag.id || t.title.toLowerCase() === tag.title.toLowerCase())) return;
    const updated = { ...meta, tags: [...meta.tags, tag] };
    await this.updateSeriesMetadata(updated);
  }

  // ── Reading progress ─────────────────────────────────────────────────────────

  async getReadingProgress(chapterId: number): Promise<number> {
    try {
      const res = await this.client.get(`/api/Reader/get-progress?chapterId=${chapterId}`);
      return res.data?.pageNum ?? 0;
    } catch {
      return 0;
    }
  }

  async saveReadingProgress(chapter: any, page: number) {
    if (!chapter?.chapterId) return;
    try {
      const payload = {
        libraryId: parseInt(chapter.libraryId, 10),
        seriesId: parseInt(chapter.seriesId, 10),
        volumeId: parseInt(chapter.volumeId, 10),
        chapterId: parseInt(chapter.chapterId, 10),
        pageNum: parseInt(page.toString(), 10),
        isRead: false,
      };
      await this.client.post(`/api/Reader/progress?apiKey=${this.apiKey}`, payload);
    } catch (err: any) {
      console.error('Kavita Progress Sync Failed:', err.response?.status, err.response?.data || err.message);
    }
  }

  // ── File health ──────────────────────────────────────────────────────────────

  async scanLibrary(libraryId: number): Promise<void> {
    await this.client.post(`/api/Library/scan?libraryId=${libraryId}&force=true`);
  }

  async scanAllLibraries(): Promise<void> {
    await this.client.post('/api/Library/scan-all');
  }

  async analyzeFiles(): Promise<void> {
    await this.client.post('/api/Admin/analyze-files');
  }

  // ── Cover upload ─────────────────────────────────────────────────────────────

  async uploadSeriesCover(seriesId: number, base64DataUrl: string): Promise<void> {
    // Log upload details
    const format = base64DataUrl.match(/^data:image\/(\w+);/)?.[1] || 'png';
    const sizeKB = Math.round(base64DataUrl.length / 1024);
    console.log(`[KavitaAPI] Uploading cover for series ${seriesId}: format=${format}, size=${sizeKB}KB`);
    
    // Check series before upload
    let coverBefore: string | undefined;
    try {
      const seriesRes = await this.client.get(`/api/Series/${seriesId}`);
      coverBefore = seriesRes.data?.coverImage;
      console.log(`[KavitaAPI] Series ${seriesId} before upload: coverImage=${coverBefore || 'none'}`);
    } catch (e) {
      console.log(`[KavitaAPI] Could not get series before upload:`, e);
    }
    
    try {
      console.log(`[KavitaAPI] POST /api/Upload/series with JWT: ${this.jwtToken ? 'present' : 'missing'}`);
   
      // When fromBase64 is true, Kavita expects just the base64 data without the data URL prefix
      const base64Data = base64DataUrl.replace(/^data:image\/\w+;base64,/, '');

      // Send as JSON with fromBase64 flag - tells Kavita the URL is base64 data, not a remote URL
      // Based on Kavita source code: UploadFileDto has id, url, and fromBase64 fields
      const response = await this.client.post('/api/Upload/series', { 
        id: seriesId, 
        url: base64Data,
        fromBase64: true 
      });

      console.log(`[KavitaAPI] Cover upload response: ${response.status}`, JSON.stringify(response.data));
      
      // Wait a moment then check series after upload
      await new Promise(r => setTimeout(r, 500));
      
      // Try to trigger a library scan to process the new cover
      try {
        const seriesRes = await this.client.get(`/api/Series/${seriesId}`);
        const libraryId = seriesRes.data?.libraryId;
        if (libraryId) {
          console.log(`[KavitaAPI] Triggering library scan for library ${libraryId}...`);
          await this.scanLibrary(libraryId);
          console.log(`[KavitaAPI] Library scan triggered`);
          
          // Wait for scan to process
          await new Promise(r => setTimeout(r, 2000));
        }
      } catch (scanErr) {
        console.log(`[KavitaAPI] Library scan failed:`, scanErr);
      }

      try {
        const seriesRes = await this.client.get(`/api/Series/${seriesId}`);
        const coverAfter = seriesRes.data?.coverImage;
        console.log(`[KavitaAPI] Series ${seriesId} after upload: coverImage=${coverAfter || 'none'}`);
        
        // If coverImage changed, try to force a metadata refresh
        if (coverBefore !== coverAfter) {
          console.log(`[KavitaAPI] Cover image path changed, triggering series refresh...`);
          try {
            // Try to refresh the series by calling update with minimal data
            await this.client.post('/api/Series/update', { 
              id: seriesId, 
              name: seriesRes.data.name,
              localizedName: seriesRes.data.localizedName || seriesRes.data.name
            });
            console.log(`[KavitaAPI] Series refresh triggered`);
          } catch (refreshErr) {
            console.log(`[KavitaAPI] Series refresh failed:`, refreshErr);
          }
        }
      } catch (e) {
        console.log(`[KavitaAPI] Could not get series after upload:`, e);
      }
    } catch (e: any) {
      console.error(`[KavitaAPI] Cover upload error:`, {
        status: e?.response?.status,
        statusText: e?.response?.statusText,
        data: e?.response?.data,
        message: e?.message,
        url: e?.config?.url,
        hasJwt: !!this.jwtToken
      });
      const kavitaMsg = e?.response?.data?.title ?? e?.response?.data ?? e?.message ?? 'Unknown error';
      throw new Error(`Cover upload failed: ${kavitaMsg}`);
    }
  }

  async uploadSeriesCoverFromUrl(seriesId: number, imageUrl: string): Promise<void> {
    const response = await fetch('/cover-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seriesId, imageUrl, token: this.jwtToken }),
    });
    const json = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
    if (!json.ok && json.status !== 200) {
      const detail = json.body ? `Kavita ${json.status}: ${json.body}` : (json.error ?? `Upload failed (${response.status})`);
      throw new Error(detail);
    }
  }

  // ── Cover image URLs ─────────────────────────────────────────────────────────

  getSeriesCoverUrl(seriesId: number, bustCache?: boolean): string {
    // Image URLs must use apiKey param (JWT can't be passed in URL for img tags)
    const params = this.apiKey ? `&apiKey=${encodeURIComponent(this.apiKey)}` : '';
    const cacheBust = bustCache ? `&t=${Date.now()}` : '';
    return `${this.serverUrl}/api/image/series-cover?seriesId=${seriesId}${params}${cacheBust}`;
  }

  getChapterCoverUrl(chapterId: number): string {
    const params = this.apiKey ? `&apiKey=${encodeURIComponent(this.apiKey)}` : '';
    return `${this.serverUrl}/api/image/chapter-cover?chapterId=${chapterId}${params}`;
  }

  getVolumeCoverUrl(volumeId: number): string {
    const params = this.apiKey ? `&apiKey=${encodeURIComponent(this.apiKey)}` : '';
    return `${this.serverUrl}/api/image/volume-cover?volumeId=${volumeId}${params}`;
  }

  getLibraryCoverUrl(libraryId: number): string {
    const params = this.apiKey ? `&apiKey=${encodeURIComponent(this.apiKey)}` : '';
    return `${this.serverUrl}/api/image/library-cover?libraryId=${libraryId}${params}`;
  }

  getCollectionCoverUrl(collectionId: number): string {
    const params = this.apiKey ? `&apiKey=${encodeURIComponent(this.apiKey)}` : '';
    return `${this.serverUrl}/api/image/collection-cover?collectionTagId=${collectionId}${params}`;
  }

  // ── Reader URLs ──────────────────────────────────────────────────────────────

  getPdfReaderUrl(chapterId: number): string {
    const targetUrl = `${this.serverUrl}/api/Reader/pdf?chapterId=${chapterId}&apiKey=${this.apiKey}`;
    if (this.proxyOrigin) {
      return `${this.proxyOrigin}${encodeURIComponent(targetUrl)}`;
    }
    return targetUrl;
  }

  getEpubReaderUrl(chapterId: number): string {
    const targetUrl = `${this.serverUrl}/api/Reader/epub?chapterId=${chapterId}&apiKey=${this.apiKey}`;
    if (this.proxyOrigin) {
      return `${this.proxyOrigin}${encodeURIComponent(targetUrl)}`;
    }
    return targetUrl;
  }

  getPdfPageImageUrl(chapterId: number, page: number, format: number = 4): string {
    // Format: 0=Unknown, 1=Archive(CBZ), 2=Unknown, 3=Epub, 4=PDF
    // For CBZ (format 1), use chapterId parameter
    // For PDF (format 4), the endpoint might differ, but we use chapterId for consistency
    const param = format === 1 ? 'chapterId' : 'chapterId';
    const targetUrl = `${this.serverUrl}/api/Reader/image?${param}=${chapterId}&pageNum=${page}&apiKey=${this.apiKey}`;
    if (this.proxyOrigin) {
      return `${this.proxyOrigin}${encodeURIComponent(targetUrl)}`;
    }
    return targetUrl;
  }

  // ── Bookmarks ────────────────────────────────────────────────────────────────

  async bookmarkPage(chapterId: number, page: number, seriesId: number, volumeId: number) {
    try {
      await this.client.post('/api/Reader/bookmark', {
        chapterId, pageNum: page, seriesId, volumeId,
      });
    } catch (e) {
      console.error('Failed to bookmark page', e);
    }
  }

  // ── Recently read ────────────────────────────────────────────────────────────

  async getOnDeckSeries(pageNumber = 1, pageSize = 20) {
    try {
      // Notice this is a .post(), not a .get()
      const res = await this.client.post('/api/Series/on-deck', 
        {}, // Empty body (unless you are applying specific library filters)
        {
          params: {
            pageNumber,
            pageSize,
            libraryId: 0 // 0 means "all libraries"
          }
        }
      );
      return res.data; 
    } catch (error) {
      console.error('Failed to fetch On Deck series:', error);
      return [];
    }
  }

  // ── Search ───────────────────────────────────────────────────────────────────

  async search(query: string): Promise<any> {
    try {
      const cleaned = query.replace(/["""''`]/g, '').trim();
      const response = await this.client.get(
        `/api/Search/search?queryString=${encodeURIComponent(cleaned)}`
      );
      return response.data;
    } catch {
      return { series: [], collections: [], readingLists: [] };
    }
  }
}

export const kavitaAPI = new KavitaAPI();
