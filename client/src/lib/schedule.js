import { addDays, startOfTomorrow } from 'date-fns';
import { toDateKey } from './format';

/** How many days the quick date picker shows, starting tomorrow. */
export const BOOKING_WINDOW_DAYS = 14;

/** Bookable times, stored in the same `HH:mm` format the API has always used. */
export const SLOT_GROUPS = [
  { id: 'morning', label: 'Morning', slots: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'] },
  {
    id: 'afternoon',
    label: 'Afternoon',
    slots: ['12:00', '12:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'],
  },
  { id: 'evening', label: 'Evening', slots: ['17:00', '17:30', '18:00', '18:30'] },
];

export function upcomingDays(count = BOOKING_WINDOW_DAYS) {
  const first = startOfTomorrow();
  return Array.from({ length: count }, (_, index) => addDays(first, index));
}

/** Appointments can be booked from tomorrow onwards. */
export function earliestBookableKey() {
  return toDateKey(startOfTomorrow());
}
