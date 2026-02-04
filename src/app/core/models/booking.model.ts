export type BookingStatus = 'NEW' | 'CONFIRMED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

export type Booking = {
  id: string;
  customerName: string;
  address: string;
  scheduledAtIso: string;
  status: BookingStatus;
  totalCad: number;
  paid: boolean;
};
