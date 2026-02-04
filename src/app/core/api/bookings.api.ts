import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Booking } from '../models/booking.model';
// import { environment } from '../../../environments/environment';

type CreateBookingRequest = {
  customerName: string;
  address: string;
  scheduledAtIso: string;
  totalCad: number;
  paid?: boolean;
};

@Injectable({ providedIn: 'root' })
export class BookingsApi {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/api/bookings';
 
  list(): Observable<Booking[]> {
    return this.http.get<Booking[]>(this.baseUrl);
  }

  create(req: CreateBookingRequest): Observable<Booking> {
    return this.http.post<Booking>(this.baseUrl, req);
  }

  confirm(id: string): Observable<Booking> {
    return this.http.patch<Booking>(`${this.baseUrl}/${id}/confirm`, {});
  }

  delete(id: string): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`${this.baseUrl}/${id}`);
  }
}
