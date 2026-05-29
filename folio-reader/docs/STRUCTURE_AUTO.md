# Folio Auto-Generated Structure

> **Purpose**: Auto-generated export analysis of the **actual current** codebase state.
>
> **How to use**: This file is generated automatically by analyzing `export` statements.
> Compare against `STRUCTURE.md` (our understanding/intent) to verify they match.
> If exports appear here but not in STRUCTURE.md, either update docs or remove dead code.

---

## Generated Export List

app/(tabs)/audiobook/[id].tsx:34:export function SeekBar({ current, duration, onSeek, tracks }: {
app/(tabs)/series/[id].tsx:35:export function flatChapters(volumes: LibraryVolume[]) {
components/AudiobookCard.tsx:18:export function AudiobookCard({ item, onPress, onPlay, isPlaying, cardWidth, onContextMenu }: AudiobookCardProps) {
components/ContinueListeningCard.tsx:16:export function ContinueListeningCard({ item, onPress, onPlay, isPlaying }: ContinueListeningCardProps) {
components/FilterComponents.tsx:156:export function FilterRowNoLabel<T extends { id: string | number }>({
components/FilterComponents.tsx:18:export function GradientChip({ label, active, onPress, onContextMenu }: GradientChipProps) {
components/FilterComponents.tsx:207:export function FilterTab({ label, active, onPress, isFirst, isLast }: FilterTabProps) {
components/FilterComponents.tsx:249:export function CompactFilterRow({ label, items, selectedId, onSelect }: CompactFilterRowProps) {
components/FilterComponents.tsx:64:export function FilterRow<T extends { id: string | number }>({
components/FolioLogo.tsx:97:export function FolioLogo({
components/LibrarySelector.tsx:19:export function LibrarySelector({
components/MarkdownText.tsx:16:export function MarkdownText({ content, style, numberOfLines }: MarkdownTextProps) {
components/MiniPlayer.tsx:24:export function MiniPlayer() {
components/modals/CoverPickerModal.tsx:37:export function CoverPickerModal({ 
components/modals/EditMetadataModal.tsx:48:export function EditMetadataModal({ 
components/modals/MetadataSearchModal.tsx:33:export function MetadataSearchModal({ 
components/modals/modalStyles.ts:4:export function makeStyles(c: ColorScheme) {
components/ProfileSelector.tsx:93:export function ProfileSelector({ onSelectProfile, onAddProfile }: ProfileSelectorProps) {
components/PWAInstallBanner.tsx:7:export function PWAInstallBanner() {
components/SeriesCard.tsx:35:export function SeriesCard({ series, onPress, onContextMenu, style, cardWidth }: Props) {
components/SeriesCard.tsx:96:export function SeriesCardLarge({ series, onPress, onContextMenu }: Props) {
components/StarfieldBackground.tsx:164:export function StarfieldBackground() {
components/StatsDashboard.tsx:26:export function StatsDashboard() {
constants/theme.ts:33:export function getRainbowGradient(colors: ColorScheme, angle: number = 135): string {
constants/theme.ts:438:export function resolveTheme(
constants/theme.ts:505:export function getGenreChipColors(name: string): {
contexts/AudioPlayerContext.tsx:38:export const useAudioPlayer = () => {
contexts/AudioPlayerContext.tsx:46:export function AudioPlayerProvider({ children }: { children: ReactNode }) {
contexts/AuthContext.tsx:296:export const useAuth = () => useContext(AuthContext);
contexts/AuthContext.tsx:49:export function AuthProvider({ children }: { children: ReactNode }) {
contexts/ProfileContext.tsx:498:export function useProfile() {
contexts/ProfileContext.tsx:58:export function ProfileProvider({ children }: { children: React.ReactNode }) {
contexts/ThemeContext.tsx:168:export function ThemeProvider({ children }: { children: ReactNode }) {
contexts/ThemeContext.tsx:350:export const useTheme = () => useContext(ThemeContext);
hooks/useGridColumns.ts:7:export function useGridColumns() {
hooks/useLibraryItem.ts:5:export function useLibraryItem(id: string | number, type: 'kavita' | 'abs') {
hooks/usePWAInstall.ts:32:export function usePWAInstall() {
hooks/useSeriesContextMenu.ts:21:export function useSeriesContextMenu() {
services/AudibleSearchProvider.ts:66:export const audibleSearchProvider = new AudibleSearchProvider();
services/audiobookshelfAPI.ts:718:export const absAPI = new AudiobookshelfAPI();
services/AudiobookshelfProvider.ts:233:export const audiobookshelfProvider = new AudiobookshelfProvider();
services/backup.ts:113:export function downloadBackupFile(content: string, filename?: string): void {
services/GoogleBooksSearchProvider.ts:81:export const googleBooksSearchProvider = new GoogleBooksSearchProvider();
services/kavitaAPI.ts:164:export function pickBestFile(files: ChapterFile[]): ChapterFile | undefined {
services/kavitaAPI.ts:170:export function chapterEffectiveFormat(chapter: Chapter): number {
services/kavitaAPI.ts:869:export const kavitaAPI = new KavitaAPI();
services/KavitaProvider.ts:200:export const kavitaProvider = new KavitaProvider();
services/OpenLibrarySearchProvider.ts:55:export const openLibrarySearchProvider = new OpenLibrarySearchProvider();
services/serverDiscovery.ts:264:export function getLikelySubnet(): string[] {
services/stats.ts:558:export function formatDuration(minutes: number): string {
services/stats.ts:571:export function getDayName(day: number): string {
services/stats.ts:577:export function getMonthName(month: number): string {
