/**
 * Point values per event type. The ledger (point_events) stores the value at
 * award time, so tuning these later never rewrites history.
 */
export const POINT_VALUES = {
  checkin: 10,
  table_open: 15,
  table_join: 10,
  table_host_guest: 5,
  table_squad_bonus: 50,
  table_squad_member: 20,
  friend_accepted: 5,
  review_created: 15,
  streak_week_bonus: 25,
} as const;

export type PointEventType = keyof typeof POINT_VALUES;
