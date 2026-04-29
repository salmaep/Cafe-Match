import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { WizardPreferences } from '../types/wizard';

const PREFS_KEY = 'cm_preferences';
const COMPLETED_KEY = 'cm_wizard_completed';

interface PreferencesContextType {
  preferences: WizardPreferences | null;
  wizardCompleted: boolean;
  setPreferences: (p: WizardPreferences | null) => void;
  setWizardCompleted: (v: boolean) => void;
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

  const setPreferences = (p: WizardPreferences | null) => setPrefsState(p);
  const setWizardCompleted = (v: boolean) => setCompletedState(v);

  return (
    <PreferencesContext.Provider
      value={{ preferences, wizardCompleted, setPreferences, setWizardCompleted }}
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
