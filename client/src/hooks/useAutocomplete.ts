import { useEffect, useState } from "react";
import { cafesApi, type AutocompleteHit } from "../api/cafes.api";

const DEBOUNCE_MS = 250;
const MIN_QUERY_LEN = 2;

interface Options {
  lat?: number;
  lng?: number;
  limit?: number;
}

interface InternalState {
  q: string; // the query the data belongs to
  suggestions: AutocompleteHit[];
  loading: boolean;
  error: boolean;
}

/**
 * Debounced autocomplete fetcher. Returns suggestions for `q` after a 250ms
 * pause in typing. Skips queries shorter than 2 chars. Races are guarded —
 * a stale response is discarded when q changes mid-flight.
 */
export function useAutocomplete(q: string, opts: Options = {}) {
  const { lat, lng, limit = 8 } = opts;
  const [state, setState] = useState<InternalState>({
    q: "",
    suggestions: [],
    loading: false,
    error: false,
  });

  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < MIN_QUERY_LEN) {
      // Nothing to fetch; cleanup any stale data attributable to a prior q.
      return;
    }

    let cancelled = false;

    const t = setTimeout(() => {
      // setState lives inside the async callback (not the effect body) to
      // avoid the react-hooks/set-state-in-effect lint warning while still
      // giving consumers an accurate `loading` flag during the fetch.
      setState((prev) => ({ ...prev, q: trimmed, loading: true, error: false }));
      cafesApi
        .autocomplete({ q: trimmed, lat, lng, limit })
        .then((res) => {
          if (cancelled) return;
          setState({
            q: trimmed,
            suggestions: res.data,
            loading: false,
            error: false,
          });
        })
        .catch(() => {
          if (cancelled) return;
          setState({
            q: trimmed,
            suggestions: [],
            loading: false,
            error: true,
          });
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, lat, lng, limit]);

  // Derive output: if current q is too short OR doesn't match the stored q
  // (typing in progress before debounce fires), show empty results.
  const trimmed = q.trim();
  const isStale = state.q !== trimmed;
  if (trimmed.length < MIN_QUERY_LEN) {
    return { suggestions: [], loading: false, error: false };
  }
  if (isStale) {
    // Show prior suggestions while debounce pending — feels snappier.
    return {
      suggestions: state.suggestions,
      loading: true,
      error: false,
    };
  }
  return {
    suggestions: state.suggestions,
    loading: state.loading,
    error: state.error,
  };
}
