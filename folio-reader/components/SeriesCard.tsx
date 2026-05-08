import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
  GestureResponderEvent,
} from 'react-native';
import { LibraryItem } from '../services/LibraryProvider';
import { LibraryFactory } from '../services/LibraryFactory';
import { Typography, Spacing, Radius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useGridColumns } from '../hooks/useGridColumns';

interface Props {
  series: LibraryItem;
  onPress: () => void;
  onContextMenu?: (seriesId: number | string, seriesName: string, x: number, y: number) => void;
  style?: any;
  cardWidth?: number;
  coverVersion?: number; // Increment to force cover refresh after upload
}

function getFormatIcon(format: number): string {
  switch (format) {
    case 3: return 'EPUB';
    case 4: return 'PDF';
    case 1: return 'CBZ';
    default: return 'IMG';
  }
}

export const SeriesCard = React.memo(function SeriesCard({ series, onPress, onContextMenu, style, cardWidth, coverVersion }: Props) {
  const { colors } = useTheme();
  const progress = (series.progress || 0) * 100;

  // Handle both LibraryItem (title) and raw Kavita Series (name)
  const seriesTitle = (series as any).title || (series as any).name || 'Unknown';
  const seriesProvider = (series as any).provider || 'kavita';

  const provider = LibraryFactory.getProvider(seriesProvider);
  // Memoize coverUrl to prevent regeneration on every render (causes image reload flicker)
  // Include coverVersion in dependencies to force refresh after upload
  const coverUrl = useMemo(() => {

    // Pass true for cache busting when coverVersion is set, then append v=
    const baseUrl = provider.getCoverUrl(series.id, !!coverVersion);

    // Use &v= since getCoverUrl already has ?seriesId=...&apiKey=...&t=...
    return coverVersion ? `${baseUrl}&v=${coverVersion}` : baseUrl;
  }, [provider, series.id, coverVersion]);
  const containerRef = useRef<View>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !onContextMenu) return;
    const el = containerRef.current as any as HTMLElement;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      e.preventDefault();
      onContextMenu(series.id, seriesTitle, e.clientX, e.clientY);
    };
    el.addEventListener('contextmenu', handler);
    return () => el.removeEventListener('contextmenu', handler);
  }, [onContextMenu, series.id, seriesTitle]);

  function handleLongPress(e: GestureResponderEvent) {
    if (onContextMenu) {
      onContextMenu(series.id, seriesTitle, e.nativeEvent.pageX, e.nativeEvent.pageY);
    }
  }

  return (
    <TouchableOpacity
      ref={containerRef}
      style={[cardWidth ? { width: cardWidth } : styles.cardFallback, style, Platform.OS === 'web' && (styles as any).webHover]}
      onPress={onPress}
      onLongPress={onContextMenu ? handleLongPress : undefined}
      delayLongPress={400}
      activeOpacity={0.8}
      {...(Platform.OS === 'web' ? { className: 'series-card-hover' } : {})}
    >
      <View style={[styles.coverContainer, { backgroundColor: Platform.OS === 'web' ? colors.overlay : colors.surface, backdropFilter: Platform.OS === 'web' ? 'blur(8px)' : undefined } as any]}>
        <Image
          source={{ uri: coverUrl }}
          style={styles.cover}
          resizeMode="cover"
        />
        {/* Hover title overlay - web only */}
        {Platform.OS === 'web' && (
          <View style={styles.hoverOverlay} pointerEvents="none">
            <View style={styles.titlePopup}>
              <Text style={[styles.titlePopupText, { color: colors.textOnAccent }]} numberOfLines={2}>{seriesTitle}</Text>
            </View>
          </View>
        )}
        <View style={[styles.formatBadge, { backgroundColor: colors.overlay }]}>
          <Text style={[styles.formatText, { color: colors.accent }]}>{(series as any).format ? getFormatIcon((series as any).format) : (series.mediaType === 'audiobook' ? 'AUDIO' : 'BOOK')}</Text>
        </View>
        {progress > 0 && progress < 100 && (
          <View style={[styles.progressBar, { backgroundColor: colors.overlay }]}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.accent }]} />
          </View>
        )}
        {progress >= 100 && (
          <View style={[styles.completedBadge, { backgroundColor: colors.success }]}>
            <Text style={[styles.completedText, { color: colors.textOnAccent }]}>✓</Text>
          </View>
        )}
      </View>
      <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>{seriesTitle}</Text>
    </TouchableOpacity>
  );
});

export const SeriesCardLarge = React.memo(function SeriesCardLarge({ series, onPress, onContextMenu, coverVersion }: Props) {
  const { colors } = useTheme();
  const progress = (series.progress || 0) * 100;
  const isAbs = series.provider === 'abs' || series.mediaType === 'audiobook';
  const realId = series.id;

  // Handle both LibraryItem (title) and raw Kavita Series (name)
  const seriesTitle = (series as any).title || (series as any).name || 'Unknown';

  const provider = LibraryFactory.getProvider(series.provider || 'kavita');
  // Memoize coverUrl to prevent regeneration on every render (causes image reload flicker)
  // Include coverVersion in dependencies to force refresh after upload
  const coverUrl = useMemo(() => {

    // Pass true for cache busting when coverVersion is set, then append v=
    const baseUrl = provider.getCoverUrl(realId, !!coverVersion);

    // Use &v= since getCoverUrl already has ?seriesId=...&apiKey=...&t=...
    return coverVersion ? `${baseUrl}&v=${coverVersion}` : baseUrl;
  }, [provider, realId, coverVersion]);
  const containerRef = useRef<View>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !onContextMenu) return;
    const el = containerRef.current as any as HTMLElement;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      e.preventDefault();
      onContextMenu(realId, seriesTitle, e.clientX, e.clientY);
    };
    el.addEventListener('contextmenu', handler);
    return () => el.removeEventListener('contextmenu', handler);
  }, [onContextMenu, realId, seriesTitle]);

  function handleLongPress(e: GestureResponderEvent) {
    if (onContextMenu) {
      onContextMenu(realId, seriesTitle, e.nativeEvent.pageX, e.nativeEvent.pageY);
    }
  }

  return (
    <TouchableOpacity
      ref={containerRef}
      style={[styles.cardLarge, { backgroundColor: colors.surface, borderColor: isAbs ? colors.accent + '40' : colors.border, borderWidth: 1 }]}
      onPress={onPress}
      onLongPress={onContextMenu ? handleLongPress : undefined}
      delayLongPress={400}
      activeOpacity={0.8}
    >
      <View style={{ position: 'relative' }}>
        <Image source={{ uri: coverUrl }} style={styles.coverLarge} resizeMode="cover" />
        {isAbs && (
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.accent, paddingVertical: 2, alignItems: 'center' }}>
            <Ionicons name="headset" size={10} color={colors.textOnAccent} />
          </View>
        )}
      </View>
      <View style={styles.infoLarge}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          {isAbs ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.accent + '20', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 }}>
              <Ionicons name="headset" size={10} color={colors.accent} />
              <Text style={{ fontSize: 9, fontWeight: '700', color: colors.accent, letterSpacing: 0.5 }}>AUDIOBOOK</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.surface, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1, borderColor: colors.border }}>
              <Ionicons name="book-outline" size={10} color={colors.textMuted} />
              <Text style={{ fontSize: 9, fontWeight: '600', color: colors.textMuted, letterSpacing: 0.5 }}>EBOOK</Text>
            </View>
          )}
          {(series as any).libraryName && (
            <Text style={[styles.library, { color: colors.textMuted, fontSize: Typography.xs }]} numberOfLines={1}>{(series as any).libraryName}</Text>
          )}
        </View>
        <Text style={[styles.titleLarge, { color: colors.textPrimary }]} numberOfLines={2}>{seriesTitle}</Text>
        {progress > 0 && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressTrack, { backgroundColor: colors.progressTrack }]}>
              <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%`, backgroundColor: colors.accent }]} />
            </View>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>{Math.round(progress)}%</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  cardFallback: { flex: 1 },
  coverContainer: {
    borderRadius: Radius.sm,
    overflow: 'hidden',
    aspectRatio: 0.67,
    marginBottom: Spacing.xs,
  },
  cover: { width: '100%', height: '100%' },
  formatBadge: {
    position: 'absolute', top: 5, left: 5,
    borderRadius: Radius.sm,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  formatText: {
    fontSize: 9, fontWeight: Typography.bold, letterSpacing: 0.5,
  },
  progressBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 3,
  },
  progressFill: { height: '100%' },
  completedBadge: {
    position: 'absolute', top: 5, right: 5,
    width: 20, height: 20,
    borderRadius: Radius.full,
    justifyContent: 'center', alignItems: 'center',
  },
  completedText: { fontSize: 10, fontWeight: Typography.bold },
  title: { fontSize: Typography.xs, lineHeight: 16 },
  // Hover overlay styles - web only
  hoverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    transition: 'opacity 0.2s ease',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderRadius: Radius.sm,
  } as any,
  titlePopup: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    width: '100%',
  },
  titlePopupText: {
    fontSize: Typography.xs,
    fontWeight: Typography.medium,
    lineHeight: 15,
  },
  // Large card
  cardLarge: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  coverLarge: { width: 70, height: 100 },
  infoLarge: {
    flex: 1, padding: Spacing.md,
    justifyContent: 'center', gap: 4,
  },
  titleLarge: {
    fontSize: Typography.base, fontWeight: Typography.semibold,
  },
  library: { fontSize: Typography.sm },
  progressContainer: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.sm, marginTop: 4,
  },
  progressTrack: {
    flex: 1, height: 4,
    borderRadius: Radius.full, overflow: 'hidden',
  },
  progressText: { fontSize: Typography.xs },
  // Web hover effect - applied via className
  webHover: {} as any,
});
