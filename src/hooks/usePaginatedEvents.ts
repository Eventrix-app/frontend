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

  const { data, isFetching, isError, refetch } = useGetEventsQuery({
    categoryId: filters.categoryId,
    isOnline: filters.isOnline,
    search: filters.search,
    priceMin: filters.priceMin,
    priceMax: filters.priceMax,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    page,
    limit: PAGE_SIZE,
  });

  // Filters changed — start over from page 1 rather than appending onto a differently-filtered list.
  useEffect(() => {
    setPage(1);
    setPagesById(new Map());
    setHasMore(true);
  }, [filters.categoryId, filters.isOnline, filters.search, filters.priceMin, filters.priceMax, filters.dateFrom, filters.dateTo]);

  useEffect(() => {
    if (!data) return;
    setHasMore(data.length === PAGE_SIZE);
    setPagesById((prev) => {
      if (prev.get(page) === data) return prev; // identical reference — nothing changed
      const next = new Map(prev);
      next.set(page, data);
      return next;
    });
  }, [data, page]);

  const events = useMemo(
    () => [...pagesById.keys()].sort((a, b) => a - b).flatMap((p) => pagesById.get(p)!),
    [pagesById],
  );

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
    refetch: () => {
      setPage(1);
      setPagesById(new Map());
      refetch();
    },
  };
}
