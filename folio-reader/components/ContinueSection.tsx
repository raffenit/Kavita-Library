import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Typography, Spacing, Radius } from '../constants/theme';

// ── Types ───────────────────────────────────────────────────────────────────

export interface ContinueItem {
  id: string | number;
  title: string;
  subtitle?: string;
  coverUrl: string;
  progress: number; // 0-100
  total?: number;
  current?: number;
}

interface ContinueSectionProps {
  title: string;
  items: ContinueItem[];
  onPressItem: (item: ContinueItem) => void;
  onContextMenu?: (item: ContinueItem, x: number, y: number) => void;
  onPlay?: (item: ContinueItem) => void;
  isPlaying?: (item: ContinueItem) => boolean;
  minimized?: boolean;
}

// ── Individual Card ───────────────────────────────────────────────────────────

function ContinueCard({
  item,
  onPress,
  onContextMenu,
  onPlay,
  isPlaying,
}: {
  item: ContinueItem;
  onPress: () => void;
  onContextMenu?: (x: number, y: number) => void;
  onPlay?: () => void;
  isPlaying?: boolean;
}) {
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

  const showProgressBar = item.progress > 0 && item.progress < 100;
  const showPlayButton = onPlay && item.total && item.total > 0;

  return (
    <TouchableOpacity
      ref={ref}
      onPress={onPress}
      onLongPress={onContextMenu ? (e) => onContextMenu(e.nativeEvent.pageX, e.nativeEvent.pageY) : undefined}
      delayLongPress={400}
      activeOpacity={0.85}
      style={{
        width: 200,
        height: 75,
        marginRight: Spacing.sm,
        borderRadius: Radius.sm,
        overflow: 'hidden',
        backgroundColor: `${colors.background}90`,
        borderWidth: 1,
        borderColor: `${colors.border}50`,
        flexDirection: 'row',
      }}
    >
      {/* Cover image on left */}
      <View style={{ width: 55, height: '100%' }}>
        <Image source={{ uri: item.coverUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        
        {/* Progress bar */}
        {showProgressBar && (
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <View style={{ width: `${item.progress}%`, height: '100%', backgroundColor: colors.accent }} />
          </View>
        )}
      </View>

      {/* Text info on right */}
      <View style={{ flex: 1, padding: Spacing.xs, paddingLeft: Spacing.sm, justifyContent: 'flex-start' }}>
        <Text numberOfLines={2} style={{ fontSize: 13, color: colors.textPrimary, lineHeight: 17, fontWeight: Typography.medium }}>
          {item.title}
        </Text>
        {item.subtitle && (
          <Text numberOfLines={1} style={{ fontSize: 12, color: colors.accent, marginTop: 2 }}>
            {item.subtitle}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Section Component ─────────────────────────────────────────────────────────

export function ContinueSection({
  title,
  items,
  onPressItem,
  onContextMenu,
  onPlay,
  isPlaying,
  minimized = false,
}: ContinueSectionProps) {
  const { colors } = useTheme();

  if (!items.length) return null;

  return (
    <View style={{ marginBottom: minimized ? 0 : Spacing.md }}>
      {/* Top gradient divider - full width */}
      {Platform.OS === 'web' ? (
        <div style={{
          height: 1,
          background: `radial-gradient(ellipse at center, ${colors.accent}50 0%, ${colors.secondary}55 25%, #8B6DB8 50%, #A85A95 75%, ${colors.secondary}65 100%)`,
          marginBottom: minimized ? 0 : Spacing.md,
          width: '100%',
        }} />
      ) : (
        <View style={{ height: 1, backgroundColor: colors.border, marginBottom: minimized ? 0 : Spacing.md, width: '100%' }} />
      )}

      {/* Header */}
      {!minimized && (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, marginBottom: Spacing.sm, gap: Spacing.sm }}>
          <Text style={{ fontSize: Typography.sm, fontWeight: Typography.bold, color: colors.textPrimary }}>
            {title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent }} />
            <Text style={{ fontSize: 10, color: colors.textMuted }}>{items.length}</Text>
          </View>
        </View>
      )}

      {/* Horizontal scroll */}
      {!minimized && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: Spacing.base, paddingBottom: 2 }}
        >
          {items.map((item) => (
            <ContinueCard
              key={String(item.id)}
              item={item}
              onPress={() => onPressItem(item)}
              onContextMenu={onContextMenu ? (x, y) => onContextMenu(item, x, y) : undefined}
              onPlay={onPlay ? () => onPlay(item) : undefined}
              isPlaying={isPlaying ? isPlaying(item) : false}
            />
          ))}
        </ScrollView>
      )}

      {/* Bottom gradient divider - full width */}
      {Platform.OS === 'web' ? (
        <div style={{
          height: 1,
          background: `radial-gradient(ellipse at center, ${colors.accent}50 0%, ${colors.secondary}55 25%, #8B6DB8 50%, #A85A95 75%, ${colors.secondary}65 100%)`,
          marginTop: minimized ? 0 : Spacing.md,
          width: '100%',
        }} />
      ) : (
        <View style={{ height: 1, backgroundColor: colors.border, marginTop: minimized ? 0 : Spacing.md, width: '100%' }} />
      )}
    </View>
  );
}
