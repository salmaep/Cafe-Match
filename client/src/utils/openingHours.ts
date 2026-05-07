// Opening-hours helpers. The API returns hours as { mon: "08:00-20:30", ... }.
// Days that are closed are typically absent from the map.

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
type DayKey = (typeof DAY_KEYS)[number];

export const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

const DAY_LABELS_ID: Record<DayKey, string> = {
  mon: 'Sen',
  tue: 'Sel',
  wed: 'Rab',
  thu: 'Kam',
  fri: 'Jum',
  sat: 'Sab',
  sun: 'Min',
};

function parseHM(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

export interface OpenStatus {
  isOpen: boolean;
  closesAt?: string;
  opensAt?: string;
  nextOpenDay?: string;
}

export function getOpenStatus(
  hours: Record<string, string> | null | undefined,
  now: Date = new Date(),
): OpenStatus | null {
  if (!hours) return null;
  const dayKey = DAY_KEYS[now.getDay()];
  const today = hours[dayKey];
  const cur = now.getHours() * 60 + now.getMinutes();

  if (today) {
    const [openStr, closeStr] = today.split('-').map((x) => x.trim());
    const open = parseHM(openStr);
    const close = parseHM(closeStr);
    if (open != null && close != null) {
      // Handle past-midnight close (e.g. 18:00-02:00)
      const closeNorm = close <= open ? close + 24 * 60 : close;
      const curNorm = cur < open && close <= open ? cur + 24 * 60 : cur;
      if (curNorm >= open && curNorm < closeNorm) {
        return { isOpen: true, closesAt: closeStr };
      }
      if (cur < open) {
        return { isOpen: false, opensAt: openStr, nextOpenDay: 'today' };
      }
    }
  }

  for (let i = 1; i <= 7; i++) {
    const idx = (now.getDay() + i) % 7;
    const k = DAY_KEYS[idx];
    const slot = hours[k];
    if (!slot) continue;
    const [openStr] = slot.split('-').map((x) => x.trim());
    return {
      isOpen: false,
      opensAt: openStr,
      nextOpenDay: i === 1 ? 'tomorrow' : DAY_LABELS[k],
    };
  }
  return { isOpen: false };
}

export function formatHoursTable(
  hours: Record<string, string> | null | undefined,
  lang: 'en' | 'id' = 'id',
): { day: string; hours: string }[] {
  if (!hours) return [];
  const labels = lang === 'id' ? DAY_LABELS_ID : DAY_LABELS;
  const order: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  return order.map((k) => ({
    day: labels[k],
    hours: hours[k] || (lang === 'id' ? 'Tutup' : 'Closed'),
  }));
}
