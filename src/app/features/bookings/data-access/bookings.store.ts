import { Injectable, computed, signal, inject, DestroyRef } from '@angular/core';
import { EMPTY } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BookingsApi } from '../../../core/api/bookings.api';
import { Booking } from '../../../core/models/booking.model';

export type BookingFilter = 'ALL' | 'NEW' | 'CONFIRMED';

/** Complete state for bookings feature including UI and data state */
type BookingsState = {
  filter: BookingFilter;
  page: number;
  pageSize: number;
  sortKey: 'SCHEDULED_AT' | 'TOTAL';
  sortDir: 'ASC' | 'DESC';
  query: string;
  serverItems: Booking[]; // Items fetched from API
  localItems: Booking[]; // Items created locally before confirming
  pendingDelete: PendingDelete | null;
  loading: boolean;
  error: string | null;
};

const initialState: BookingsState = {
  filter: 'ALL',
  page: 1,
  pageSize: 10,
  sortKey: 'SCHEDULED_AT',
  sortDir: 'DESC',
  query: '',
  serverItems: [],
  localItems: [],
  pendingDelete: null,
  loading: false,
  error: null,
};

type PendingDelete = {
  booking: Booking;
  timerId: number;
};

// LocalStorage key for persisting UI preferences across sessions
const UI_STATE_KEY = 'cleaning-os.bookings.ui';

/** UI state that persists in localStorage (excludes loading/error states) */
type BookingsUiState = {
  filter: BookingFilter;
  sortKey: 'SCHEDULED_AT' | 'TOTAL';
  sortDir: 'ASC' | 'DESC';
  pageSize: number;
  query: string;
};

/**
 * Centralized store for bookings feature using Angular signals and computed properties.
 * Manages filtering, sorting, pagination, and data fetching.
 */
@Injectable({ providedIn: 'root' })
export class BookingsStore {
  private readonly state = signal<BookingsState>(initialState);
  private readonly destroyRef = inject(DestroyRef);
  
  // Computed properties for pagination
  readonly totalRows = computed(() => this.sortedVisibleItems().length);
  readonly page = computed(() => this.state().page);
  readonly pageSize = computed(() => this.state().pageSize);
  readonly sortKey = computed(() => this.state().sortKey);
  readonly sortDir = computed(() => this.state().sortDir);
  readonly query = computed(() => this.state().query);
  readonly pendingDelete = computed(() => this.state().pendingDelete);

delete(id: string): void {
  const s0 = this.state();
  const wasInServer = s0.serverItems.some((b) => b.id === id);
  const all = [...s0.localItems, ...s0.serverItems];
  const booking = all.find((b) => b.id === id);
  if (!booking) return;

  // Optimistic remove
  this.state.update((s) => ({
    ...s,
    localItems: s.localItems.filter((b) => b.id !== id),
    serverItems: s.serverItems.filter((b) => b.id !== id),
    error: null,
  }));

  // Undo window still works
  const prev = this.state().pendingDelete;
  if (prev) clearTimeout(prev.timerId);

  const timerId = window.setTimeout(() => {
    this.state.update((s) => ({ ...s, pendingDelete: null }));
  }, 5000);

  this.state.update((s) => ({ ...s, pendingDelete: { booking, timerId } }));

  // If it was a server item, simulate server delete
  if (wasInServer) {
    this.api
      .delete(id)
      .pipe(
        catchError((err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Delete failed';

          // rollback
          clearTimeout(timerId);
          this.state.update(() => ({
            ...s0,               // restore previous state fully
            error: msg,          // show error
            pendingDelete: null, // no undo banner since we rolled back
          }));

          return EMPTY;
        })
      )
      .subscribe();
  }
}


undoDelete(): void {
  const pd = this.state().pendingDelete;
  if (!pd) return;

  clearTimeout(pd.timerId);

  // Put it back into localItems (so it survives future refresh/reload logic you may add later)
  this.state.update((s) => ({
    ...s,
    localItems: [pd.booking, ...s.localItems],
    pendingDelete: null,
    page: 1, // optional: keeps UX simple
  }));
}


setQuery(query: string): void {
  this.state.update((s) => ({ ...s, query, page: 1 }));
  this.saveUiState(); // only if you're persisting UI state
}


  constructor(private readonly api: BookingsApi) {
    // Restore UI preferences from localStorage on initialization
    this.loadUiState();
  }

  // ==================== Pagination Methods ====================

  setPage(page: number): void {
    this.state.update((s) => ({ ...s, page }));
  }

  nextPage(): void {
    const totalPages = this.totalPages();
    this.state.update((s) => ({ ...s, page: Math.min(s.page + 1, totalPages) }));
  }

  prevPage(): void {
    this.state.update((s) => ({ ...s, page: Math.max(1, s.page - 1) }));
  }

  readonly totalPages = computed(() => {
    const total = this.sortedVisibleItems().length;
    return Math.max(1, Math.ceil(total / this.state().pageSize));
  });

  /** Returns only items for the current page after applying filter and sort */
  readonly pagedSortedVisibleItems = computed(() => {
    const page = this.state().page;
    const size = this.state().pageSize;
    const start = (page - 1) * size;

    return this.sortedVisibleItems().slice(start, start + size);
  });

  // ==================== Data Access Computeds ====================

  /** Combined list of local and server items */
  readonly items = computed(() => [
    ...this.state().localItems,
    ...this.state().serverItems,
  ]);
  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);

  // ==================== API & Data Management ====================

  /** Fetches bookings from API and updates serverItems */
  load(): void {
    this.state.update((s) => ({ ...s, loading: true, error: null }));

    this.api
      .list()
      .pipe(
        tap((serverItems) =>
          this.state.update((s) => ({ ...s, serverItems, loading: false }))
        ),
        catchError((err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Unknown error';

          // IMPORTANT: do NOT touch serverItems/localItems here
          // We preserve existing items so users see cached data on error
          this.state.update((s) => ({
            ...s,
            error: msg,
            loading: false,
          }));

          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  /** Adds a new booking to localItems (optimistic update) */
  add(booking: Booking): void {
    this.state.update((s) => ({ ...s, localItems: [booking, ...s.localItems] }));
  }

  /** Confirms a booking by updating its status in both local and server items */
  confirm(id: string): void {
  // optimistic update in UI
  this.state.update((s) => ({
    ...s,
    localItems: s.localItems.map((b) => (b.id === id ? { ...b, status: 'CONFIRMED' } : b)),
    serverItems: s.serverItems.map((b) => (b.id === id ? { ...b, status: 'CONFIRMED' } : b)),
    error: null,
  }));

  // if it exists in serverItems, call API
  const wasInServer = this.state().serverItems.some((b) => b.id === id);
  if (!wasInServer) return;

  this.api.confirm(id).subscribe({
    next: (updated) => {
      this.state.update((s) => ({
        ...s,
        serverItems: s.serverItems.map((b) => (b.id === id ? updated : b)),
      }));
    },
    error: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Confirm failed';
      this.state.update((s) => ({ ...s, error: msg }));
      // Optional rollback (we can add after)
    },
  });
}


  // ==================== Filtering & Sorting ====================

  readonly filter = computed(() => this.state().filter);

  /** Sets sort column; toggles direction if same column clicked twice */
  setSort(sortKey: 'SCHEDULED_AT' | 'TOTAL'): void {
    this.state.update((s) => {
      const nextDir =
        s.sortKey === sortKey ? (s.sortDir === 'ASC' ? 'DESC' : 'ASC') : 'DESC';

      return { ...s, sortKey, sortDir: nextDir, page: 1 };
    });

    this.saveUiState();
  }

  setPageSize(pageSize: number): void {
    this.state.update((s) => ({ ...s, pageSize, page: 1 }));
    this.saveUiState();
  }

  setFilter(filter: BookingFilter): void {
    this.state.update((s) => ({ ...s, filter, page: 1 }));
    this.saveUiState();
  }

  // ==================== Display Helpers ====================

  /** Calculates page range info (e.g., "1-10 of 45") */
  readonly pageRange = computed(() => {
    const total = this.sortedVisibleItems().length;
    if (total === 0) return { from: 0, to: 0, total: 0 };

    const page = this.state().page;
    const size = this.state().pageSize;

    const from = (page - 1) * size + 1;
    const to = Math.min(page * size, total);

    return { from, to, total };
  });

  /** Filters items based on current filter setting */
readonly visibleItems = computed(() => {
  const f = this.state().filter;
  const q = this.state().query.trim().toLowerCase();
  const all = [...this.state().localItems, ...this.state().serverItems];

  const filtered = f === 'ALL' ? all : all.filter((b) => b.status === f);
  if (!q) return filtered;

  return filtered.filter((b) => {
    const hay = `${b.customerName} ${b.address}`.toLowerCase();
    return hay.includes(q);
  });
});

  /** Sorts visible items by current sort key and direction */
  readonly sortedVisibleItems = computed(() => {
    const key = this.state().sortKey;
    const dir = this.state().sortDir;

    const sorted = [...this.visibleItems()].sort((a, b) => {
      let av = 0;
      let bv = 0;

      if (key === 'TOTAL') {
        av = a.totalCad;
        bv = b.totalCad;
      } else {
        av = Date.parse(a.scheduledAtIso) || 0;
        bv = Date.parse(b.scheduledAtIso) || 0;
      }

      return dir === 'ASC' ? av - bv : bv - av;
    });

    return sorted;
  });

  // ==================== Statistics ====================

  /** Computes count of all, new, and confirmed bookings */
  readonly counts = computed(() => {
    const all = [...this.state().localItems, ...this.state().serverItems];
    const newCount = all.filter((b) => b.status === 'NEW').length;
    const confirmedCount = all.filter((b) => b.status === 'CONFIRMED').length;

    return {
      all: all.length,
      new: newCount,
      confirmed: confirmedCount,
    };
  });

  // ==================== Persistence ====================

  private saveUiState(): void {
    const s = this.state();
    const ui: BookingsUiState = {
      filter: s.filter,
      sortKey: s.sortKey,
      sortDir: s.sortDir,
      pageSize: s.pageSize,
      query: s.query,
    };
    localStorage.setItem(UI_STATE_KEY, JSON.stringify(ui));
  }

  /** Restores UI preferences from localStorage with validation */
  private loadUiState(): void {
    const raw = localStorage.getItem(UI_STATE_KEY);
    if (!raw) return;

    try {
      const ui = JSON.parse(raw) as Partial<BookingsUiState>;

      // validate & apply safely (no crashes on corrupted data)
      this.state.update((s) => ({
        ...s,
        filter: ui.filter === 'NEW' || ui.filter === 'CONFIRMED' || ui.filter === 'ALL' ? ui.filter : s.filter,
        sortKey: ui.sortKey === 'TOTAL' || ui.sortKey === 'SCHEDULED_AT' ? ui.sortKey : s.sortKey,
        sortDir: ui.sortDir === 'ASC' || ui.sortDir === 'DESC' ? ui.sortDir : s.sortDir,
        pageSize: typeof ui.pageSize === 'number' && ui.pageSize > 0 ? ui.pageSize : s.pageSize,
        query: typeof ui.query === 'string' ? ui.query : s.query,
        page: 1,
      }));
    } catch {
      // ignore invalid JSON silently
    }
  }
create(req: { customerName: string; address: string; scheduledAtIso: string; totalCad: number; paid?: boolean }): void {
  this.state.update((s) => ({ ...s, loading: true, error: null }));

  this.api.create(req).subscribe({
    next: (created) => {
      this.state.update((s) => ({
        ...s,
        serverItems: [created, ...s.serverItems],
        loading: false,
        page: 1,
      }));
    },
    error: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Create failed';
      this.state.update((s) => ({ ...s, error: msg, loading: false }));
    },
  });
}


}