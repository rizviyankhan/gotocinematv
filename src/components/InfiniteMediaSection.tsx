import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Film, 
  Tv, 
  Sparkles, 
  Loader2, 
  ChevronDown, 
  Flame, 
  Layers
} from 'lucide-react';
import { TMDBMedia } from '../types';
import { tmdbService } from '../services/tmdb';
import { MediaCard } from './MediaCard';

interface InfiniteMediaSectionProps {
  category: 'movie' | 'tv' | 'anime';
  onSelectMedia: (media: TMDBMedia) => void;
}

interface GenreOption {
  id: string;
  label: string;
}

const MOVIE_GENRES: GenreOption[] = [
  { id: '', label: 'All Movies' },
  { id: '28', label: 'Action' },
  { id: '878', label: 'Sci-Fi' },
  { id: '27', label: 'Horror' },
  { id: '53', label: 'Thriller' },
  { id: '35', label: 'Comedy' },
  { id: '16', label: 'Animation' },
  { id: '14', label: 'Fantasy' },
  { id: '80', label: 'Crime' },
  { id: '10749', label: 'Romance' },
  { id: '12', label: 'Adventure' },
  { id: '9648', label: 'Mystery' }
];

const TV_GENRES: GenreOption[] = [
  { id: '', label: 'All TV Series' },
  { id: '10759', label: 'Action & Adventure' },
  { id: '10765', label: 'Sci-Fi & Fantasy' },
  { id: '9648', label: 'Mystery & Crime' },
  { id: '35', label: 'Comedy' },
  { id: '18', label: 'Drama' },
  { id: '80', label: 'Crime' },
  { id: '99', label: 'Documentary' },
  { id: '10764', label: 'Reality' }
];

const ANIME_GENRES: GenreOption[] = [
  { id: '', label: 'All Anime' },
  { id: '10759', label: 'Action & Battles' },
  { id: '10765', label: 'Fantasy & Supernatural' },
  { id: 'movies', label: 'Anime Movies' },
  { id: '35', label: 'Comedy & Slice of Life' },
  { id: '878', label: 'Sci-Fi & Mecha' },
  { id: '18', label: 'Drama & Romance' }
];

export const InfiniteMediaSection: React.FC<InfiniteMediaSectionProps> = ({
  category,
  onSelectMedia
}) => {
  const [items, setItems] = useState<TMDBMedia[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(500);
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const isFetchingRef = useRef<boolean>(false);

  const genres = category === 'movie' 
    ? MOVIE_GENRES 
    : category === 'tv' 
    ? TV_GENRES 
    : ANIME_GENRES;

  // Title configuration based on category
  const sectionMeta = {
    movie: {
      title: 'Infinite Movie Explorer',
      subtitle: 'Continuous scroll catalog with thousands of cinema movies',
      icon: Film,
      badge: 'Movies'
    },
    tv: {
      title: 'Infinite TV Shows Explorer',
      subtitle: 'Continuous scroll catalog with all seasons & episodes',
      icon: Tv,
      badge: 'TV Series'
    },
    anime: {
      title: 'Infinite Anime Vault',
      subtitle: 'Continuous stream of subbed & dubbed anime series and movies',
      icon: Flame,
      badge: 'Anime'
    }
  }[category];

  const Icon = sectionMeta.icon;

  // Initial load or when category/genre changes
  useEffect(() => {
    let active = true;
    setInitialLoading(true);
    setError(null);
    setPage(1);
    setItems([]);
    isFetchingRef.current = true;

    const fetchFirstPage = async () => {
      try {
        let res: { results: TMDBMedia[]; totalPages: number };
        if (category === 'movie') {
          res = await tmdbService.getInfiniteMovies(1, selectedGenre);
        } else if (category === 'tv') {
          res = await tmdbService.getInfiniteTV(1, selectedGenre);
        } else {
          res = await tmdbService.getInfiniteAnime(1, selectedGenre);
        }

        if (!active) return;
        setItems(res.results);
        setTotalPages(res.totalPages);
      } catch (err) {
        if (!active) return;
        console.error('Failed to load initial infinite items:', err);
        setError('Failed to load content. Please try again.');
      } finally {
        if (active) {
          setInitialLoading(false);
          isFetchingRef.current = false;
        }
      }
    };

    fetchFirstPage();

    return () => {
      active = false;
      isFetchingRef.current = false;
    };
  }, [category, selectedGenre]);

  // Load next page function
  const loadNextPage = useCallback(async () => {
    if (isFetchingRef.current || loadingMore || page >= totalPages) return;

    isFetchingRef.current = true;
    setLoadingMore(true);
    const nextPage = page + 1;

    try {
      let res: { results: TMDBMedia[]; totalPages: number };
      if (category === 'movie') {
        res = await tmdbService.getInfiniteMovies(nextPage, selectedGenre);
      } else if (category === 'tv') {
        res = await tmdbService.getInfiniteTV(nextPage, selectedGenre);
      } else {
        res = await tmdbService.getInfiniteAnime(nextPage, selectedGenre);
      }

      setItems((prev) => {
        // Filter out duplicate IDs if any
        const existingIds = new Set(prev.map((i) => i.id));
        const fresh = res.results.filter((i) => !existingIds.has(i.id));
        return [...prev, ...fresh];
      });
      setPage(nextPage);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error(`Failed to load page ${nextPage}:`, err);
    } finally {
      setLoadingMore(false);
      isFetchingRef.current = false;
    }
  }, [category, selectedGenre, page, totalPages, loadingMore]);

  // Auto Infinite Scroll with IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && !isFetchingRef.current && !initialLoading) {
          loadNextPage();
        }
      },
      {
        root: null,
        rootMargin: '400px', // Pre-fetch 400px before user reaches the bottom
        threshold: 0.1
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [loadNextPage, initialLoading]);

  // Fallback scroll listener
  useEffect(() => {
    const handleWindowScroll = () => {
      if (isFetchingRef.current || initialLoading || loadingMore) return;

      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const clientHeight = window.innerHeight;

      if (scrollTop + clientHeight >= scrollHeight - 600) {
        loadNextPage();
      }
    };

    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleWindowScroll);
  }, [loadNextPage, initialLoading, loadingMore]);

  return (
    <section className="my-10 sm:my-14 tv-safe-area" aria-label="Infinite Media Catalog">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
              Infinite Stream
            </span>
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-slate-300 text-[11px] font-semibold">
              {items.length > 0 ? `${items.length}+ Loaded` : 'Live'}
            </span>
          </div>
          <h2 className="font-heading text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            {sectionMeta.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {sectionMeta.subtitle} • Scroll down continuously to discover more
          </p>
        </div>

        {/* Info stats badge */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Layers className="w-4 h-4 text-sky-400" />
          <span>Page {page} of {totalPages}</span>
        </div>
      </div>

      {/* Genre Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-6">
        {genres.map((g) => {
          const isSelected = selectedGenre === g.id;
          return (
            <button
              key={g.id || 'all'}
              onClick={() => setSelectedGenre(g.id)}
              className={`tv-focusable px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30 ring-1 ring-sky-300'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
              }`}
            >
              {g.label}
            </button>
          );
        })}
      </div>

      {/* Media Grid */}
      {initialLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
          <p className="text-sm font-semibold text-slate-300">
            Loading {sectionMeta.badge} catalog...
          </p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-3">
          <p className="text-rose-400 text-sm font-semibold">{error}</p>
          <button
            onClick={() => setSelectedGenre(selectedGenre)}
            className="tv-focusable px-4 py-2 rounded-xl bg-sky-500 text-white text-xs font-bold"
          >
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center bg-white/5 rounded-2xl text-slate-400">
          <p>No titles found for this filter. Try selecting another genre.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
          {items.map((media, idx) => (
            <MediaCard
              key={`inf-${media.id}-${idx}`}
              media={media}
              onSelect={onSelectMedia}
              index={idx}
              rowId={`infinite-${category}`}
              isGrid={true}
            />
          ))}
        </div>
      )}

      {/* Sentinel Element & Loading More Indicator */}
      <div
        ref={sentinelRef}
        className="w-full py-10 flex flex-col items-center justify-center gap-3 mt-4"
      >
        {loadingMore ? (
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-900/90 border border-sky-500/30 text-sky-400 shadow-xl backdrop-blur-md">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-xs sm:text-sm font-semibold text-slate-200">
              Loading more {sectionMeta.badge} from TMDB (Page {page + 1})...
            </span>
          </div>
        ) : page < totalPages && !initialLoading ? (
          <button
            onClick={loadNextPage}
            className="tv-focusable flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/25 text-white border border-white/15 text-xs sm:text-sm font-bold shadow-lg transition-all cursor-pointer group"
          >
            <ChevronDown className="w-4 h-4 text-sky-400 group-hover:translate-y-0.5 transition-transform" />
            <span>Load More {sectionMeta.badge} (Page {page + 1})</span>
          </button>
        ) : null}

        {page >= totalPages && items.length > 0 && (
          <p className="text-xs text-slate-500 font-medium">
            You have reached the end of the catalog ({items.length} titles loaded).
          </p>
        )}
      </div>
    </section>
  );
};
