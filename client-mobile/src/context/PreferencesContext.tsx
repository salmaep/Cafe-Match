import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WizardPreferences } from '../types';

// Same key names as the web client (localStorage) for mental consistency,
// even though the underlying store differs (AsyncStorage on native).
const PREFS_KEY = 'cm_preferences';
const COMPLETED_KEY = 'cm_wizard_completed';

interface PreferencesContextType {
  preferences: WizardPreferences | null;
  wizardCompleted: boolean;
  // False until AsyncStorage has been read on mount. Navigation gates (Splash,
  // Discover tab) must wait for this before deciding wizard-vs-app.
  hydrated: boolean;
  setPreferences: (p: WizardPreferences | null) => void;
  setWizardCompleted: (v: boolean) => void;
  // Partial merge update — persists. Used e.g. when expanding radius from search.
  updatePreference: (patch: Partial<WizardPreferences>) => void;
  // Wipe preferences + wizardCompleted flag (forces the wizard to show again).
  clearPreferences: () => void;
}

const PreferencesContext = createContext<PreferencesContextType | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPrefsState] = useState<WizardPreferences | null>(null);
  const [wizardCompleted, setCompletedState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from AsyncStorage once on mount.
  useEffect(() => {
    (async () => {
      try {
        const [prefsRaw, completedRaw] = await Promise.all([
          AsyncStorage.getItem(PREFS_KEY),
          AsyncStorage.getItem(COMPLETED_KEY),
        ]);
        if (prefsRaw) setPrefsState(JSON.parse(prefsRaw));
        if (completedRaw === 'true') setCompletedState(true);
      } catch {
        // Corrupt/unreadable store — keep defaults (wizard will show).
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  // Persist on change. Guarded by `hydrated` so the initial empty state does
  // not clobber previously stored data before hydration completes.
  useEffect(() => {
    if (!hydrated) return;
    if (preferences) {
      AsyncStorage.setItem(PREFS_KEY, JSON.stringify(preferences)).catch(() => {});
    } else {
      AsyncStorage.removeItem(PREFS_KEY).catch(() => {});
    }
  }, [preferences, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(COMPLETED_KEY, wizardCompleted ? 'true' : 'false').catch(
      () => {},
    );
  }, [wizardCompleted, hydrated]);

  const setPreferences = useCallback(
    (p: WizardPreferences | null) => setPrefsState(p),
    [],
  );
  const setWizardCompleted = useCallback((v: boolean) => setCompletedState(v), []);
  const updatePreference = useCallback((patch: Partial<WizardPreferences>) => {
    setPrefsState((prev) => ({ ...(prev ?? {}), ...patch }));
  }, []);
  const clearPreferences = useCallback(() => {
    setPrefsState(null);
    setCompletedState(false);
  }, []);

  const value = useMemo(
    () => ({
      preferences,
      wizardCompleted,
      hydrated,
      setPreferences,
      setWizardCompleted,
      updatePreference,
      clearPreferences,
    }),
    [
      preferences,
      wizardCompleted,
      hydrated,
      setPreferences,
      setWizardCompleted,
      updatePreference,
      clearPreferences,
    ],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx)
    throw new Error('usePreferences must be used within a PreferencesProvider');
  return ctx;
}
