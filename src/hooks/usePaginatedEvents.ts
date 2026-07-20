import { useEffect, useRef, useState } from 'react';
import { BackendEvent, useGetEventsQuery } from '../store/services/eventsApi';

const PAGE_SIZE = 20;

// Loads events one page at a time (server-side pagination via GET /events?page=&limit=)
// and accumulates them locally as the caller scrolls, instead of fetching everything
// (or a large fixed limit) up front. Filters resetting (category/online) restarts from page 1.
export function usePaginatedEvents(filters: { categoryId?: string; isOnline?: boolean; search?: string } = {}) {
  const [page, setPage] = useState(1);
  const [events, setEvents] = useState<BackendEvent[]>([]);
  const hasMoreRef = useRef(true);

  const { data, isFetching, isError, refetch } = useGetEventsQuery({
    categoryId: filters.categoryId,
    isOnline: filters.isOnline,
    search: filters.search,
    page,
    limit: PAGE_SIZE,
  });

  // Filters changed — start over from page 1 rather than appending onto a differently-filtered list.
  useEffect(() => {
    setPage(1);
    setEvents([]);
    hasMoreRef.current = true;
  }, [filters.categoryId, filters.isOnline, filters.search]);

  useEffect(() => {
    if (!data) return;
    hasMoreRef.current = data.length === PAGE_SIZE;
    setEvents((prev) => (page === 1 ? data : [...prev, ...data]));
  }, [data, page]);

  const loadMore = () => {
    if (!isFetching && hasMoreRef.current) setPage((p) => p + 1);
  };

  return {
    events,
    loadMore,
    isLoading: isFetching && page === 1,
    isFetchingMore: isFetching && page > 1,
    isError,
    refetch: () => {
      setPage(1);
      setEvents([]);
      refetch();
    },
  };
}
