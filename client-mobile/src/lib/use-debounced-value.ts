import { useEffect, useState } from 'react';

/**
 * Debounce a value by `delay` ms.
 *
 * IMPORTANT: for object/array values, the effect dep is a serialized key, not the
 * raw value. Otherwise a fresh object literal each parent render (very common
 * pattern) keeps resetting the timer and the debounced value never settles —
 * leaving consumers stuck on the initial value forever.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  // Stable string key. Cheap for our small param objects; safer than referential dep.
  const key =
    typeof value === 'object' && value !== null
      ? JSON.stringify(value)
      : String(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, delay]);

  return debounced;
}
