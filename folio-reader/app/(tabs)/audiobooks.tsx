import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
  ActivityIndicator, RefreshControl, DeviceEventEmitter, Platform, ScrollView, useWindowDimensions
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LibraryFactory } from '../../services/LibraryFactory';
import { LibraryItem } from '../../services/LibraryProvider';
import { absAPI } from '../../services/audiobookshelfAPI';
import { useAudioPlayer } from '../../contexts/AudioPlayerContext';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import TabHeader from '../../components/TabHeader';
import { useTheme } from '../../contexts/ThemeContext';
import GenreTagContextMenu, { ChipType } from '../../components/GenreTagContextMenu';
import SeriesContextMenu from '../../components/SeriesContextMenu';
import { useSeriesContextMenu } from '../../hooks/useSeriesContextMenu';
import { ContinueSection, ContinueItem } from '../../components/ContinueSection';
import { AudiobookCard } from '../../components/AudiobookCard';
import { FilterSection } from '../../components/FilterComponents';
import { useGridColumns } from '../../hooks/useGridColumns';

interface FilterItem {
  id: string;
  title: string;
}

function formatDuration(seconds: number): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function AudiobooksScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { nowPlaying, isPlaying, play, togglePlayPause } = useAudioPlayer();
  const { numColumns, cardWidth } = useGridColumns();
  const { ctx: ctxMenu, openMenu, closeMenu, openDetail } = useSeriesContextMenu();

  const [connected, setConnected] = useState(true);
  const [libraries, setLibraries] = useState<any[]>([]);
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [allItems, setAllItems] = useState<LibraryItem[]>([]); // For filtering
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Filter states
  const [genres, setGenres] = useState<FilterItem[]>([]);
  const [authors, setAuthors] = useState<FilterItem[]>([]);
  const [tags, setTags] = useState<FilterItem[]>([]);
  const [collections, setCollections] = useState<FilterItem[]>([]);
  const [selectedGenreId, setSelectedGenreId] = useState<string | null>(null);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [collectionItems, setCollectionItems] = useState<Set<string>>(new Set());
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState<'library' | 'genre' | 'author' | 'tag' | 'collection'>('library');
  const [showContinueListening, setShowContinueListening] = useState(true);
  const [continueSectionMinimized, setContinueSectionMinimized] = useState(false);

  // Chip context menu state
  const [chipMenu, setChipMenu] = useState<{
    visible: boolean;
    itemId: string | null;
    itemTitle: string;
    itemType: ChipType | null;
    position: { x: number; y: number };
  }>({ visible: false, itemId: null, itemTitle: '', itemType: null, position: { x: 0, y: 0 } });

  function openChipMenu(item: FilterItem, type: ChipType, x: number, y: number) {
    setChipMenu({ visible: true, itemId: item.id, itemTitle: item.title, itemType: type, position: { x, y } });
  }

  function closeChipMenu() {
    setChipMenu(prev => ({ ...prev, visible: false }));
  }

  // Extract unique genres, authors, and tags from items
  const extractFilters = useCallback((items: LibraryItem[]) => {
    const genreMap = new Map<string, string>();
    const authorMap = new Map<string, string>();
    const tagMap = new Map<string, string>();
    
    items.forEach(item => {
      // Extract genres from metadata
      const itemGenres = (item as any).media?.metadata?.genres || [];
      itemGenres.forEach((g: string) => {
        if (g && !genreMap.has(g)) {
          genreMap.set(g, g);
        }
      });
      
      // Extract tags from metadata
      const itemTags = (item as any).media?.metadata?.tags || [];
      itemTags.forEach((t: string) => {
        if (t && !tagMap.has(t)) {
          tagMap.set(t, t);
        }
      });
      
      // Extract author
      const author = item.author || (item as any).media?.metadata?.author;
      if (author && !authorMap.has(author)) {
        authorMap.set(author, author);
      }
    });
    
    const genreItems: FilterItem[] = Array.from(genreMap.entries())
      .map(([id, title]) => ({ id, title }))
      .sort((a, b) => a.title.localeCompare(b.title));
    
    const authorItems: FilterItem[] = Array.from(authorMap.entries())
      .map(([id, title]) => ({ id, title }))
      .sort((a, b) => a.title.localeCompare(b.title));
    
    const tagItems: FilterItem[] = Array.from(tagMap.entries())
      .map(([id, title]) => ({ id, title }))
      .sort((a, b) => a.title.localeCompare(b.title));
    
    setGenres(genreItems);
    setAuthors(authorItems);
    setTags(tagItems);
  }, [])

  // Fetch collections from ABS
  const fetchCollections = useCallback(async () => {
    try {
      const absCollections = await absAPI.getCollections();
      const collectionItems: FilterItem[] = absCollections
        .map((c: any) => ({ id: c.id, title: c.name || c.title }))
        .sort((a: FilterItem, b: FilterItem) => a.title.localeCompare(b.title));
      setCollections(collectionItems);
    } catch {
      // Failed to fetch collections
    }
  }, []);

  // Fetch items in selected collection
  const fetchCollectionItems = useCallback(async (collectionId: string) => {
    try {
      const collection = await absAPI.getCollection(collectionId);
      const itemIds = new Set<string>();
      // ABS returns items in .books or .items property
      const items = collection.books || collection.items || [];
      items.forEach((item: any) => {
        const id = item.id || item.libraryItemId;
        if (id) itemIds.add(String(id));
      });
      setCollectionItems(itemIds);
    } catch {
      setCollectionItems(new Set());
    }
  }, []);

  // Filter items based on selected filters
  const filterItems = useCallback((allItems: LibraryItem[]) => {
    let filtered = allItems;
    
    if (selectedCollectionId) {
      // When collection is selected, only show items in that collection
      filtered = filtered.filter(item => collectionItems.has(String(item.id)));
    }
    
    if (selectedGenreId) {
      filtered = filtered.filter(item => {
        const itemGenres = (item as any).media?.metadata?.genres || [];
        return itemGenres.includes(selectedGenreId);
      });
    }
    
    if (selectedTagId) {
      filtered = filtered.filter(item => {
        const itemTags = (item as any).media?.metadata?.tags || [];
        return itemTags.includes(selectedTagId);
      });
    }
    
    if (selectedAuthorId) {
      filtered = filtered.filter(item => {
        const author = item.author || (item as any).media?.metadata?.author;
        return author === selectedAuthorId;
      });
    }
    
    return filtered;
  }, [selectedGenreId, selectedAuthorId, selectedTagId, selectedCollectionId, collectionItems]);

  const fetchItems = useCallback(async (libraryId: string, pageNum: number, reset: boolean) => {
    try {
      const provider = LibraryFactory.getProvider('abs');
      const data = await provider.getLibraryItems({ libraryId, page: pageNum, limit: 40 });
      
      if (reset) {
        setAllItems(data);
        setItems(filterItems(data));
        extractFilters(data);
      } else {
        // Use functional update to avoid dependency on allItems
        setAllItems(prev => {
          const newAllItems = [...prev, ...data];
          // Apply filters after state update
          setItems(filterItems(newAllItems));
          extractFilters(newAllItems);
          return newAllItems;
        });
      }
      setPage(pageNum);
      setHasMore(data.length === 40);
    } catch (e: any) {
      // Failed to fetch audiobook items
      const isNetworkError = !e.response && (e.code === 'ECONNABORTED' || e.message?.includes('Network Error') || e.message?.includes('timeout'));
      if (isNetworkError) {
        setNetworkError('Server unreachable. Check your connection or ABS server URL in Settings.');
      }
    } finally {
      setLoadingMore(false);
      setRefreshing(false);
      setLoading(false);
    }
  }, [extractFilters, filterItems]);

  const initialize = useCallback(async () => {
    setLoading(true);
    const provider = LibraryFactory.getProvider('abs');
    await provider.initialize();

    const isAuth = await provider.isAuthenticated();
    if (!isAuth) {
      setConnected(false);
      setLoading(false);
      return;
    }

    setConnected(true);
    try {
      // Libraries are still ABS specific for this tab's picker
      const { absAPI } = await import('../../services/audiobookshelfAPI');
      const libs = await absAPI.getLibraries();
      setLibraries(libs);

      const currentLib = selectedLibraryId && libs.some(l => l.id === selectedLibraryId)
        ? selectedLibraryId
        : libs[0]?.id ?? null;

      if (currentLib && currentLib !== selectedLibraryId) {
        setSelectedLibraryId(currentLib);
      }
      if (currentLib) {
        await fetchItems(currentLib, 0, true);
        // Fetch collections for the filter row
        fetchCollections();
      } else {
        setLoading(false);
      }
      setIsInitialized(true);
    } catch (err: any) {
      // Initialization error
      const isNetworkError = !err.response && (err.code === 'ECONNABORTED' || err.message?.includes('Network Error') || err.message?.includes('timeout'));
      if (isNetworkError) {
        setNetworkError('Server unreachable. Check your connection or ABS server URL in Settings.');
      }
      setConnected(false);
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Initial load on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  useFocusEffect(
    useCallback(() => {
      // Only refresh metadata on focus, don't reload everything
      setShowContinueListening(absAPI.isProgressTrackingEnabled());
    }, [isInitialized])
  );

  // Refresh when playback is stopped (to sync progress bars)
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('FOLIO_PLAYBACK_STOPPED', () => {
      if (selectedLibraryId) {
        fetchItems(selectedLibraryId, 0, true);
      }
    });
    return () => sub.remove();
  }, [selectedLibraryId, fetchItems]);

  function onRefresh() {
    setNetworkError(null);
    if (selectedLibraryId) {
      setRefreshing(true);
      fetchItems(selectedLibraryId, 0, true);
    }
  }

  function loadMore() {
    if (!hasMore || loadingMore || !selectedLibraryId) return;
    setLoadingMore(true);
    fetchItems(selectedLibraryId, page + 1, false);
  }

  async function selectLibrary(idRaw: string | number | null) {
    const id = idRaw === null ? 'null' : String(idRaw);
    if (id === selectedLibraryId) return;
    setSelectedLibraryId(id);
    setLoading(true);
    setItems([]);
    setAllItems([]);
    setSelectedGenreId(null);
    setSelectedAuthorId(null);
    await fetchItems(id, 0, true);
  }

  // Apply filters when selection changes
  useEffect(() => {
    if (allItems.length > 0) {
      setItems(filterItems(allItems));
    }
  }, [selectedGenreId, selectedAuthorId, selectedTagId, selectedCollectionId, collectionItems, allItems, filterItems]);

  // Fetch collection items when collection selection changes
  useEffect(() => {
    if (selectedCollectionId) {
      fetchCollectionItems(selectedCollectionId);
    } else {
      setCollectionItems(new Set());
    }
  }, [selectedCollectionId, fetchCollectionItems]);

  // Continue listening: items with progress > 0 and < 100%
  const continueListening = useMemo(() => {
    const withProgress = allItems.filter(item => item.progress && item.progress > 0 && item.progress < 1)
      .sort((a, b) => (b.progress || 0) - (a.progress || 0))
      .slice(0, 10);
    console.log('[ContinueListening] Total items:', allItems.length, 'With progress:', withProgress.length, 'Sample progress values:', allItems.slice(0, 3).map(i => ({ title: i.title?.substring(0, 20), progress: i.progress })));
    return withProgress;
  }, [allItems]);

  // Show continue listening section if there are items with progress
  const shouldShowContinueListening = continueListening.length > 0;

  async function handlePlay(item: LibraryItem) {
    if (nowPlaying?.item.id === item.id) {
      await togglePlayPause();
    } else {
      // We need the full ABS item for the play context if possible, 
      // or the player should handle LibraryItem.
      // Currently play(item) expects ABSLibraryItem.
      // Let's check AudioPlayerContext.
      const { absAPI } = await import('../../services/audiobookshelfAPI');
      const fullItem = await absAPI.getLibraryItem(String(item.id));
      await play(fullItem);
    }
  }

  if (!connected && !loading) {
    return (
      <View style={[styles.notConfigured, { backgroundColor: colors.background }]}>
        <Ionicons name="headset-outline" size={64} color={colors.border} />
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Audiobookshelf not configured</Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Add your server URL and API key in Settings → Audiobookshelf.</Text>
        <TouchableOpacity
          style={[styles.settingsBtn, { backgroundColor: colors.accent }]}
          onPress={() => router.push('/(tabs)/settings')}
        >
          <Text style={[styles.settingsBtnText, { color: colors.textOnAccent }]}>Go to Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, {
      zIndex: 1,
      backgroundColor: Platform.OS === 'web' ? colors.overlay : colors.background,
    } as any]}>
      <TabHeader 
        title="Audiobooks" 
        count={items.length} 
        countLabel="items" 
        hasMore={hasMore} 
        serverName="Audiobookshelf" 
      />

      {networkError && items.length === 0 ? (
        <View style={[styles.centered, { padding: Spacing.xl }]}>
          <Ionicons name="cloud-offline-outline" size={64} color={colors.textMuted} />
          <Text style={{ color: colors.textSecondary, marginTop: Spacing.md, textAlign: 'center' }}>
            {networkError}
          </Text>
          <TouchableOpacity
            style={{
              marginTop: Spacing.lg,
              backgroundColor: colors.accent,
              paddingHorizontal: Spacing.xl,
              paddingVertical: Spacing.base,
              borderRadius: Radius.md,
            }}
            onPress={onRefresh}
          >
            <Text style={{ color: colors.background, fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : (
        <>
          {/* Filter Section - Outside margin container for full width */}
          <FilterSection
            libraries={libraries}
            genres={genres}
            authors={authors}
            tags={tags}
            collections={collections}
            selectedLibraryId={selectedLibraryId}
            selectedGenreId={selectedGenreId}
            selectedAuthorId={selectedAuthorId}
            selectedTagId={selectedTagId}
            selectedCollectionId={selectedCollectionId}
            onSelectLibrary={selectLibrary}
            onSelectGenre={(id) => setSelectedGenreId(id as string | null)}
            onSelectAuthor={(id) => setSelectedAuthorId(id as string | null)}
            onSelectTag={(id) => setSelectedTagId(id as string | null)}
            onSelectCollection={(id) => setSelectedCollectionId(id as string | null)}
            defaultTab="library"
            onClearAll={() => { selectLibrary(null); setSelectedGenreId(null); setSelectedAuthorId(null); setSelectedTagId(null); setSelectedCollectionId(null); }}
          />

      {/* Continue Listening Section - outside scroll area */}
      {shouldShowContinueListening && (
        <View style={{ marginHorizontal: Spacing.base }}>
          <ContinueSection
            title="Continue Listening"
            minimized={continueSectionMinimized}
            items={continueListening.map((item): ContinueItem => ({
              id: item.id,
              title: item.title,
              subtitle: item.author,
              coverUrl: (LibraryFactory.getProvider('abs') as any).getCoverUrl?.(item.id) || '',
              progress: item.progress ? item.progress * 100 : 0,
            }))}
            onPressItem={(item) => router.push(`/audiobook/${item.id}`)}
          />
        </View>
      )}

        <View style={{ flex: 1, marginHorizontal: Spacing.base }}>
          <FlatList
            key={numColumns}
            data={items}
            keyExtractor={i => String(i.id)}
            numColumns={numColumns}
            contentContainerStyle={{ paddingBottom: 120, gap: Spacing.sm }}
            columnWrapperStyle={{ paddingHorizontal: Spacing.base, gap: Spacing.sm, marginBottom: Spacing.sm }}
          onScroll={(e) => {
            // Minimize continue section when scrolling starts
            if (e.nativeEvent.contentOffset.y > 10 && !continueSectionMinimized) {
              setContinueSectionMinimized(true);
            } else if (e.nativeEvent.contentOffset.y <= 10 && continueSectionMinimized) {
              setContinueSectionMinimized(false);
            }
          }}
          scrollEventThrottle={100}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.accent} style={{ padding: Spacing.xl }} /> : null}
          ListHeaderComponent={null}
          ListEmptyComponent={
            <View style={[styles.centered, { gap: Spacing.md }]}>
              <Ionicons name="headset-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No audiobooks found</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary, textAlign: 'center' }]}>
                {selectedGenreId || selectedAuthorId 
                  ? 'Try clearing filters to see more results.'
                  : 'Your Audiobookshelf library appears to be empty. Try scanning for new files.'}
              </Text>
              {!selectedGenreId && !selectedAuthorId && (
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.accent, borderRadius: Radius.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, marginTop: Spacing.sm }}
                  onPress={async () => {
                    try {
                      await absAPI.scanAllLibraries();
                      setTimeout(() => onRefresh(), 2000);
                    } catch {
                      // ABS Scan failed
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh-outline" size={18} color={colors.textOnAccent} style={{ marginRight: 8 }} />
                  <Text style={{ color: colors.textOnAccent, fontSize: Typography.base, fontWeight: Typography.bold }}>Scan Library</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item }: { item: LibraryItem }) => (
            <AudiobookCard
              item={item}
              cardWidth={cardWidth}
              onPress={() => router.push(`/audiobook/${item.id}`)}
              onPlay={() => handlePlay(item)}
              isPlaying={isPlaying && nowPlaying?.item.id === item.id}
              onContextMenu={(id, title, x, y) => openMenu(id, title, x, y, 'abs')}
            />
          )}
        />
        </View>
      </>
      )}

      <GenreTagContextMenu
        visible={chipMenu.visible}
        itemId={chipMenu.itemId ? parseInt(chipMenu.itemId) : null}
        itemTitle={chipMenu.itemTitle}
        itemType={chipMenu.itemType}
        position={chipMenu.position}
        onClose={closeChipMenu}
        onRemoved={() => {
          const id = chipMenu.itemId;
          if (id == null) return;
          if (chipMenu.itemType === 'genre') {
            setGenres(prev => prev.filter(g => g.id !== id));
            if (selectedGenreId === id) setSelectedGenreId(null);
          } else {
            setTags(prev => prev.filter(t => t.id !== id));
            if (selectedTagId === id) setSelectedTagId(null);
          }
          closeChipMenu();
        }}
        onAdded={() => {
          closeChipMenu();
        }}
      />

      <SeriesContextMenu
        visible={ctxMenu.visible}
        seriesId={ctxMenu.seriesId}
        seriesName={ctxMenu.seriesName}
        position={ctxMenu.position}
        onClose={closeMenu}
        onOpenDetail={openDetail}
        provider={ctxMenu.provider}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    gap: Spacing.sm,
  },
  notConfigured: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.xl,
  },
  settingsBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  settingsBtnText: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.textOnAccent,
  },
  card: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  // Web hover effect placeholder - real styling via CSS class
  cardHover: {} as any,
});
