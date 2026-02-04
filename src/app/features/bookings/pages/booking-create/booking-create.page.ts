import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BookingsStore } from '../../data-access/bookings.store';
import { Booking } from '../../../../core/models/booking.model';

@Component({
  selector: 'app-booking-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './booking-create.page.html',
})
export class BookingCreatePage {

  private store = inject(BookingsStore);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  // Reactive form with customer details and scheduling information
  form = this.fb.nonNullable.group({
    customerName: ['', Validators.required],
    address: ['', Validators.required],
    unitType: ['1bed', Validators.required],
    scheduledDate: ['', Validators.required], // yyyy-mm-dd
    scheduledTime: ['', Validators.required], // hh:mm
  });

  // Calculate price based on unit type
  get priceCad(): number {
    return this.form.controls.unitType.value === '2bed' ? 220 : 180;
  }

  // Handle form submission and create new booking
 submit(): void {
  if (this.form.invalid) {
    this.form.markAllAsTouched();
    return;
  }

  const v = this.form.getRawValue();

  const scheduledDate = new Date(`${v.scheduledDate}T${v.scheduledTime}:00`);
  if (isNaN(scheduledDate.getTime())) {
    this.form.markAllAsTouched();
    return;
  }

  const req = {
    customerName: v.customerName.trim(),
    address: v.address.trim(),
    scheduledAtIso: scheduledDate.toISOString(),
    totalCad: this.priceCad,
    paid: false,
  };

  this.store.create(req);           // backend creates id + returns Booking
  this.router.navigateByUrl('/bookings');
}


}
