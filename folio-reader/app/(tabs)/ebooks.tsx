import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  GestureResponderEvent,
  Image,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useRouter, useFocusEffect } from 'expo-router';
import { kavitaAPI, Series, Genre, Tag, Collection } from '../../services/kavitaAPI';
import { useAuth } from '../../contexts/AuthContext';
import { getButtonGradient } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { SeriesCard } from '../../components/SeriesCard';
import { useGridColumns } from '../../hooks/useGridColumns';
import SeriesContextMenu from '../../components/SeriesContextMenu';
import GenreTagContextMenu, { ChipType } from '../../components/GenreTagContextMenu';
import BulkEditModal from '../../components/BulkEditModal';
import { useSeriesContextMenu } from '../../hooks/useSeriesContextMenu';
import { Typography, Spacing, Radius } from '../../constants/theme';
import { storage } from '../../services/storage';
import { STORAGE_KEYS } from '../../constants/config';
import { FilterSection } from '../../components/FilterComponents';
import { Ionicons } from '@expo/vector-icons';
import { PWAInstallBanner } from '../../components/PWAInstallBanner';
import TabHeader from '../../components/TabHeader';
import { ContinueSection, ContinueItem } from '../../components/ContinueSection';

// ── Filter row without label (for tabbed interface) ───────────────────────────

function FilterRowNoLabel<T extends { id: number; title?: string; label?: string; name?: string }>({
  items,
  selectedId,
  onSelect,
  onChipContextMenu,
  onCreateChip,
}: {
  items: T[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onChipContextMenu?: (item: T, x: number, y: number) => void;
  onCreateChip?: () => void;
}) {
  const { colors } = useTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, gap: Spacing.xs }}
    >
      <GradientChip
        label="All"
        active={selectedId === null}
        colors={colors}
        onPress={() => onSelect(null)}
      />
      {items.map(item => {
        const name = (item as any).title ?? (item as any).label ?? (item as any).name ?? '';
        const active = selectedId === item.id;
        return (
          <GradientChip
            key={item.id}
            label={name}
            active={active}
            colors={colors}
            onPress={() => onSelect(item.id)}
            onContextMenu={onChipContextMenu ? (x, y) => onChipContextMenu(item, x, y) : undefined}
          />
        );
      })}
      {onCreateChip && (
        <GradientChip
          label="+"
          active={false}
          colors={colors}
          onPress={onCreateChip}
        />
      )}
    </ScrollView>
  );
}

// ── Filter row ────────────────────────────────────────────────────────────────

function FilterRow<T extends { id: number; title?: string; label?: string; name?: string }>({
  label,
  items,
  selectedId,
  onSelect,
  onChipContextMenu,
  onCreateChip,
}: {
  label: string;
  items: T[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onChipContextMenu?: (item: T, x: number, y: number) => void;
  onCreateChip?: () => void;
}) {
  const { colors } = useTheme();
  const filterRowRef = React.useRef<View>(null);
  const [dividerWidth, setDividerWidth] = React.useState(0);

  React.useEffect(() => {
    if (Platform.OS === 'web' && filterRowRef.current) {
      const el = filterRowRef.current as any as HTMLElement;
      setDividerWidth(el.getBoundingClientRect().width);
    }
  }, []);

  return (
    <View ref={filterRowRef} style={{ position: 'relative' }}>
      {/* Gradient divider line */}
      {Platform.OS === 'web' && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 1,
          background: `radial-gradient(ellipse at center, ${colors.accent}50 0%, ${colors.secondary}55 25%, #8B6DB8 50%, #A85A95 75%, ${colors.secondary}65 100%)`,
        }} />
      )}
      {Platform.OS !== 'web' && <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, backgroundColor: colors.border }} />}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {/* Fixed label - doesn't scroll */}
        {Platform.OS === 'web' ? (
          <span style={{
            fontSize: Typography.xs,
            fontWeight: Typography.bold,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            marginLeft: Spacing.base,
            marginRight: Spacing.xs,
            minWidth: 48,
            background: `radial-gradient(circle at 30% 30%, ${colors.accent} 0%, ${colors.secondary} 40%, #8B6DB8 70%, #A85A95 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>{label}</span>
        ) : (
          <Text style={{ fontSize: Typography.xs, fontWeight: Typography.bold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginLeft: Spacing.base, marginRight: Spacing.xs, minWidth: 48 }}>
            {label}
          </Text>
        )}
        {/* Scrollable chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', paddingRight: Spacing.base, paddingVertical: Spacing.md, gap: Spacing.xs }}
        >
          <GradientChip
            label="All"
            active={selectedId === null}
            colors={colors}
            onPress={() => onSelect(null)}
          />
          {items.map(item => {
            const name = (item as any).title ?? (item as any).label ?? (item as any).name ?? '';
            const active = selectedId === item.id;
            return (
              <GradientChip
                key={item.id}
                label={name}
                active={active}
                colors={colors}
                onPress={() => onSelect(active ? null : item.id)}
                onContextMenu={onChipContextMenu ? (x, y) => onChipContextMenu(item, x, y) : undefined}
              />
            );
          })}
          {onCreateChip && (
            <TouchableOpacity
              style={{ width: 28, height: 28, borderRadius: Radius.full, borderWidth: 1.5, borderColor: colors.accent, borderStyle: 'dashed' as any, justifyContent: 'center', alignItems: 'center', backgroundColor: `${colors.accent}15` }}
              onPress={onCreateChip}
              activeOpacity={0.75}
            >
              <Ionicons name="add" size={16} color={colors.accent} />
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

function GradientChip({ label, active, colors, onPress, onContextMenu }: {
  label: string; active: boolean; colors: any;
  onPress: () => void; onContextMenu?: (x: number, y: number) => void;
}) {
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (Platform.OS !== 'web' || !onContextMenu) return;
    const el = wrapperRef.current;
    if (!el) return;
    const handler = (e: MouseEvent) => { e.preventDefault(); onContextMenu(e.clientX, e.clientY); };
    el.addEventListener('contextmenu', handler);
    return () => el.removeEventListener('contextmenu', handler);
  }, [onContextMenu]);

  // Fixed gradient angle for consistent chip styling
  const gradientAngle = 135; // Fixed diagonal angle

  // Use simplified gradient for border - accent to secondary (more opaque, less aggressive)
  const gradientBorder = getButtonGradient(colors, gradientAngle);
  const textGradient = getButtonGradient(colors, gradientAngle);

  if (Platform.OS === 'web') {
    return (
      <div
        ref={wrapperRef}
        style={{
          display: 'inline-block',
          borderRadius: Radius.full,
          padding: 1, // Space for gradient border
          background: gradientBorder,
          cursor: 'default',
          userSelect: 'none',
        }}
      >
        <TouchableOpacity
          onPress={onPress}
          onLongPress={onContextMenu ? (e: GestureResponderEvent) => onContextMenu(e.nativeEvent.pageX, e.nativeEvent.pageY) : undefined}
          delayLongPress={400}
          activeOpacity={1}
        >
          <View style={{
            borderRadius: Radius.full,
            paddingHorizontal: Spacing.md,
            paddingVertical: 5,
            backgroundColor: active ? 'transparent' : 'rgba(10, 12, 25, 0.85)',
            background: active ? textGradient : undefined,
          }}>
            <span style={{
              fontSize: Typography.sm,
              fontWeight: active ? Typography.semibold : Typography.medium,
              color: active ? '#1a1a2e' : 'transparent',
              background: active ? 'none' : textGradient,
              WebkitBackgroundClip: active ? 'border-box' : 'text',
              WebkitTextFillColor: active ? '#1a1a2e' : 'transparent',
              backgroundClip: active ? 'border-box' : 'text',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}>{label}</span>
          </View>
        </TouchableOpacity>
      </div>
    );
  }

  // Fallback for native
  return (
    <TouchableOpacity
      style={[
        { backgroundColor: 'rgba(10, 12, 25, 0.85)', borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 5, borderWidth: 1, borderColor: active ? '#F5E6D3' : colors.border },
        active && { backgroundColor: 'rgba(245, 230, 211, 0.95)', borderColor: '#F5E6D3' },
      ]}
      onPress={onPress}
      onLongPress={onContextMenu ? (e: GestureResponderEvent) => onContextMenu(e.nativeEvent.pageX, e.nativeEvent.pageY) : undefined}
      delayLongPress={400}
      activeOpacity={1}
    >
      <Text style={[
        { fontSize: Typography.sm, color: active ? '#1a1a2e' : colors.textSecondary, fontWeight: active ? Typography.semibold : Typography.medium },
      ]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Create Genre/Tag modal ────────────────────────────────────────────────────

function CreateChipModal({ visible, type, allSeries, onClose, onCreated }: {
  visible: boolean;
  type: ChipType;
  allSeries: Series[];
  onClose: () => void;
  onCreated: (name: string) => void;
}) {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [seriesSearch, setSeriesSearch] = useState('');
  const [selectedSeriesId, setSelectedSeriesId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function reset() {
    setName('');
    setSeriesSearch('');
    setSelectedSeriesId(null);
    setSaving(false);
    setError('');
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) { setError('Please enter a name.'); return; }
    if (!selectedSeriesId) { setError('Please pick a series to assign it to.'); return; }
    setSaving(true);
    setError('');
    try {
      const meta = await kavitaAPI.getSeriesMetadata(selectedSeriesId);
      if (!meta) throw new Error('Could not load series metadata.');
      if (type === 'genre') {
        meta.genres = [...meta.genres, { id: 0, title: trimmed }];
      } else {
        meta.tags = [...meta.tags, { id: 0, title: trimmed }];
      }
      await kavitaAPI.updateSeriesMetadata(meta);
      onCreated(trimmed);
      handleClose();
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  const filteredSeries = allSeries
    .filter(s => s.name.toLowerCase().includes(seriesSearch.toLowerCase()))
    .slice(0, 30);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Spacing.xl, paddingBottom: 40, gap: Spacing.md }}>
          <Text style={{ fontSize: Typography.md, fontWeight: Typography.bold, color: colors.textPrimary }}>
            New {type === 'genre' ? 'Genre' : 'Tag'}
          </Text>

          <TextInput
            style={{
              backgroundColor: colors.background,
              borderWidth: 1, borderColor: colors.border,
              borderRadius: Radius.md,
              paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
              fontSize: Typography.base, color: colors.textPrimary,
            }}
            value={name}
            onChangeText={setName}
            placeholder={`${type === 'genre' ? 'Genre' : 'Tag'} name…`}
            placeholderTextColor={colors.textMuted}
            autoFocus
          />

          <Text style={{ fontSize: Typography.sm, color: colors.textSecondary }}>
            Assign to a series (required):
          </Text>
          <TextInput
            style={{
              backgroundColor: colors.background,
              borderWidth: 1, borderColor: colors.border,
              borderRadius: Radius.md,
              paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
              fontSize: Typography.sm, color: colors.textPrimary,
            }}
            value={seriesSearch}
            onChangeText={setSeriesSearch}
            placeholder="Search series…"
            placeholderTextColor={colors.textMuted}
          />
          <ScrollView style={{ maxHeight: 180 }} keyboardShouldPersistTaps="handled">
            {filteredSeries.map(s => (
              <TouchableOpacity
                key={s.id}
                onPress={() => setSelectedSeriesId(s.id)}
                style={{
                  paddingVertical: Spacing.sm,
                  paddingHorizontal: Spacing.md,
                  borderRadius: Radius.md,
                  backgroundColor: selectedSeriesId === s.id ? colors.accentSoft : 'transparent',
                  marginBottom: 2,
                }}
                activeOpacity={0.75}
              >
                <Text style={{ fontSize: Typography.sm, color: selectedSeriesId === s.id ? colors.accent : colors.textSecondary, fontWeight: selectedSeriesId === s.id ? Typography.semibold : Typography.regular }}>
                  {s.localizedName || s.name}
                </Text>
              </TouchableOpacity>
            ))}
            {filteredSeries.length === 0 && (
              <Text style={{ fontSize: Typography.sm, color: colors.textMuted, fontStyle: 'italic', padding: Spacing.md }}>No series found.</Text>
            )}
          </ScrollView>

          {error ? <Text style={{ fontSize: Typography.sm, color: colors.error }}>{error}</Text> : null}

          <TouchableOpacity
            style={{ backgroundColor: colors.accent, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', opacity: saving ? 0.6 : 1 }}
            onPress={handleCreate}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving
              ? <ActivityIndicator color={colors.textOnAccent} />
              : <Text style={{ fontSize: Typography.base, fontWeight: Typography.bold, color: colors.textOnAccent }}>Create {type === 'genre' ? 'Genre' : 'Tag'}</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Compact Filter Row Component (condensed for 2-column layout) ──
function CompactFilterRow({ label, items, selectedId, onSelect }: {
  label: string;
  items: FilterItem[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { colors } = useTheme();
  
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Text style={{ fontSize: 9, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, minWidth: 40 }}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 2 }}>
        <TouchableOpacity
          onPress={() => onSelect(null)}
          style={{
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: Radius.sm,
            backgroundColor: selectedId === null ? colors.accent : colors.surface,
            borderWidth: 1,
            borderColor: selectedId === null ? colors.accent : colors.border,
          }}
        >
          <Text style={{ fontSize: 9, color: selectedId === null ? colors.textOnAccent : colors.textPrimary }}>All</Text>
        </TouchableOpacity>
        {items.slice(0, 5).map(item => (
          <TouchableOpacity
            key={item.id}
            onPress={() => onSelect(item.id)}
            style={{
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: Radius.sm,
              backgroundColor: selectedId === item.id ? colors.accent : colors.surface,
              borderWidth: 1,
              borderColor: selectedId === item.id ? colors.accent : colors.border,
            }}
          >
            <Text style={{ fontSize: 9, color: selectedId === item.id ? colors.textOnAccent : colors.textPrimary }} numberOfLines={1}>{item.title}</Text>
          </TouchableOpacity>
        ))}
        {items.length > 5 && (
          <Text style={{ fontSize: 9, color: colors.textMuted, paddingHorizontal: 2 }}>+{items.length - 5}</Text>
        )}
      </ScrollView>
    </View>
  );
}

// ── Setup prompt ──────────────────────────────────────────────────────────────

function SetupPrompt() {
  const router = useRouter();
  const { colors, uiAnimationsEnabled } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl, paddingBottom: 60 }}>
      <Animated.View 
        entering={uiAnimationsEnabled ? FadeInDown.delay(100).springify() : undefined}
        style={{ alignItems: 'center' }}
      >
        <Ionicons name="book-outline" size={64} color={colors.accent} style={{ marginBottom: 24 }} />
        <Text style={{ fontSize: Typography.xxl, fontWeight: Typography.bold, color: colors.textPrimary, fontFamily: Typography.serif, textAlign: 'center', marginBottom: Spacing.md }}>
          Welcome to Folio
        </Text>
        <Text style={{ fontSize: Typography.base, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl }}>
          To get started, connect your Kavita server. You'll need your server URL and API key.
        </Text>
      </Animated.View>

      <Animated.View 
        entering={uiAnimationsEnabled ? FadeInDown.delay(200).springify() : undefined}
        style={{ alignSelf: 'stretch', backgroundColor: colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: colors.border, padding: Spacing.lg, marginBottom: Spacing.xl, gap: Spacing.sm }}
      >
        {[
          ['1. Open ', 'Settings', ' (bottom right)'],
          ['2. Tap ', 'Kavita Server'],
          ['3. Enter your server URL and API key'],
          ['4. Tap ', 'Save & Test'],
        ].map((parts, i) => (
          <Text key={i} style={{ fontSize: Typography.base, color: colors.textSecondary, lineHeight: 22 }}>
            {parts[0]}{parts[1] ? <Text style={{ color: colors.textPrimary, fontWeight: Typography.semibold }}>{parts[1]}</Text> : null}{parts[2] ?? ''}
          </Text>
        ))}
      </Animated.View>

      <Animated.View entering={uiAnimationsEnabled ? FadeInUp.delay(300).springify() : undefined}>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.accent, borderRadius: Radius.md, paddingVertical: Spacing.base, paddingHorizontal: Spacing.xl, marginBottom: Spacing.md }}
          onPress={() => router.push('/(tabs)/settings')}
          activeOpacity={0.8}
        >
          <Ionicons name="settings-outline" size={18} color={colors.textOnAccent} style={{ marginRight: 8 }} />
          <Text style={{ color: colors.textOnAccent, fontSize: Typography.md, fontWeight: Typography.bold }}>Go to Settings</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: Typography.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 18 }}>
          Find your API key in Kavita → User Settings → Security
        </Text>
      </Animated.View>
    </View>
  );
}

export default function EbooksScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { colors } = useTheme();
  const { numColumns, cardWidth } = useGridColumns();
  const { ctx: ctxMenu, openMenu, closeMenu, openDetail } = useSeriesContextMenu();

  const [chipMenu, setChipMenu] = useState<{
    visible: boolean;
    itemId: number | null;
    itemTitle: string;
    itemType: ChipType | null;
    position: { x: number; y: number };
  }>({ visible: false, itemId: null, itemTitle: '', itemType: null, position: { x: 0, y: 0 } });

  function openChipMenu(item: { id: number; title?: string }, type: ChipType, x: number, y: number) {
    setChipMenu({ visible: true, itemId: item.id, itemTitle: item.title ?? '', itemType: type, position: { x, y } });
  }

  function closeChipMenu() {
    setChipMenu(prev => ({ ...prev, visible: false }));
  }

  const [createChipModal, setCreateChipModal] = useState<{ visible: boolean; type: ChipType }>({
    visible: false, type: 'genre',
  });

  const [genres, setGenres] = useState<Genre[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [authors, setAuthors] = useState<{ id: number; title: string }[]>([]);

  const [selectedGenreId, setSelectedGenreId] = useState<number | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
  const [selectedAuthorId, setSelectedAuthorId] = useState<number | null>(null);

  const [recentSeries, setRecentSeries] = useState<Series[]>([]);
  const [recentSeriesLoaded, setRecentSeriesLoaded] = useState(false);
  const [series, setSeries] = useState<Series[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [coverVersion, setCoverVersion] = useState(0); // Increment to force cover refresh after upload

  const [libraries, setLibraries] = useState<any[]>([]);
  const [selectedLibraryId, setSelectedLibraryId] = useState<number | null>(null);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState<'library' | 'genre' | 'author' | 'tag' | 'collection'>('library');
  const [showContinueReading, setShowContinueReading] = useState(true);

  // Multi-select state for bulk editing
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);

  const filterKey = `${selectedGenreId}|${selectedTagId}|${selectedCollectionId}|${selectedAuthorId}|${selectedLibraryId}`;
  const prevFilterKey = useRef(filterKey);
  const flatListRef = useRef<FlatList<Series> | null>(null);
  const scrollPositionRef = useRef(0);
  
  // Cache for metadata to avoid redundant fetches
  const metadataCacheRef = useRef<{
    libraryId: number | null;
    libraries: any[];
    genres: Genre[];
    tags: Tag[];
    collections: Collection[];
    timestamp: number;
  } | null>(null);

  // Load persistent cache on mount
  useEffect(() => {
    const loadPersistentCache = async () => {
      try {
        const cached = await storage.getItem(STORAGE_KEYS.KAVITA.METADATA_CACHE);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && Date.now() - parsed.timestamp < 30 * 60 * 1000) { // 30 min TTL
            metadataCacheRef.current = parsed;
            if (parsed.libraries?.length > 0) setLibraries(parsed.libraries);
            if (parsed.genres?.length > 0) setGenres(parsed.genres);
            if (parsed.tags?.length > 0) setTags(parsed.tags);
            if (parsed.collections?.length > 0) setCollections(parsed.collections);
          }
        }
      } catch { /* ignore */ }
    };
    loadPersistentCache();
  }, []);

  // Helper to filter items in parallel batches (much faster than sequential)
  const filterWithSeries = async <T extends { id: number }>(
    items: T[],
    fetcher: (id: number) => Promise<{ length: number }>
  ): Promise<T[]> => {
    const batchSize = 8; // Check 8 items in parallel
    const results: (T | null)[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (item) => {
          try {
            const series = await fetcher(item.id);
            return series.length > 0 ? item : null;
          } catch {
            return null;
          }
        })
      );
      results.push(...batchResults);
    }
    
    return results.filter((item): item is T => item !== null);
  };

  const fetchMetadata = useCallback(async (force = false) => {
    // Skip if we have cached data for this library and it's less than 5 minutes old
    const now = Date.now();
    const cache = metadataCacheRef.current;
    if (!force && cache && cache.libraryId === selectedLibraryId && (now - cache.timestamp) < 5 * 60 * 1000) {
      // Use cached data
      setGenres(cache.genres);
      setTags(cache.tags);
      setCollections(cache.collections);
      return;
    }
    
    // Fire each request independently so each section renders as soon as its own data arrives
    // Filter genres and tags in parallel batches to remove empty ones (fast but accurate)
    // Pass selectedLibraryId to only show options available in the current library
    let fetchedGenres: Genre[] = [];
    let fetchedTags: Tag[] = [];
    let fetchedCollections: Collection[] = [];
    
    try {
      const allGenres = await kavitaAPI.getGenres(selectedLibraryId ?? undefined);
      const genresWithSeries = await filterWithSeries(allGenres, (id) => kavitaAPI.getSeriesByGenre(id, 0, 1));
      setGenres(genresWithSeries);
      fetchedGenres = genresWithSeries;
    } catch {}

    try {
      const allTags = await kavitaAPI.getTags(selectedLibraryId ?? undefined);
      const tagsWithSeries = await filterWithSeries(allTags, (id) => kavitaAPI.getSeriesByTag(id, 0, 1));
      setTags(tagsWithSeries);
      fetchedTags = tagsWithSeries;
    } catch {}

    // Filter collections by library - fetch all then filter to those with series in selected library
    try {
      const allCollections = await kavitaAPI.getCollections();
      if (!selectedLibraryId) {
        setCollections(allCollections);
        fetchedCollections = allCollections;
      } else {
        // Filter to only collections that have series in the selected library
        const collectionsWithSeries = await filterWithSeries(
          allCollections,
          (id) => kavitaAPI.getSeriesForCollection(id).then(series => 
            series.filter(s => s.libraryId === selectedLibraryId).length > 0 ? { length: 1 } : { length: 0 }
          )
        );
        setCollections(collectionsWithSeries);
        fetchedCollections = collectionsWithSeries;
      }
    } catch {}
    
    // Update cache (use current libraries from state)
    const newCache = {
      libraryId: selectedLibraryId,
      libraries: libraries.length > 0 ? libraries : [],
      genres: fetchedGenres,
      tags: fetchedTags,
      collections: fetchedCollections,
      timestamp: now,
    };
    metadataCacheRef.current = newCache;
    // Persist cache
    storage.setItem(STORAGE_KEYS.KAVITA.METADATA_CACHE, JSON.stringify(newCache)).catch(() => {});
    // Load cached continue reading data first (instant)
    storage.getItem(STORAGE_KEYS.KAVITA.ON_DECK_CACHE)
      .then((cached: string | null) => {
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setRecentSeries(parsed.slice(0, 5));
              setRecentSeriesLoaded(true);
            }
          } catch {
            // Failed to parse cached data
          }
        }
      })
      .catch(() => {});
    
    // Fetch fresh continue reading data in background
    kavitaAPI.getOnDeckSeries()
      .then(value => {
        const arr: any[] = Array.isArray(value) ? value : (value as any)?.items ?? [];
        const recent = arr.slice(0, 5);
        setRecentSeries(recent);
        setRecentSeriesLoaded(true);
        // Cache for next time
        storage.setItem(STORAGE_KEYS.KAVITA.ON_DECK_CACHE, JSON.stringify(arr))
          .catch(() => {});
      })
      .catch(() => {});
    
    kavitaAPI.getLibraries()
      .then(libs => {
        setLibraries(libs);
        if (libs.length > 0 && selectedLibraryId === null) {
          setSelectedLibraryId(libs[0].id);
        }
      })
      .catch(() => {});
  }, [selectedLibraryId]);

  // Refresh metadata (genres, tags, on-deck) silently whenever this tab regains focus.
  // Use cache if available (false = allow cache) for instant rendering
  useFocusEffect(
    useCallback(() => {
      if (!kavitaAPI.hasCredentials()) return;
      fetchMetadata(false); // false = use cache if available
      // Refresh the continue reading setting in case it changed
      setShowContinueReading(kavitaAPI.isProgressTrackingEnabled());
      // Force cover refresh in case user uploaded new cover on detail page
      setCoverVersion(v => v + 1);
    }, [fetchMetadata])
  );

  const fetchSeries = useCallback(async (pageNum: number, reset: boolean) => {
    setSeriesLoading(true);
    try {
      const pageSize = 30;
      let raw: Series[] = [];
      if (selectedCollectionId !== null) {
        // Collections don't support pagination in the same way, so we fetch all and slice
        raw = await kavitaAPI.getSeriesForCollection(selectedCollectionId);
        // For collections, we don't support pagination - return all results at once
        if (reset) {
          setSeries(raw);
          setHasMore(false);
          setPage(0);
        }
        setSeriesLoading(false);
        return;
      } else if (selectedGenreId !== null) {
        raw = await kavitaAPI.getSeriesByGenre(selectedGenreId, pageNum, pageSize);
      } else if (selectedTagId !== null) {
        raw = await kavitaAPI.getSeriesByTag(selectedTagId, pageNum, pageSize);
      } else if (selectedLibraryId !== null) {
        raw = await kavitaAPI.getSeriesForLibrary(selectedLibraryId, pageNum, pageSize);
      } else {
        raw = await kavitaAPI.getAllSeries(pageNum, pageSize);
      }
      if (reset) {
        setSeries(raw);
      } else {
        setSeries(prev => [...prev, ...raw]);
      }
      setHasMore(raw.length === pageSize);
      setPage(pageNum);
    } catch {
      // Failed to fetch series
    } finally {
      setSeriesLoading(false);
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedGenreId, selectedTagId, selectedLibraryId, selectedCollectionId]);

  function selectLibrary(idRaw: string | number | null) {
    const id = idRaw === null ? null : Number(idRaw);
    setSelectedLibraryId(id);
    // Clear other filters when switching libraries
    setSelectedGenreId(null);
    setSelectedAuthorId(null);
    setSelectedTagId(null);
    setSelectedCollectionId(null);
    // Note: fetchSeries is triggered by filterKey effect, no need to call manually
  }

  useEffect(() => {
    // Wait for async auth initialization before checking credentials
    if (authLoading) return;
    if (!isAuthenticated || !kavitaAPI.hasCredentials()) {
      setLoading(false);
      return;
    }
    fetchMetadata(true); // true = force fresh fetch on initial mount
    fetchSeries(0, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    if (filterKey === prevFilterKey.current) return;
    prevFilterKey.current = filterKey;
    // Save scroll position before clearing data
    const currentScroll = scrollPositionRef.current;
    setSeries([]);
    setPage(0);
    setHasMore(true);
    fetchSeries(0, true).then(() => {
      // Restore scroll position after data loads
      setTimeout(() => {
        if (flatListRef.current && currentScroll > 0) {
          flatListRef.current.scrollToOffset({ offset: currentScroll, animated: false });
        }
      }, 100);
    });
  }, [filterKey]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMetadata(true); // true = force fresh fetch on manual refresh
    fetchSeries(0, true);
  };

  // Extract authors from loaded series metadata
  useEffect(() => {
    const extractAuthorsFromSeries = async () => {
      if (series.length === 0) return;
      
      const authorMap = new Map<number, string>();
      
      // Fetch metadata for series to extract writers
      // Process in batches to avoid too many concurrent requests
      const batchSize = 5;
      for (let i = 0; i < series.length; i += batchSize) {
        const batch = series.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (s) => {
            try {
              const metadata = await kavitaAPI.getSeriesMetadata(s.id);
              if (metadata?.writers) {
                metadata.writers.forEach(writer => {
                  if (writer.id && writer.name && !authorMap.has(writer.id)) {
                    authorMap.set(writer.id, writer.name);
                  }
                });
              }
            } catch {
              // Skip series with no metadata
            }
          })
        );
      }
      
      const authorItems = Array.from(authorMap.entries())
        .map(([id, title]) => ({ id, title }))
        .sort((a, b) => a.title.localeCompare(b.title));
      
      setAuthors(authorItems);
    };
    
    extractAuthorsFromSeries();
  }, [series]);

  function loadMore() {
    if (!hasMore || seriesLoading) return;
    fetchSeries(page + 1, false);
  }

  // Esc key handler to exit selection mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSelectionMode) {
        exitSelectionMode();
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isSelectionMode]);

  // Multi-select handlers
  const toggleSelection = (id: string | number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(series.map(s => s.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    clearSelection();
  };

  const hasActiveFilter = selectedGenreId !== null || selectedTagId !== null || selectedCollectionId !== null || selectedAuthorId !== null;

  // Memoized renderItem to prevent unnecessary re-renders while scrolling
  const renderSeriesCard = useCallback(({ item }: { item: Series }) => (
    <View style={{ position: 'relative' }}>
      <SeriesCard
        series={item as any}
        onPress={() => {
          if (isSelectionMode) {
            toggleSelection(item.id);
          } else {
            router.push(`/series/${item.id}`);
          }
        }}
        onContextMenu={(id, name, x, y) => {
          if (isSelectionMode) {
            // In selection mode, right-click opens bulk edit if items selected
            if (selectedIds.size > 0) {
              setShowBulkEditModal(true);
            }
          } else {
            openMenu(id, name, x, y);
          }
        }}
        cardWidth={cardWidth}
        coverVersion={coverVersion}
      />
      {isSelectionMode && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 10,
            padding: 4,
          }}
          onPress={() => toggleSelection(item.id)}
          activeOpacity={0.8}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: colors.accent,
              backgroundColor: selectedIds.has(item.id) ? colors.accent : 'transparent',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {selectedIds.has(item.id) && (
              <Text style={{ color: colors.textOnAccent, fontSize: 14, fontWeight: 'bold' }}>✓</Text>
            )}
          </View>
        </TouchableOpacity>
      )}
    </View>
  ), [isSelectionMode, router, toggleSelection, selectedIds, openMenu, cardWidth, colors.accent, colors.textOnAccent, coverVersion]);

  if (authLoading || loading) {
    return (
      <View style={{ flex: 1, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (!kavitaAPI.hasCredentials()) {
    return <SetupPrompt />;
  }

  return (
    <View style={{
      flex: 1,
      zIndex: 1,
      backgroundColor: Platform.OS === 'web' ? 'rgba(5, 6, 15, 0.15)' : colors.background,
    } as any}>
      <PWAInstallBanner />
      <TabHeader
        title={selectedLibraryId ? libraries.find(l => l.id === selectedLibraryId)?.name || 'Ebooks' : 'Ebooks'}
        count={series.length}
        countLabel="series"
        hasMore={hasMore}
        serverName="Kavita"
        libraries={libraries}
        selectedLibraryId={selectedLibraryId}
        onSelectLibrary={selectLibrary}
        isSelectionMode={isSelectionMode}
        onToggleSelection={() => isSelectionMode ? exitSelectionMode() : setIsSelectionMode(true)}
      />

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
        onSelectGenre={setSelectedGenreId}
        onSelectAuthor={(id) => setSelectedAuthorId(id === null ? null : Number(id))}
        onSelectTag={(id) => setSelectedTagId(id === null ? null : Number(id))}
        onSelectCollection={(id) => setSelectedCollectionId(id === null ? null : Number(id))}
        onChipContextMenu={(item, type, x, y) => openChipMenu({ id: Number(item.id), title: item.title }, type, x, y)}
        onCreateChip={(type) => setCreateChipModal({ visible: true, type })}
        onClearAll={() => {
          setSelectedLibraryId(null);
          setSelectedGenreId(null);
          setSelectedAuthorId(null);
          setSelectedTagId(null);
          setSelectedCollectionId(null);
        }}
      />
      
      <View style={{ flex: 1, marginHorizontal: Spacing.base }}>
        <FlatList
          ref={flatListRef}
          key={numColumns}
          data={series}
          keyExtractor={(item) => item.id.toString()}
          numColumns={numColumns}
          contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: Spacing.base, backgroundColor: 'transparent' }}
          columnWrapperStyle={{ gap: Spacing.sm, marginBottom: Spacing.sm }}
        onScroll={(e) => { scrollPositionRef.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={100}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          <View>
            {showContinueReading && (
              <ContinueSection
                title="Continue Reading"
                items={recentSeries.map((s: any): ContinueItem => ({
                  id: s.seriesId || s.id,
                  title: s.localizedName || s.name,
                  subtitle: s.libraryName,
                  coverUrl: kavitaAPI.getSeriesCoverUrl(s.seriesId || s.id),
                  progress: s.pages > 0 ? (s.pagesRead / s.pages) * 100 : 0,
                }))}
                onPressItem={(item) => router.push(`/series/${item.id}`)}
                onContextMenu={(item, x, y) => openMenu(Number(item.id), item.title, x, y)}
              />
            )}
            {seriesLoading && recentSeries.length > 0 && <ActivityIndicator color={colors.accent} />}
          </View>
        }
        ListEmptyComponent={
          !seriesLoading ? (
            <View style={{ alignItems: 'center', paddingTop: 40, paddingHorizontal: Spacing.xl, gap: Spacing.md }}>
              <Ionicons name="library-outline" size={48} color={colors.textMuted} />
              <Text style={{ fontSize: Typography.xl, fontWeight: Typography.bold, color: colors.textPrimary }}>No series found</Text>
              <Text style={{ fontSize: Typography.base, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 }}>
                {hasActiveFilter
                  ? 'Try different filters or clear them to see all series.'
                  : 'Your Kavita library appears to be empty. Try scanning for new files.'}
              </Text>
              {!hasActiveFilter && (
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.accent, borderRadius: Radius.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, marginTop: Spacing.sm }}
                  onPress={async () => {
                    try {
                      if (selectedLibraryId) {
                        await kavitaAPI.scanLibrary(selectedLibraryId);
                      } else {
                        await kavitaAPI.scanAllLibraries();
                      }
                      // Refresh after a short delay to let scan start
                      setTimeout(() => onRefresh(), 2000);
                    } catch {
                      // Scan failed
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh-outline" size={18} color={colors.textOnAccent} style={{ marginRight: 8 }} />
                  <Text style={{ color: colors.textOnAccent, fontSize: Typography.base, fontWeight: Typography.bold }}>Scan Library</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
        renderItem={renderSeriesCard}
      />
      </View>

      {/* Selection Toolbar */}
      {isSelectionMode && (
        <View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          padding: Spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 100,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
            <Text style={{ color: colors.textPrimary, fontWeight: Typography.semibold }}>
              {selectedIds.size} selected
            </Text>
            <TouchableOpacity onPress={selectAll}>
              <Text style={{ color: colors.accent, fontSize: Typography.sm }}>Select All</Text>
            </TouchableOpacity>
            {selectedIds.size > 0 && (
              <TouchableOpacity onPress={clearSelection}>
                <Text style={{ color: colors.textMuted, fontSize: Typography.sm }}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            {selectedIds.size > 0 && (
              <TouchableOpacity
                style={{
                  paddingHorizontal: Spacing.lg,
                  paddingVertical: Spacing.sm,
                  borderRadius: Radius.md,
                  backgroundColor: colors.accent,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
                onPress={() => setShowBulkEditModal(true)}
              >
                <Ionicons name="pencil" size={16} color={colors.textOnAccent} />
                <Text style={{ color: colors.textOnAccent, fontWeight: Typography.semibold }}>
                  Edit {selectedIds.size} Series
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Add padding at bottom when selection mode is active */}
      {isSelectionMode && <View style={{ height: 80 }} />}

      <SeriesContextMenu
        visible={ctxMenu.visible}
        seriesId={ctxMenu.seriesId}
        seriesName={ctxMenu.seriesName}
        position={ctxMenu.position}
        onClose={closeMenu}
        onOpenDetail={openDetail}
      />

      <BulkEditModal
        visible={showBulkEditModal}
        seriesIds={Array.from(selectedIds)}
        allGenres={genres}
        allTags={tags}
        allCollections={collections}
        onClose={() => setShowBulkEditModal(false)}
        onComplete={() => {
          clearSelection();
          exitSelectionMode();
          fetchMetadata(true);
          fetchSeries(0, true);
        }}
      />

      <GenreTagContextMenu
        visible={chipMenu.visible}
        itemId={chipMenu.itemId}
        itemTitle={chipMenu.itemTitle}
        itemType={chipMenu.itemType}
        position={chipMenu.position}
        onClose={closeChipMenu}
        onRemoved={() => { 
          // Optimistically remove from local state using chipMenu.itemId
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
          fetchMetadata(true); 
          fetchSeries(0, true); 
        }}
        onAdded={() => {
          // Refresh to show updated counts
          fetchMetadata(true);
          fetchSeries(0, true);
        }}
        allSeries={series.map(s => ({ id: s.id, name: s.name }))}
      />

      <CreateChipModal
        visible={createChipModal.visible}
        type={createChipModal.type}
        allSeries={series}
        onClose={() => setCreateChipModal(prev => ({ ...prev, visible: false }))}
        onCreated={(name) => { 
          // Optimistically add to local state with a temporary ID
          const tempId = Date.now();
          if (createChipModal.type === 'genre') {
            setGenres(prev => [...prev, { id: tempId, title: name } as Genre]);
          } else {
            setTags(prev => [...prev, { id: tempId, title: name } as Tag]);
          }
          fetchMetadata(); 
          fetchSeries(0, true); 
        }}
      />
    </View>
  );
}
