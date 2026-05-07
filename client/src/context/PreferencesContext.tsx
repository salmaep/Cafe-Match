import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { WizardPreferences } from '../types/wizard';
import type { Purpose } from '../types';
import { purposesApi } from '../api/purposes.api';

const PREFS_KEY = 'cm_preferences';
const COMPLETED_KEY = 'cm_wizard_completed';

interface PreferencesContextType {
  preferences: WizardPreferences | null;
  wizardCompleted: boolean;
  setPreferences: (p: WizardPreferences | null) => void;
  setWizardCompleted: (v: boolean) => void;
  // Server purposes catalog — loaded once on mount, cached
  serverPurposes: Purpose[];
  // Resolve wizard slug → server purposeId. Returns null if slug not found.
  getPurposeId: (slug: string | undefined | null) => number | null;
}

const PreferencesContext = createContext<PreferencesContextType | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPrefsState] = useState<WizardPreferences | null>(() => {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [wizardCompleted, setCompletedState] = useState<boolean>(() => {
    return localStorage.getItem(COMPLETED_KEY) === 'true';
  });
  const [serverPurposes, setServerPurposes] = useState<Purpose[]>([]);

  // Load server purposes once on mount — cache lives until full reload.
  useEffect(() => {
    purposesApi
      .getAll()
      .then((res) => setServerPurposes(res.data ?? []))
      .catch(() => setServerPurposes([]));
  }, []);

  useEffect(() => {
    if (preferences) {
      localStorage.setItem(PREFS_KEY, JSON.stringify(preferences));
    } else {
      localStorage.removeItem(PREFS_KEY);
    }
  }, [preferences]);

  useEffect(() => {
    localStorage.setItem(COMPLETED_KEY, wizardCompleted ? 'true' : 'false');
  }, [wizardCompleted]);

  const slugToId = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of serverPurposes) map.set(p.slug, p.id);
    return map;
  }, [serverPurposes]);

  const getPurposeId = useCallback(
    (slug: string | undefined | null): number | null => {
      if (!slug) return null;
      return slugToId.get(slug) ?? null;
    },
    [slugToId],
  );

  const setPreferences = (p: WizardPreferences | null) => setPrefsState(p);
  const setWizardCompleted = (v: boolean) => setCompletedState(v);

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        wizardCompleted,
        setPreferences,
        setWizardCompleted,
        serverPurposes,
        getPurposeId,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within a PreferencesProvider');
  return ctx;
}
