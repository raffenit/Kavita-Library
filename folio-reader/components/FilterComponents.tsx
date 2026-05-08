import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, GestureResponderEvent } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Typography, Spacing, Radius } from '../constants/theme';

// ── Constants for consistent styling ──
// Note: These are derived from theme colors.textOnAccent and colors.overlay
// Kept as constants for consistency across FilterComponents

// ── Gradient Chip Component ──
interface GradientChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
  onContextMenu?: (x: number, y: number) => void;
}

export function GradientChip({ label, active, onPress, onContextMenu }: GradientChipProps) {
  const { colors } = useTheme();
  const ref = React.useRef<View>(null);

  // Web context menu support
  React.useEffect(() => {
    if (Platform.OS !== 'web' || !onContextMenu) return;
    const el = ref.current as any as HTMLElement;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      e.preventDefault();
      onContextMenu(e.clientX, e.clientY);
    };
    el.addEventListener('contextmenu', handler);
    return () => el.removeEventListener('contextmenu', handler);
  }, [onContextMenu]);

  return (
    <TouchableOpacity
      ref={ref}
      onPress={onPress}
      onLongPress={onContextMenu ? (e: GestureResponderEvent) => onContextMenu(e.nativeEvent.pageX, e.nativeEvent.pageY) : undefined}
      style={[
        {
          borderRadius: Radius.full,
          paddingHorizontal: Spacing.sm,
          paddingVertical: 3,
          borderWidth: 1,
          borderColor: active ? colors.accent : colors.border,
        },
        // Inactive: glassmorphic translucent background matching header darkness
        !active && (Platform.OS === 'web'
          ? { background: `${colors.background}80`, backdropFilter: 'blur(4px)' } as any
          : { backgroundColor: colors.overlay }
        ),
        // Active: translucent gradient background (web) or accent (native) - 80% opacity
        active && (Platform.OS === 'web'
          ? { background: `linear-gradient(135deg, ${colors.accent}CC 0%, ${colors.secondary}CC 100%)` } as any
          : { backgroundColor: colors.accent }
        ),
      ]}
      activeOpacity={0.85}
    >
      <Text
        style={{
          fontSize: Typography.sm,
          fontWeight: active ? Typography.semibold : Typography.medium,
          color: active ? colors.textOnAccent : colors.textPrimary,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ── Filter Row with Label ──
interface FilterRowProps<T> {
  label: string;
  items: T[];
  selectedId: string | number | null;
  onSelect: (id: string | number | null) => void;
  onContextMenu?: (item: T, x: number, y: number) => void;
  getItemName?: (item: T) => string;
}

export function FilterRow<T extends { id: string | number }>({
  label,
  items,
  selectedId,
  onSelect,
  onContextMenu,
  getItemName,
}: FilterRowProps<T>) {
  const { colors } = useTheme();
  const filterRowRef = React.useRef<View>(null);

  const getName = (item: T): string => {
    if (getItemName) return getItemName(item);
    return (item as any).title ?? (item as any).label ?? (item as any).name ?? '';
  };

  return (
    <View ref={filterRowRef} style={{ position: 'relative' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {/* Fixed label */}
        {Platform.OS === 'web' ? (
          <span
            style={{
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
            }}
          >
            {label}
          </span>
        ) : (
          <Text
            style={{
              fontSize: Typography.xs,
              fontWeight: Typography.bold,
              color: colors.textMuted,
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              marginLeft: Spacing.base,
              marginRight: Spacing.xs,
              minWidth: 48,
            }}
          >
            {label}
          </Text>
        )}
        {/* Scrollable chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingRight: Spacing.base,
            paddingVertical: Spacing.md,
            gap: Spacing.xs,
          }}
        >
          <GradientChip label="All" active={selectedId === null} onPress={() => onSelect(null)} />
          {items.map((item) => (
            <GradientChip
              key={String(item.id)}
              label={getName(item)}
              active={selectedId === item.id}
              onPress={() => onSelect(item.id)}
              onContextMenu={onContextMenu ? (x, y) => onContextMenu(item, x, y) : undefined}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

// ── Filter Tab Button ──
interface FilterTabProps {
  label: string;
  active: boolean;
  onPress: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  /** Whether to show the top border/outline on active tab */
  showTopBorder?: boolean;
}

export function FilterTab({ label, active, onPress, isFirst, isLast, showTopBorder = true }: FilterTabProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderTopLeftRadius: isFirst ? Radius.sm : 0,
        borderTopRightRadius: isLast ? Radius.sm : 0,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        // Inactive: glassmorphic dark
        ...(Platform.OS === 'web' && !active && {
          background: `${colors.background}60`,
          backdropFilter: 'blur(4px)',
        }),
        // Native: solid accent when active
        ...(Platform.OS !== 'web' && active && { backgroundColor: colors.accent }),
        // Active web: translucent gradient (80% opacity)
        ...(Platform.OS === 'web' && active && {
          background: `linear-gradient(135deg, ${colors.accent}CC 0%, ${colors.secondary}CC 100%)`,
        }),
        // No borders for cleaner look
        marginBottom: -1,
        zIndex: active ? 1 : 0,
      }}
    >
      <Text
        style={{
          fontSize: Typography.sm,
          color: active ? colors.textOnAccent : colors.textSecondary,
          fontWeight: active ? '600' : '400',
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ── Filter Row without Label ──
interface FilterRowNoLabelProps<T> {
  items: T[];
  selectedId: string | number | null;
  onSelect: (id: string | number | null) => void;
  onContextMenu?: (item: T, x: number, y: number) => void;
  getItemName?: (item: T) => string;
  extraChip?: { label: string; onPress: () => void };
  hideAllChip?: boolean;
}

export function FilterRowNoLabel<T extends { id: string | number }>({
  items,
  selectedId,
  onSelect,
  onContextMenu,
  getItemName,
  extraChip,
  hideAllChip = false,
}: FilterRowNoLabelProps<T>) {
  const { colors } = useTheme();

  const getName = (item: T): string => {
    if (getItemName) return getItemName(item);
    return (item as any).title ?? (item as any).label ?? (item as any).name ?? '';
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.base,
        paddingVertical: Spacing.xs,
        gap: Spacing.xs,
      }}
    >
      {!hideAllChip && <GradientChip label="All" active={selectedId === null} onPress={() => onSelect(null)} />}
      {items.map((item) => (
        <GradientChip
          key={String(item.id)}
          label={getName(item)}
          active={selectedId === item.id}
          onPress={() => onSelect(item.id)}
          onContextMenu={onContextMenu ? (x, y) => onContextMenu(item, x, y) : undefined}
        />
      ))}
      {extraChip && <GradientChip label={extraChip.label} active={false} onPress={extraChip.onPress} />}
    </ScrollView>
  );
}

// ── Compact Filter Row ──
interface CompactFilterRowProps {
  label: string;
  items: { id: string | number; title: string }[];
  selectedId: string | number | null;
  onSelect: (id: string | number | null) => void;
}

export function CompactFilterRow({ label, items, selectedId, onSelect }: CompactFilterRowProps) {
  const { colors } = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text
        style={{
          fontSize: Typography.xs,
          fontWeight: Typography.bold,
          color: colors.textMuted,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          marginLeft: Spacing.base,
          marginRight: Spacing.xs,
        }}
      >
        {label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
      >
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
          <Text
            style={{
              fontSize: 9,
              color: selectedId === null ? colors.textOnAccent : colors.textPrimary,
            }}
          >
            All
          </Text>
        </TouchableOpacity>
        {items.slice(0, 5).map((item) => (
          <TouchableOpacity
            key={String(item.id)}
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
            <Text
              style={{
                fontSize: 9,
                color: selectedId === item.id ? colors.textOnAccent : colors.textPrimary,
              }}
              numberOfLines={1}
            >
              {item.title}
            </Text>
          </TouchableOpacity>
        ))}
        {items.length > 5 && (
          <Text style={{ fontSize: 9, color: colors.textMuted }}>+{items.length - 5}</Text>
        )}
      </ScrollView>
    </View>
  );
}

// ── Complete Filter Section with Tabs ──
type FilterType = 'library' | 'genre' | 'author' | 'tag' | 'collection';

interface FilterSectionProps<T extends { id: string | number; title: string }> {
  libraries: T[];
  genres: T[];
  authors: T[];
  tags: T[];
  collections: T[];
  selectedLibraryId: string | number | null;
  selectedGenreId: string | number | null;
  selectedAuthorId: string | number | null;
  selectedTagId: string | number | null;
  selectedCollectionId: string | number | null;
  onSelectLibrary: (id: string | number | null) => void;
  onSelectGenre: (id: string | number | null) => void;
  onSelectAuthor: (id: string | number | null) => void;
  onSelectTag: (id: string | number | null) => void;
  onSelectCollection: (id: string | number | null) => void;
  defaultTab?: FilterType;
  hideLibraryTab?: boolean;
  // Optional handlers for ebooks context menu features
  onChipContextMenu?: (item: T, type: 'genre' | 'tag', x: number, y: number) => void;
  onCreateChip?: (type: 'genre' | 'tag') => void;
  // Optional clear all handler
  onClearAll?: () => void;
}

export function FilterSection<T extends { id: string | number; title: string }>({
  libraries,
  genres,
  authors,
  tags,
  collections,
  selectedLibraryId,
  selectedGenreId,
  selectedAuthorId,
  selectedTagId,
  selectedCollectionId,
  onSelectLibrary,
  onSelectGenre,
  onSelectAuthor,
  onSelectTag,
  onSelectCollection,
  defaultTab = 'genre',
  hideLibraryTab = false,
  onChipContextMenu,
  onCreateChip,
  onClearAll,
}: FilterSectionProps<T>) {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<FilterType>(
    hideLibraryTab && defaultTab === 'library' ? 'genre' : defaultTab
  );

  const hasLibrary = !hideLibraryTab && libraries.length > 0;

  return (
    <View style={{
      marginBottom: Spacing.sm,
      backgroundColor: Platform.OS === 'web' ? `${colors.background}90` : colors.surface,
      ...(Platform.OS === 'web' && {
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${colors.border}40`,
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.2)',
      } as any),
    }}>
      {/* Tab Navigation with Reset */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: Spacing.sm, paddingTop: Spacing.xs, gap: 2 }}
        >
          {hasLibrary && (
            <FilterTab
              label="Library"
              active={activeTab === 'library'}
              onPress={() => setActiveTab('library')}
              isFirst
            />
          )}
          <FilterTab
            label="Genre"
            active={activeTab === 'genre'}
            onPress={() => setActiveTab('genre')}
            isFirst={!hasLibrary}
          />
          <FilterTab
            label="Author"
            active={activeTab === 'author'}
            onPress={() => setActiveTab('author')}
          />
          <FilterTab
            label="Tag"
            active={activeTab === 'tag'}
            onPress={() => setActiveTab('tag')}
          />
          <FilterTab
            label="Collection"
            active={activeTab === 'collection'}
            onPress={() => setActiveTab('collection')}
            isLast
          />
        </ScrollView>
        {onClearAll && (
          <TouchableOpacity onPress={onClearAll} style={{ paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs }}>
            <Text style={{ fontSize: 10, color: colors.textMuted }}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Gradient divider */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          {Platform.OS === 'web' ? (
            <View style={{ height: 1, background: `linear-gradient(90deg, transparent 0%, ${colors.secondary}40 30%, ${colors.accent}60 50%, ${colors.secondary}40 70%, transparent 100%)` } as any} />
          ) : (
            <View style={{ height: 1, backgroundColor: colors.accent }} />
          )}
        </View>
      </View>

      {/* Tab Content */}
      <View style={{
        backgroundColor: Platform.OS === 'web' ? `${colors.background}60` : colors.surface,
        paddingVertical: Spacing.xs,
      }}>
        {activeTab === 'library' && hasLibrary && (
          <FilterRowNoLabel
            items={libraries}
            selectedId={selectedLibraryId}
            onSelect={onSelectLibrary}
            hideAllChip
          />
        )}
        {activeTab === 'genre' && (
          <FilterRowNoLabel
            items={genres}
            selectedId={selectedGenreId}
            onSelect={onSelectGenre}
            onContextMenu={onChipContextMenu ? (item, x, y) => onChipContextMenu(item, 'genre', x, y) : undefined}
            extraChip={onCreateChip ? { label: '+', onPress: () => onCreateChip('genre') } : undefined}
          />
        )}
        {activeTab === 'author' && (
          <FilterRowNoLabel
            items={authors}
            selectedId={selectedAuthorId}
            onSelect={onSelectAuthor}
          />
        )}
        {activeTab === 'tag' && (
          <FilterRowNoLabel
            items={tags}
            selectedId={selectedTagId}
            onSelect={onSelectTag}
            onContextMenu={onChipContextMenu ? (item, x, y) => onChipContextMenu(item, 'tag', x, y) : undefined}
            extraChip={onCreateChip ? { label: '+', onPress: () => onCreateChip('tag') } : undefined}
          />
        )}
        {activeTab === 'collection' && (
          <FilterRowNoLabel
            items={collections}
            selectedId={selectedCollectionId}
            onSelect={onSelectCollection}
          />
        )}
      </View>
    </View>
  );
}
