import { kavitaAPI } from './kavitaAPI';
import { 
  LibraryProvider, 
  LibrarySeriesDetail, 
  LibraryGenre, 
  LibraryTag, 
  LibraryCollection,
  LibraryVolume,
  LibraryChapter,
  LibraryItemParams,
  LibraryCover,
  LibraryItem,
  Library
} from './LibraryProvider';

export class KavitaProvider implements LibraryProvider {
  async initialize(): Promise<void> {
    await kavitaAPI.initialize();
  }

  async isAuthenticated(): Promise<boolean> {
    return kavitaAPI.isAuthenticated();
  }

  async getLibraries(): Promise<Library[]> {
    const libs = await kavitaAPI.getLibraries();
    return libs.map(l => ({
      id: l.id,
      name: l.name,
      type: l.type
    }));
  }

  async getLibraryItems(params?: LibraryItemParams): Promise<LibraryItem[]> {
    let series: any[] = [];
    const page = params?.page || 0;
    const pageSize = params?.pageSize || 30;

    if (params?.genreId) {
      series = await kavitaAPI.getSeriesByGenre(Number(params.genreId), page, pageSize);
    } else if (params?.tagId) {
      series = await kavitaAPI.getSeriesByTag(Number(params.tagId), page, pageSize);
    } else if (params?.libraryId) {
      series = await kavitaAPI.getSeriesForLibrary(Number(params.libraryId), page, pageSize);
    } else {
      series = await kavitaAPI.getAllSeries(page, pageSize);
    }

    return series.map(s => ({
      id: s.id,
      title: s.name,
      coverImage: String(s.id),
      mediaType: 'book',
      progress: s.pagesRead / (s.pages || 1),
      author: s.server, // Kavita Series doesn't have author at top level easily
      provider: 'kavita'
    }));
  }

  async search(query: string): Promise<LibraryItem[]> {
    const results = await kavitaAPI.search(query);
    return (results.series || []).map((s: any) => ({
      id: s.id,
      title: s.name,
      coverImage: String(s.id),
      mediaType: 'book',
      author: s.authorName,
      provider: 'kavita'
    }));
  }

  async getSeriesDetail(id: string | number): Promise<LibrarySeriesDetail> {
    const seriesId = typeof id === 'string' ? parseInt(id, 10) : id;
    const [detail, meta] = await Promise.all([
      kavitaAPI.getSeriesDetail(seriesId),
      kavitaAPI.getSeriesMetadata(seriesId)
    ]);
    
    return {
      id: seriesId,
      name: detail.name || '',
      localizedName: detail.localizedName,
      description: meta?.summary || detail.summary,
      summary: meta?.summary || detail.summary,
      coverImage: detail.coverImage,
      authorName: meta?.writers?.map(w => w.name).join(', ') || '',
      mediaType: 'book',
      libraryId: detail.libraryId,
      genres: (meta?.genres || []).map(g => ({ id: g.id, title: g.title })),
      tags: (meta?.tags || []).map(t => ({ id: t.id, title: t.title })),
      volumes: (Array.isArray(detail.volumes) ? detail.volumes : []).map(v => ({
        id: v.id,
        number: v.number,
        name: v.name,
        pages: v.pages,
        pagesRead: v.pagesRead,
        coverImage: v.coverImage,
        chapters: (Array.isArray(v.chapters) ? v.chapters : []).map(c => ({
          id: c.id,
          number: c.number,
          title: c.title,
          pages: c.pages,
          pagesRead: c.pagesRead,
          coverImage: c.coverImage,
          volumeId: v.id,
          format: c.files?.[0]?.format ?? 0
        }))
      }))
    };
  }

  async updateSeriesMetadata(metadata: Partial<LibrarySeriesDetail>): Promise<void> {
    // We need to fetch the existing metadata first to merge, 
    // because Kavita's update endpoint expects a full SeriesMetadata object
    if (!metadata.id) return;
    const seriesId = Number(metadata.id);
    const [existing, seriesDetail] = await Promise.all([
      kavitaAPI.getSeriesMetadata(seriesId),
      kavitaAPI.getSeriesDetail(seriesId)
    ]);
    if (!existing || !seriesDetail) return;

    // 1. Update series name if changed
    if (metadata.name && metadata.name !== seriesDetail.name) {
      await kavitaAPI.updateSeries({ id: seriesId, name: metadata.name, localizedName: metadata.localizedName || metadata.name });
    }

    // 2. Update metadata (summary, genres, tags, writers)
    const updated = {
      ...existing,
      summary: metadata.summary ?? existing.summary,
      // Map genres/tags if they were provided
      genres: metadata.genres ? metadata.genres.map(g => ({ id: Number(g.id), title: g.title })) : existing.genres,
      tags: metadata.tags ? metadata.tags.map(t => ({ id: Number(t.id), title: t.title })) : existing.tags,
      // Update writers (author) if provided
      writers: metadata.authorName !== undefined
        ? metadata.authorName.split(',').map(name => ({ id: 0, name: name.trim() })).filter(w => w.name)
        : existing.writers,
    };

    await kavitaAPI.updateSeriesMetadata(updated);
  }

  async getSeriesCovers(id: string | number): Promise<LibraryCover[]> {
    const seriesId = typeof id === 'string' ? parseInt(id, 10) : id;
    // For now, just return the current one as we don't have a list from Kavita yet
    return [{ url: kavitaAPI.getSeriesCoverUrl(seriesId), id: 'current' }];
  }

  async updateSeriesCover(id: string | number, coverUrl: string): Promise<void> {
    const seriesId = typeof id === 'string' ? parseInt(id, 10) : id;
    if (coverUrl.startsWith('http')) {
      await kavitaAPI.uploadSeriesCoverFromUrl(seriesId, coverUrl);
    } else {
      await kavitaAPI.uploadSeriesCover(seriesId, coverUrl);
    }
  }

  async getGenres(): Promise<LibraryGenre[]> {
    const genres = await kavitaAPI.getGenres();
    return genres.map(g => ({ id: g.id, title: g.title }));
  }

  async getTags(): Promise<LibraryTag[]> {
    const tags = await kavitaAPI.getTags();
    return tags.map(t => ({ id: t.id, title: t.title }));
  }

  async getCollections(): Promise<LibraryCollection[]> {
    const colls = await kavitaAPI.getCollections();
    return colls.map(c => ({ id: c.id, title: c.title, summary: c.summary, coverImage: c.coverImage }));
  }

  async addSeriesToCollection(collectionId: number | string, seriesId: number | string): Promise<void> {
    const cid = typeof collectionId === 'string' ? parseInt(collectionId, 10) : Number(collectionId);
    const sid = typeof seriesId === 'string' ? parseInt(seriesId, 10) : Number(seriesId);
    await kavitaAPI.addSeriesToCollection(cid, sid);
  }

  async removeSeriesFromCollection(collectionId: number | string, seriesId: number | string): Promise<void> {
    const sid = typeof seriesId === 'string' ? parseInt(seriesId, 10) : Number(seriesId);
    const colls = await kavitaAPI.getCollections();
    const collection = colls.find(c => c.id === (typeof collectionId === 'string' ? parseInt(collectionId, 10) : collectionId));
    if (collection) {
      await kavitaAPI.removeSeriesFromCollection(collection, sid);
    }
  }

  async getSeriesInCollection(collectionId: number | string): Promise<{ id: number | string }[]> {
    const cid = typeof collectionId === 'string' ? parseInt(collectionId, 10) : Number(collectionId);
    const series = await kavitaAPI.getSeriesForCollection(cid);
    return series.map(s => ({ id: s.id }));
  }

  getCoverUrl(id: string | number, bustCache?: boolean): string {
    const seriesId = typeof id === 'string' ? parseInt(id, 10) : id;
    // Only bust cache when explicitly requested (e.g., after cover upload)
    return kavitaAPI.getSeriesCoverUrl(seriesId, bustCache);
  }
}

export const kavitaProvider = new KavitaProvider();
