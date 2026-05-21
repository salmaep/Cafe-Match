import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import {
  DEFAULT_LANGUAGE,
  NAMESPACES,
  SUPPORTED_LANGUAGES,
  resources,
} from '@shared/i18n';

function detectInitialLanguage(): string {
  const locales = Localization.getLocales();
  const tag = locales?.[0]?.languageCode;
  if (tag && (SUPPORTED_LANGUAGES as readonly string[]).includes(tag)) {
    return tag;
  }
  return DEFAULT_LANGUAGE;
}

void i18n.use(initReactI18next).init({
  resources,
  lng: detectInitialLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  defaultNS: 'common',
  ns: NAMESPACES as readonly string[] as string[],
  interpolation: { escapeValue: false },
  returnNull: false,
  compatibilityJSON: 'v4',
});

export default i18n;
