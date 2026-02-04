import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookingStatus } from '../../../core/models/booking.model';

@Component({
  selector: 'app-booking-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      [style.padding]="'4px 8px'"
      [style.borderRadius]="'999px'"
      [style.border]="'1px solid #ddd'"
      [style.fontSize]="'12px'"
      [style.backgroundColor]="bg"
    >
      {{ status }}
    </span>
  `,
})
export class BookingStatusBadgeUi {
  @Input({ required: true }) status!: BookingStatus;

  get bg(): string {
    switch (this.status) {
      case 'NEW':
        return '#fff7cc';
      case 'CONFIRMED':
        return '#d8f5d1';
      case 'IN_PROGRESS':
        return '#d6ecff';
      case 'DONE':
        return '#e9e9e9';
      case 'CANCELLED':
        return '#ffd6d6';
      default:
        return '#ffffff';
    }
  }
}
