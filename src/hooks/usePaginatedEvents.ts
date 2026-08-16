import { useEffect, useMemo, useState } from 'react';
import { BackendEvent, useGetEventsQuery } from '../store/services/eventsApi';

const PAGE_SIZE = 20;

// Loads events one page at a time (server-side pagination via GET /events?page=&limit=)
// and accumulates them locally as the caller scrolls, instead of fetching everything
// (or a large fixed limit) up front. Filters resetting (category/online) restarts from page 1.
export interface PaginatedEventFilters {
  categoryId?: string;
  isOnline?: boolean;
  search?: string;
  priceMin?: number;
  priceMax?: number;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'eventDate' | 'newest';
}

export function usePaginatedEvents(filters: PaginatedEventFilters = {}) {
  const [page, setPage] = useState(1);
  // Pages are stored keyed by page number rather than appended to a flat array. `getEvents`
  // invalidates under a single shared 'Event' tag (see eventsApi.ts), so creating, editing,
  // or deleting *any* event anywhere in the app causes RTK Query to silently background-
  // refetch whichever page is currently subscribed here. With a flat append-only array that
  // refetch's result got appended a second time on top of the original, duplicating every
  // item on the current page. Keying by page number makes a refetch of an already-loaded
  // page replace that page's slice instead.
  const [pagesById, setPagesById] = useState<Map<number, BackendEvent[]>>(new Map());
  const [hasMore, setHasMore] = useState(true);

  // `currentData`, NOT `data`. RTK Query deliberately keeps `data` pointing at the last
  // successful result even after the hook's arguments change, so during the gap between a
  // new search/page being requested and its response landing, `data` still holds the
  // PREVIOUS query's events. Filing those under the new `page` key is what produced
  // duplicate ids in the list: the same stale array got written under two page numbers as
  // `page` reset from N back to 1, so every event rendered twice and FlatList warned about
  // duplicate keys. `currentData` is undefined until the current arguments have their own
  // result, which is exactly the guarantee this needs.
  const { currentData, isFetching, isError, refetch } = useGetEventsQuery({
    categoryId: filters.categoryId,
    isOnline: filters.isOnline,
    search: filters.search,
    priceMin: filters.priceMin,
    priceMax: filters.priceMax,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    sortBy: filters.sortBy,
    page,
    limit: PAGE_SIZE,
  });

  // Filters changed — start over from page 1 rather than appending onto a differently-filtered list.
  useEffect(() => {
    setPage(1);
    setPagesById(new Map());
    setHasMore(true);
  }, [filters.categoryId, filters.isOnline, filters.search, filters.priceMin, filters.priceMax, filters.dateFrom, filters.dateTo, filters.sortBy]);

  useEffect(() => {
    if (!currentData) return;
    setHasMore(currentData.length === PAGE_SIZE);
    setPagesById((prev) => {
      if (prev.get(page) === currentData) return prev; // identical reference — nothing changed
      const next = new Map(prev);
      next.set(page, currentData);
      return next;
    });
  }, [currentData, page]);

  const events = useMemo(() => {
    const ordered = [...pagesById.keys()].sort((a, b) => a - b).flatMap((p) => pagesById.get(p)!);
    // Deduped by id as well. Pages are fetched at separate moments against a live list, so
    // an event created — or simply reordered — between two page requests genuinely appears
    // in both, and one duplicate id is enough to break FlatList's keying for the whole list.
    return [...new Map(ordered.map((event) => [event.id, event])).values()];
  }, [pagesById]);

  const loadMore = () => {
    if (!isFetching && hasMore) setPage((p) => p + 1);
  };

  return {
    events,
    loadMore,
    isLoading: isFetching && pagesById.size === 0,
    isFetchingMore: isFetching && page > 1,
    // Drives a RefreshControl's spinner. Deliberately `isFetching` (not `isLoading`, which
    // is only ever true on the very first cache-empty load) and scoped to page 1, so it
    // reflects a pull-to-refresh rather than an infinite-scroll page append.
    isRefreshing: isFetching && page === 1,
    isError,
    // Deliberately does not rely on the [currentData, page] effect above to repopulate
    // pagesById: RTK Query's default structural sharing keeps the *same* result reference
    // across a refetch whenever the response is content-identical to what's already cached
    // (the common case — a pull-to-refresh usually returns the same events back). That effect
    // is keyed on that reference, so when it doesn't change, it never re-fires, and
    // the empty Map set below would then stick forever — a pull-to-refresh that looked like
    // it wiped the list and never brought it back. Awaiting the refetch's own settled result
    // and writing it into state directly sidesteps that reference check entirely.
    refetch: async () => {
      setPage(1);
      setPagesById(new Map());
      const result = await refetch();
      setPagesById(result.data ? new Map([[1, result.data]]) : new Map());
    },
  };
}
