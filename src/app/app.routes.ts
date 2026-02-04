import { Routes } from '@angular/router';

export const routes: Routes = [
    { path: '', pathMatch: 'full', redirectTo: 'bookings' },
    {
        path: 'bookings',
        loadComponent: () =>
            import('./features/bookings/pages/bookings-list/bookings-list.page').then(
                (m) => m.BookingsListPage
            ),
    },
    {
        path: 'bookings/new',
        loadComponent: () =>
            import('./features/bookings/pages/booking-create/booking-create.page').then(
                (m) => m.BookingCreatePage
            ),
    },
    { path: '**', redirectTo: 'bookings' },
];