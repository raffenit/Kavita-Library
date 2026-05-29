# Folio Component Structure

> **Purpose**: Human-curated documentation of our **understood/intended** codebase structure.
> 
> **How to use**: Compare against `STRUCTURE_AUTO.md` (the actual state) to verify they match.
> If discrepancies exist, update this file to reflect reality OR refactor code to match intent.

---

Quick reference for component organization and key code sections.

## App Routes

### app/(tabs)/audiobooks.tsx
Main audiobookshelf library view.

**Helper Components:**
- `FilterRow` (line ~26): Filter chips with gradient label
  - Uses `GradientChip` for items
  - Props: label, items[], selectedId, onSelect
  
- `FilterRowNoLabel` (line ~95): Filter chips without label
  - Props: items[], selectedId, onSelect, onChipContextMenu?
  
- `CompactFilterRow` (line ~128): Condensed filter row for 2-column layout
  - Shows only first 5 items + count
  
- `GradientChip` (line ~177): Gradient-styled chip button
  - Web: Uses CSS gradients with rainbow colors
  - Native: Solid colors with border
  - **Hardcoded colors:** TODO - uses #8B6DB8 and #A85A95 in gradients
  
- `formatDuration` (line ~263): Utility to format seconds as "Xh Ym"

**Main Component Sections:**
- State management: libraries, genres, authors, tags, collections, filters
- `useGridColumns` hook: Responsive column calculation
- Continue Listening section (horizontal scroll)
- Filter tabs: Library, Genre, Author, Tag, Collection
- Main grid with `AudiobookCard` components

**Imports:**
- `ContinueListeningCard` from `../../components/ContinueListeningCard`
- `AudiobookCard` from `../../components/AudiobookCard`
- `TabHeader` from `../../components/TabHeader`

---

## Components

### components/ContinueListeningCard.tsx
Horizontal card for "Continue Listening" section.

**Props:**
- `item`: LibraryItem
- `onPress`: () => void
- `onPlay`: () => void  
- `isPlaying`: boolean

**Features:**
- Cover image with progress bar overlay
- Gradient overlay (bottom of cover)
- Play/pause button
- Title, author, progress percentage

**Theme Colors Used:**
- `colors.surface` - card background
- `colors.overlay` - progress bar bg, gradient overlay, play button
- `colors.accent` - progress fill, play icon
- `colors.textPrimary`, `colors.textMuted` - text colors

---

### components/AudiobookCard.tsx
Grid card for audiobook library items.

**Props:**
- `item`: LibraryItem
- `onPress`: () => void
- `onPlay`: () => void
- `isPlaying`: boolean
- `cardWidth`: number
- `onContextMenu?`: (itemId, itemTitle, x, y) => void

**Features:**
- Cover image
- Progress bar (if started but not complete)
- Play/pause button overlay
- Context menu support (web right-click, native long-press)
- Card ref for context menu positioning

**Theme Colors Used:**
- `colors.surface` - card background
- `colors.border` - card border
- `colors.overlay` - progress bar bg, play button
- `colors.accent` - progress fill, play icon
- `colors.textPrimary`, `colors.textSecondary` - text colors

---

### components/SeriesCard.tsx
Cards for series/manga display.

**Components:**
- `SeriesCard` (line ~15): Grid card with cover, progress, completion badge
  - Props: series, onPress, onContextMenu?, cardWidth?, style?
  - Features: Format badge, progress bar, completion checkmark
  
- `SeriesCardLarge` (line ~114): Horizontal card variant
  - Props: series, onPress, onContextMenu?
  - Features: AUDIOBOOK/EBOOK badge, library name, progress bar

**Theme Colors Used:**
- `colors.surface`, `colors.overlay` - backgrounds
- `colors.accent`, `colors.success` - badges, progress
- `colors.textPrimary`, `colors.textSecondary`, `colors.textMuted` - text
- `colors.progressTrack`, `colors.progressBar` - progress indicators

---

## Theme

### constants/theme.ts

**Key Exports:**
- `ColorScheme` interface - all theme color definitions
- `themes` object - Midnight, Amoled, Sepia, Ocean, Forest, Starry, Custom
- `lightThemes` - Light variants of each theme
- `getRainbowGradient(colors, angle)` - Generates gradient for chips/tabs

**TODO:**
- `getRainbowGradient` uses hardcoded #8B6DB8 (purple) and #A85A95 (pink)
- Should derive these from accent color via hue rotation

---

## Filter Components

### components/FilterComponents.tsx
Shared filter UI components.

**Components:**
- `GradientChip` (line ~20): Gradient-styled chip
  - **DUPLICATE:** Also defined in audiobooks.tsx - consider consolidating
- `FilterRow` (line ~66): Filter with label
  - **DUPLICATE:** Similar component in audiobooks.tsx
- `FilterRowNoLabel` (line ~158): Filter without label
  - Generic version with type parameter
- `FilterTab` (line ~209): Tab button with gradient active state
- `CompactFilterRow` (line ~251): Condensed horizontal filter row

---

### components/FolioLogo.tsx
Custom themed logo component.

**Props:** size, color, style

---

### components/LibrarySelector.tsx
Library dropdown selector for switching between Kavita/Audiobookshelf libraries.

**Props:** onSelect, selectedId, provider?

---

### components/MarkdownText.tsx
Markdown rendering component for descriptions/metadata.

**Props:** content, style, numberOfLines?

---

### components/MiniPlayer.tsx
Bottom mini player bar for audiobook playback.

- Shows current track, play/pause, progress
- Expands to full player on tap

---

### components/PWAInstallBanner.tsx
PWA install prompt banner.

- Shows when PWA can be installed
- Dismissible with local storage persistence

---

### components/ProfileSelector.tsx
User profile switcher for multiple users.

**Props:** onSelectProfile, onAddProfile

---

### components/SeriesCard.tsx
Cards for series/manga display.

**Components:**
- `SeriesCard` (line ~53): Grid card with cover, progress, completion badge
  - Props: series, onPress, onContextMenu?, cardWidth?, style?
  - Features: Format badge, progress bar, completion checkmark
  
- `SeriesCardLarge` (line ~114): Horizontal card variant
  - Props: series, onPress, onContextMenu?
  - Features: AUDIOBOOK/EBOOK badge, library name, progress bar

- `useGridColumns` (line ~21): Hook for responsive grid columns
  - **NOTE:** audiobooks.tsx defines its own version internally

**Theme Colors Used:**
- `colors.surface`, `colors.overlay` - backgrounds
- `colors.accent`, `colors.success` - badges, progress
- `colors.textPrimary`, `colors.textSecondary`, `colors.textMuted` - text
- `colors.progressTrack`, `colors.progressBar` - progress indicators

---

### components/StarfieldBackground.tsx
Animated starfield background for "starry" theme.

- Canvas-based animation
- Theme-aware star colors

---

### components/StatsDashboard.tsx
Reading/listening statistics dashboard.

- Shows charts, progress, trends
- Provider-specific stats aggregation

---

## Modals

### components/modals/CoverPickerModal.tsx
Cover image picker with URL/upload options.

### components/modals/EditMetadataModal.tsx
Metadata editing form for series/items.

### components/modals/MetadataSearchModal.tsx
Search external providers (Google Books, Audible, OpenLibrary) for metadata.

### components/modals/modalStyles.ts
Shared modal styling utilities.

- `makeStyles(colors)` - Creates consistent modal styles

---

## Contexts

### contexts/AudioPlayerContext.tsx
Global audio player state management.

- `AudioPlayerProvider`: Wraps app with player state
- `useAudioPlayer()`: Hook to access player controls

### contexts/AuthContext.tsx
Authentication state for Kavita/Audiobookshelf.

- `AuthProvider`: Manages login sessions
- `useAuth()`: Hook for auth state and login/logout

### contexts/ProfileContext.tsx
User profile management.

- `ProfileProvider`: Profile state and persistence
- `useProfile()`: Hook for current profile, switching, creation

### contexts/ThemeContext.tsx
Theme state and switching.

- `ThemeProvider`: Theme state and persistence
- `useTheme()`: Hook for colors, theme name, switching

---

## Hooks

### hooks/useLibraryItem.ts
Fetch library item details by ID.

- `useLibraryItem(id, type)`: Returns item data, loading state

### hooks/usePWAInstall.ts
PWA install prompt detection.

- `usePWAInstall()`: Returns install prompt event, install function

### hooks/useSeriesContextMenu.ts
Series context menu state management.

- `useSeriesContextMenu()`: Returns menu state, show/hide functions

---

## Services

### services/AudibleSearchProvider.ts
Audible metadata search.

- `audibleSearchProvider.search(query)`

### services/audiobookshelfAPI.ts
Audiobookshelf API client.

- `absAPI`: Singleton instance
- Methods: login, libraries, items, progress, playback

### services/AudiobookshelfProvider.ts
Audiobookshelf data provider implementation.

- `audiobookshelfProvider`: LibraryProvider implementation

### services/backup.ts
Backup/export utilities.

- `downloadBackupFile(content, filename)`

### services/GoogleBooksSearchProvider.ts
Google Books metadata search.

- `googleBooksSearchProvider.search(query)`

### services/kavitaAPI.ts
Kavita API client and utilities.

- `kavitaAPI`: Singleton instance
- `pickBestFile(files)`: Select optimal format
- `chapterEffectiveFormat(chapter)`: Determine format

### services/KavitaProvider.ts
Kavita data provider implementation.

- `kavitaProvider`: LibraryProvider implementation

### services/LibraryFactory.ts
Provider factory for switching between Kavita/Audiobookshelf.

### services/LibraryProvider.ts
Base interface for library providers.

### services/OpenLibrarySearchProvider.ts
OpenLibrary metadata search.

- `openLibrarySearchProvider.search(query)`

### services/serverDiscovery.ts
Server discovery utilities.

- `getLikelySubnet()`: Returns probable local subnets

### services/stats.ts
Statistics calculation and formatting.

- `formatDuration(minutes)`: Format as "Xh Ym"
- `getDayName(day)`, `getMonthName(month)`: Date helpers

---

## App Routes (Additional)

### app/(tabs)/audiobook/[id].tsx
Individual audiobook detail page.

- `SeekBar`: Custom audio position scrubber with chapter markers

### app/(tabs)/series/[id].tsx
Series detail page with volumes/chapters.

- `flatChapters(volumes)`: Flattens volume structure to chapter list

---

## Known Duplicates & Consolidation Opportunities

### Resolved ✅

| Component | Location 1 | Location 2 | Resolution |
|-----------|-----------|-----------|--------|
| GradientChip | audiobooks.tsx | FilterComponents.tsx | Consolidated to FilterComponents ✅ |
| FilterRow | audiobooks.tsx | FilterComponents.tsx | Consolidated to FilterComponents ✅ |
| FilterRowNoLabel | audiobooks.tsx | FilterComponents.tsx | Consolidated to FilterComponents ✅ |
| useGridColumns | SeriesCard.tsx | audiobooks.tsx | Extracted to `hooks/useGridColumns.ts` ✅ |

### Current (as of last update)

None - all identified duplicates have been consolidated.

---

## Build Notes

### Generated Structure
Run this to auto-extract component signatures:
```bash
grep -rn "^export function\|^function\|^export const.*=.*(" app/ components/ --include="*.tsx" --include="*.ts" | head -50
```

### Manual Updates Required
When adding new components, update this file with:
1. File path
2. Component names and line numbers
3. Key props
4. Theme colors used
5. Any TODOs or hardcoded colors
