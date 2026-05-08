import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-web-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { kavitaAPI, ChapterInfo } from '../../services/kavitaAPI';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography, Spacing, Radius, ColorScheme } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { storage } from '../../services/storage';

// Storage keys for reader preferences
const STORAGE_KEY_READING_DIRECTION = 'folio_comic_reading_direction';
const STORAGE_KEY_FIT_MODE = 'folio_comic_fit_mode';

type ReadingDirection = 'ltr' | 'rtl';
type FitMode = 'contain' | 'width' | 'height';

export default function ImageReaderScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const Colors = colors;
  const router = useRouter();
  const params = useLocalSearchParams<{
    chapterId: string;
    title: string;
    seriesId: string;
    volumeId: string;
    libraryId: string;
    format?: string;
  }>();

  const [showHeader, setShowHeader] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [readingDirection, setReadingDirection] = useState<ReadingDirection>('ltr');
  const [fitMode, setFitMode] = useState<FitMode>('contain');
  const webViewRef = useRef<WebView>(null);

  // Load saved preferences
  useEffect(() => {
    storage.getItem(STORAGE_KEY_READING_DIRECTION).then((val) => {
      if (val === 'rtl' || val === 'ltr') setReadingDirection(val);
    });
    storage.getItem(STORAGE_KEY_FIT_MODE).then((val) => {
      if (val === 'contain' || val === 'width' || val === 'height') setFitMode(val);
    });
  }, []);

  // Convert to numbers for the API calls
  const chapterId = Number(params.chapterId);
  const seriesId = Number(params.seriesId);
  const volumeId = Number(params.volumeId);
  const libraryId = Number(params.libraryId);
  const format = Number(params.format || 1); // Default to CBZ (format 1) if not specified

  const [chapterInfo, setChapterInfo] = useState<ChapterInfo | null>(null);

  // Fetch info once to populate the "suitcase" - wait for proxy to be ready
  const proxyOrigin = kavitaAPI.getProxyOrigin();
  useEffect(() => {
    if (!proxyOrigin) {
      console.log('[ImageReader] Waiting for proxy to be ready...');
      return;
    }
    console.log('[ImageReader] Proxy ready, fetching chapter info:', chapterId);
    (async () => {
      try {
        const info = await kavitaAPI.getChapterInfo(chapterId);
        console.log('[ImageReader] Chapter info received:', info);
        setChapterInfo(info);
        if (info) setTotalPages(info.pages);
      } catch (err: any) {
        console.error('[ImageReader] Failed to fetch chapter info:', err?.message || err);
        console.error('[ImageReader] Error details:', err?.response?.status, err?.response?.data);
      }
    })();
  }, [chapterId, proxyOrigin]);

  const token = kavitaAPI.getToken();
  // In proxy mode serverUrl is '' so these become relative URLs, proxied to Kavita
  const serverUrl = kavitaAPI.getServerUrl();
  
  // Helper to build API URL - uses proxy when available
  const buildApiUrl = (path: string, params?: string) => {
    const targetUrl = `${serverUrl}${path}${params ? '?' + params : ''}`;
    console.log('[buildApiUrl] serverUrl:', serverUrl, 'proxyOrigin:', proxyOrigin, 'path:', path);
    if (proxyOrigin) {
      const proxiedUrl = `${proxyOrigin}${encodeURIComponent(targetUrl)}`;
      console.log('[buildApiUrl] Using proxy:', proxiedUrl);
      return proxiedUrl;
    }
    console.log('[buildApiUrl] Using direct URL:', targetUrl);
    return targetUrl;
  };

  // Memoize URL building to prevent rebuilding on every render
  const { chapterInfoUrl, imageBaseUrl, apiKey } = useMemo(() => {
    if (!proxyOrigin || !serverUrl) {
      return { chapterInfoUrl: '', imageBaseUrl: '', apiKey: '' };
    }
    // Include apiKey in both URLs for authentication
    const infoUrl = buildApiUrl('/api/Reader/chapter-info', `chapterId=${chapterId}&apiKey=${kavitaAPI.getApiKey()}`);

    // Select endpoint based on file format
    // Format: 0=Unknown, 1=Archive(CBZ), 2=Unknown, 3=Epub, 4=PDF
    let imagePath: string;
    let imageParam: string;
    if (format === 4) {
      // PDF uses dedicated endpoint
      imagePath = '/api/Reader/pdf';
      imageParam = 'chapterId';
    } else if (format === 3) {
      // EPUB uses dedicated endpoint
      imagePath = '/api/Reader/epub';
      imageParam = 'chapterId';
    } else {
      // CBZ (format 1) and others use image endpoint with chapterId
      imagePath = '/api/Reader/image';
      imageParam = 'chapterId';
    }

    const imgUrl = buildApiUrl(imagePath, `${imageParam}=${chapterId}&apiKey=${kavitaAPI.getApiKey()}`);
    const key = kavitaAPI.getApiKey();
    console.log('[ImageReader] URLs built - format:', format, 'imagePath:', imagePath);
    console.log('[ImageReader] chapterInfoUrl:', infoUrl);
    console.log('[ImageReader] imageBaseUrl (with apiKey):', imgUrl);
    return { chapterInfoUrl: infoUrl, imageBaseUrl: imgUrl, apiKey: key };
  }, [proxyOrigin, serverUrl, chapterId, format]);
  
  // Track render count to diagnose re-render loops
  const renderCountRef = useRef(0);
  renderCountRef.current++;
  if (__DEV__ && renderCountRef.current % 10 === 0) {
    console.log(`[ImageReader] Render count: ${renderCountRef.current}`);
  }

  // Build the HTML template with current settings - memoize to prevent rebuilds
  const imageHtml = useMemo(() => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=4.0, user-scalable=yes">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      background: ${colors.background};
      height: 100%;
      overflow: hidden;
      user-select: none;
      -webkit-user-select: none;
    }
    #viewer {
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    #page-img {
      display: none;
      ${fitMode === 'contain' ? `
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      ` : fitMode === 'width' ? `
      width: 100%;
      height: auto;
      object-fit: contain;
      ` : `
      width: auto;
      height: 100%;
      object-fit: contain;
      `}
    }
    #page-img.fit-contain {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    #page-img.fit-width {
      width: 100%;
      height: auto;
      object-fit: contain;
    }
    #page-img.fit-height {
      width: auto;
      height: 100%;
      object-fit: contain;
    }
    #spinner {
      color: ${colors.accent};
      font-family: sans-serif;
      font-size: 15px;
      text-align: center;
    }
    #error-msg {
      color: ${colors.error};
      font-family: sans-serif;
      font-size: 13px;
      text-align: center;
      padding: 20px;
      display: none;
    }
  </style>
</head>
<body>
  <div id="viewer">
    <span id="spinner">Loading…</span>
    <div id="error-msg"></div>
    <div id="debug-log" style="position: fixed; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.8); color: #0f0; font-family: monospace; font-size: 12px; padding: 10px; max-height: 200px; overflow-y: auto; z-index: 9999;"></div>
    <img id="page-img" />
  </div>
  <script>
    // Global error handler
    window.onerror = function(msg, url, line, col, error) {
      const el = document.getElementById('debug-log');
      if (el) el.innerHTML += 'ERROR: ' + msg + ' at line ' + line + '<br>';
      console.error('[WebView Error]', msg, 'line:', line);
      return false;
    };
    
    // Debug helper - visible on screen
    function debug(msg) {
      console.log('[WebView]', msg);
      const el = document.getElementById('debug-log');
      if (el) el.innerHTML += msg + '<br>';
    }
    
    try {
      debug('SCRIPT STARTING...');
      // These are now hardcoded into the string that the WebView loads
      const TOKEN = '${token}';
      const CHAPTER_ID = ${chapterId};
      const API_KEY = '${kavitaAPI.getApiKey()}';
      const CHAPTER_INFO_URL = '${chapterInfoUrl}';
      const IMAGE_BASE_URL = '${imageBaseUrl}';
      const PRELOADED_CHAPTER_INFO_B64 = '${btoa(JSON.stringify(chapterInfo))}';
      let PRELOADED_CHAPTER_INFO = null;
      try {
        // atob is available in browser WebView environment
        PRELOADED_CHAPTER_INFO = JSON.parse(atob(PRELOADED_CHAPTER_INFO_B64));
      } catch(e) {
        debug('Failed to parse chapter info: ' + e.message);
      }
      
      debug('PRELOADED_CHAPTER_INFO loaded: ' + (PRELOADED_CHAPTER_INFO ? 'yes' : 'no'));
      if (PRELOADED_CHAPTER_INFO) {
        debug('Pages: ' + (PRELOADED_CHAPTER_INFO.pages || PRELOADED_CHAPTER_INFO.pagesCount || 'unknown'));
      }

    async function fetchPage(n) {
      debug('fetchPage(' + n + ') starting');
      if (cache[n]) {
        debug('fetchPage(' + n + ') - returning from cache');
        return cache[n];
      }
      
      // Use proxied URL if available, otherwise construct directly
      const url = IMAGE_BASE_URL + '&pageNum=' + n;
      debug('fetchPage(' + n + ') - URL: ' + url.substring(0, 100) + '...');
      
      try {
        const resp = await fetch(url, { 
          headers: { 'Authorization': 'Bearer ' + TOKEN } 
        });
        debug('fetchPage(' + n + ') - response status: ' + resp.status);
        
        if (!resp.ok) {
          const text = await resp.text();
          debug('fetchPage(' + n + ') - error response: ' + text.substring(0, 200));
          throw new Error('HTTP ' + resp.status);
        }
        const blob = await resp.blob();
        debug('fetchPage(' + n + ') - blob size: ' + blob.size);
        const objUrl = URL.createObjectURL(blob);
        cache[n] = objUrl;
        return objUrl;
      } catch(e) {
        debug('fetchPage(' + n + ') - ERROR: ' + e.message);
        throw e;
      }
    }
    
    let currentPage = 0;
    let totalPages = 0;
    const cache = {};

    function notify(data) {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(data));
    }

    async function showPage(n) {
      debug('showPage(' + n + ') starting - totalPages: ' + totalPages);
      if (n < 0 || n >= totalPages) {
        debug('showPage(' + n + ') - out of bounds, returning');
        return;
      }
      document.getElementById('spinner').style.display = 'block';
      document.getElementById('page-img').style.display = 'none';
      try {
        debug('showPage(' + n + ') - calling fetchPage...');
        const src = await fetchPage(n);
        debug('showPage(' + n + ') - got image URL, setting src...');
        const img = document.getElementById('page-img');
        img.src = src;
        img.style.display = 'block';
        document.getElementById('spinner').style.display = 'none';
        currentPage = n;
        notify({ type: 'page', page: n, total: totalPages });
        // Preload neighbours
        if (n + 1 < totalPages) fetchPage(n + 1).catch(() => {});
        if (n - 1 >= 0) fetchPage(n - 1).catch(() => {});
      } catch(e) {
        debug('showPage(' + n + ') - ERROR: ' + e.message);
        document.getElementById('spinner').style.display = 'none';
        const errEl = document.getElementById('error-msg');
        errEl.textContent = 'Failed to load page: ' + e.message;
        errEl.style.display = 'block';
        notify({ type: 'error', message: e.message });
      }
    }

    async function init() {
      try {
        debug('init() starting');
        let info;
        debug('Checking PRELOADED_CHAPTER_INFO...');
        if (PRELOADED_CHAPTER_INFO && (PRELOADED_CHAPTER_INFO.pages || PRELOADED_CHAPTER_INFO.pagesCount)) {
          debug('Using preloaded chapter info');
          info = PRELOADED_CHAPTER_INFO;
        } else {
          debug('Fetching chapter info from URL...');
          const resp = await fetch(CHAPTER_INFO_URL, { headers: { 'Authorization': 'Bearer ' + TOKEN } });
          debug('Fetch response status: ' + resp.status);
          if (!resp.ok) throw new Error('HTTP ' + resp.status);
          info = await resp.json();
        }
        totalPages = info.pages || info.pagesCount || 0;
        console.log('[WebView] Total pages:', totalPages);
        notify({ type: 'total', total: totalPages });
        await showPage(0);
        notify({ type: 'loaded' });
      } catch(e) {
        console.error('[WebView] init() failed:', e.message);
        document.getElementById('spinner').textContent = 'Error: ' + e.message;
        notify({ type: 'error', message: e.message });
      }
    }

    // Reading direction: 'ltr' (Western comics) or 'rtl' (Manga)
    const READING_DIRECTION = '${readingDirection}';
    const isRTL = READING_DIRECTION === 'rtl';

    // Touch swipe navigation
    let touchStartX = 0, touchStartY = 0;
    document.addEventListener('touchstart', e => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });
    document.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
        // horizontal swipe — respect reading direction
        // RTL (manga): swipe left = next page, swipe right = prev page
        // LTR (western): swipe left = prev page, swipe right = next page
        if (isRTL) {
          if (dx < 0) showPage(currentPage + 1);
          else showPage(currentPage - 1);
        } else {
          if (dx < 0) showPage(currentPage - 1);
          else showPage(currentPage + 1);
        }
      } else if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
        // tap — toggle header
        notify({ type: 'tap' });
      }
    }, { passive: true });

    // Click left/right zone navigation
    document.getElementById('viewer').addEventListener('click', e => {
      const x = e.clientX / window.innerWidth;
      if (isRTL) {
        // RTL: left edge = next, right edge = prev
        if (x < 0.25) showPage(currentPage + 1);
        else if (x > 0.75) showPage(currentPage - 1);
        else notify({ type: 'tap' });
      } else {
        // LTR: left edge = prev, right edge = next
        if (x < 0.25) showPage(currentPage - 1);
        else if (x > 0.75) showPage(currentPage + 1);
        else notify({ type: 'tap' });
      }
    });

    // Exposed to React Native
    window.goNext = () => showPage(currentPage + (isRTL ? 1 : -1));
    window.goPrev = () => showPage(currentPage + (isRTL ? -1 : 1));
    window.goToPage = (n) => showPage(n);
    window.setFitMode = (mode) => {
      const img = document.getElementById('page-img');
      img.className = 'fit-' + mode;
    };

    init();
    } catch(e) {
      debug('Outer error: ' + e.message);
      console.error('[WebView] Outer error:', e.message);
    }
  </script>
</body>
</html>`;
  // Dependencies: only rebuild HTML when these specific values change
  // Using only primitives to avoid reference equality issues causing re-renders
  }, [chapterId, chapterInfo?.pages, readingDirection, fitMode, colors.background]);

  function sendCmd(cmd: string) {
    webViewRef.current?.injectJavaScript(`${cmd}(); true;`);
  }

  function handleMessage(event: any) {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      switch (data.type) {
        case 'loaded':
          setLoading(false);
          break;
        case 'total':
          setTotalPages(data.total);
          break;
        case 'page':
          setCurrentPage(data.page);
          kavitaAPI.saveReadingProgress(
            data.chapterID,
            data.page,
          );
          break;
        case 'tap':
          setShowHeader(v => !v);
          break;
        case 'error':
          setLoading(false);
          break;
      }
    } catch {}
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {showHeader && (
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {params.title || 'Reader'}
          </Text>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setShowSettings(v => !v)}>
            <Ionicons name="settings-outline" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <View style={styles.settingsPanel}>
          <View style={styles.settingsContent}>
            <Text style={styles.settingsTitle}>Reading Settings</Text>

            {/* Reading Direction */}
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Reading Direction</Text>
              <View style={styles.settingButtons}>
                <TouchableOpacity
                  style={[styles.settingBtn, readingDirection === 'ltr' && styles.settingBtnActive]}
                  onPress={() => {
                    setReadingDirection('ltr');
                    storage.setItem(STORAGE_KEY_READING_DIRECTION, 'ltr');
                  }}
                >
                  <Text style={[styles.settingBtnText, readingDirection === 'ltr' && styles.settingBtnTextActive]}>LTR</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.settingBtn, readingDirection === 'rtl' && styles.settingBtnActive]}
                  onPress={() => {
                    setReadingDirection('rtl');
                    storage.setItem(STORAGE_KEY_READING_DIRECTION, 'rtl');
                  }}
                >
                  <Text style={[styles.settingBtnText, readingDirection === 'rtl' && styles.settingBtnTextActive]}>RTL</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Fit Mode */}
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Fit Mode</Text>
              <View style={styles.settingButtons}>
                <TouchableOpacity
                  style={[styles.settingBtn, fitMode === 'contain' && styles.settingBtnActive]}
                  onPress={() => {
                    setFitMode('contain');
                    storage.setItem(STORAGE_KEY_FIT_MODE, 'contain');
                    sendCmd("window.setFitMode('contain')");
                  }}
                >
                  <Text style={[styles.settingBtnText, fitMode === 'contain' && styles.settingBtnTextActive]}>Fit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.settingBtn, fitMode === 'width' && styles.settingBtnActive]}
                  onPress={() => {
                    setFitMode('width');
                    storage.setItem(STORAGE_KEY_FIT_MODE, 'width');
                    sendCmd("window.setFitMode('width')");
                  }}
                >
                  <Text style={[styles.settingBtnText, fitMode === 'width' && styles.settingBtnTextActive]}>Width</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.settingBtn, fitMode === 'height' && styles.settingBtnActive]}
                  onPress={() => {
                    setFitMode('height');
                    storage.setItem(STORAGE_KEY_FIT_MODE, 'height');
                    sendCmd("window.setFitMode('height')");
                  }}
                >
                  <Text style={[styles.settingBtnText, fitMode === 'height' && styles.settingBtnTextActive]}>Height</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.closeSettingsBtn} onPress={() => setShowSettings(false)}>
              <Text style={styles.closeSettingsText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={Colors.accent} size="large" />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      )}

      {(() => {
        // Log WebView render attempt
        console.log('[ImageReader] Rendering WebView - HTML length:', imageHtml?.length || 0);
        console.log('[ImageReader] WebView HTML starts with:', imageHtml?.substring(0, 50));
        return null;
      })()}
      <WebView
        key={`webview-${chapterId}`}
        ref={(ref) => {
          webViewRef.current = ref;
          console.log('[ImageReader] WebView ref set:', !!ref);
        }}
        style={styles.webview}
        source={{ html: imageHtml }}
        javaScriptEnabled
        scrollEnabled={false}
        onMessage={handleMessage}
        mixedContentMode="always"
        originWhitelist={['*']}
        allowFileAccess
        onLoad={() => console.log('[WebView] onLoad fired')}
        onError={(e) => console.error('[WebView] onError:', e.nativeEvent)}
        onLoadStart={() => console.log('[WebView] onLoadStart fired')}
        onLoadEnd={() => console.log('[WebView] onLoadEnd fired')}
        injectedJavaScriptBeforeContentLoaded={`
          console.log('[WebView] HTML document starting to load');
          window.addEventListener('DOMContentLoaded', function() {
            console.log('[WebView] DOMContentLoaded fired');
          });
          window.addEventListener('error', function(e) {
            console.error('[WebView] Window error:', e.message);
          });
        `}
      />

      {showHeader && totalPages > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.navBtn} onPress={() => sendCmd('goPrev')}>
            <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: totalPages > 1 ? `${(currentPage / (totalPages - 1)) * 100}%` : '100%' },
                ]}
              />
            </View>
          </View>
          <TouchableOpacity style={styles.navBtn} onPress={() => sendCmd('goNext')}>
            <Ionicons name="chevron-forward" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const makeStyles = (colors: ColorScheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  webview: { flex: 1 },
  header: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 44,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: colors.textPrimary,
  },
  pageCount: {
    fontSize: Typography.sm,
    color: colors.textSecondary,
    minWidth: 60,
    textAlign: 'right',
  },
  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 30,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: Spacing.sm,
  },
  navBtn: {
    width: 44, height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: Radius.md,
  },
  progressContainer: { flex: 1, alignItems: 'center' },
  progressTrack: {
    width: '100%', height: 3,
    backgroundColor: colors.progressTrack,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.accent },
  loadingOverlay: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    zIndex: 20,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: { fontSize: Typography.base, color: colors.textSecondary },
  // Settings Panel Styles
  settingsPanel: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    zIndex: 30,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  settingsContent: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 360,
    gap: Spacing.lg,
  },
  settingsTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  settingRow: {
    gap: Spacing.sm,
  },
  settingLabel: {
    fontSize: Typography.sm,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: Typography.semibold,
  },
  settingButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  settingBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  settingBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  settingBtnText: {
    fontSize: Typography.sm,
    color: colors.textSecondary,
    fontWeight: Typography.medium,
  },
  settingBtnTextActive: {
    color: colors.textOnAccent,
    fontWeight: Typography.bold,
  },
  closeSettingsBtn: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    backgroundColor: colors.surface,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  closeSettingsText: {
    fontSize: Typography.base,
    color: colors.textPrimary,
    fontWeight: Typography.semibold,
  },
});
