import React, { createContext, useContext, useState, ReactNode } from 'react';
import { WizardPreferences } from '../types';

interface PreferencesContextType {
  preferences: WizardPreferences | null;
  setPreferences: (prefs: WizardPreferences | null) => void;
  wizardCompleted: boolean;
  setWizardCompleted: (val: boolean) => void;
}

const PreferencesContext = createContext<PreferencesContextType>({
  preferences: null,
  setPreferences: () => {},
  wizardCompleted: false,
  setWizardCompleted: () => {},
});

export const usePreferences = () => useContext(PreferencesContext);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<WizardPreferences | null>(null);
  const [wizardCompleted, setWizardCompleted] = useState(false);

  return (
    <PreferencesContext.Provider value={{ preferences, setPreferences, wizardCompleted, setWizardCompleted }}>
      {children}
    </PreferencesContext.Provider>
  );
}
