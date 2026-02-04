import { Component, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { BookingsStore } from '../../data-access/bookings.store';
import { BookingStatusBadgeUi } from '../../../../shared/ui/booking-status-badge/booking-status-badge.ui';

@Component({
  selector: 'app-bookings-list',
  standalone: true,
  imports: [CommonModule, DatePipe, BookingStatusBadgeUi],
  templateUrl: './bookings-list.page.html',
})
export class BookingsListPage {
  // Inject the bookings store service
  private readonly store = inject(BookingsStore);
  
  // Store state observables exposed to the template
  readonly items = this.store.items;
  readonly loading = this.store.loading;
  readonly error = this.store.error;
  readonly visibleItems = this.store.visibleItems;
  readonly pagedSortedVisibleItems = this.store.pagedSortedVisibleItems;
  readonly filter = this.store.filter;
  readonly counts = this.store.counts;
  readonly sortKey = this.store.sortKey;
  readonly sortDir = this.store.sortDir;
  readonly pagedItems = this.store.pagedSortedVisibleItems;
  readonly page = this.store.page;
  readonly totalPages = this.store.totalPages;
  readonly pageSize = this.store.pageSize;
  readonly pageRange = this.store.pageRange;
  readonly query = this.store.query;
  readonly pendingDelete = this.store.pendingDelete;

  // Delete a booking by id
  delete(id: string): void {
    this.store.delete(id);
  }

  // Undo the last delete operation
  undoDelete(): void {
    this.store.undoDelete();
  }

  // Update search query
  onQuery(value: string): void {
    this.store.setQuery(value);
  }

  // Navigate to next page
  next(): void {
    this.store.nextPage();
  }

  // Navigate to previous page
  prev(): void {
    this.store.prevPage();
  }

  // Update sort key and direction
  setSort(key: 'SCHEDULED_AT' | 'TOTAL'): void {
    this.store.setSort(key);
  }

  // Update filter value
  setFilter(value: 'ALL' | 'NEW' | 'CONFIRMED'): void {
    this.store.setFilter(value);
  }

  // Auto-load bookings on component initialization if store is empty
  constructor() {
    if (this.store.items().length === 0) {
      this.store.load();
    }
  }

  // Reload all bookings from the server
  refresh(): void {
    this.store.load();
  }

  // Confirm a booking by id
  confirm(id: string): void {
    this.store.confirm(id);
  }

  // Update the number of items displayed per page
  setPageSize(value: string): void {
    this.store.setPageSize(Number(value));
  }
}