import idCommon from './locales/id/common.json';
import idWizard from './locales/id/wizard.json';
import idCafe from './locales/id/cafe.json';
import idMap from './locales/id/map.json';
import idErrors from './locales/id/errors.json';

export const SUPPORTED_LANGUAGES = ['id'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'id';

export const NAMESPACES = [
  'common',
  'wizard',
  'cafe',
  'map',
  'errors',
] as const;
export type Namespace = (typeof NAMESPACES)[number];

export const resources = {
  id: {
    common: idCommon,
    wizard: idWizard,
    cafe: idCafe,
    map: idMap,
    errors: idErrors,
  },
} as const;

export type Resources = (typeof resources)['id'];
