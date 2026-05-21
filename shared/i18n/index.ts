import idCommon from './locales/id/common.json';
import idWizard from './locales/id/wizard.json';
import idCafe from './locales/id/cafe.json';
import idMap from './locales/id/map.json';
import idErrors from './locales/id/errors.json';
import idDiscover from './locales/id/discover.json';
import idTrending from './locales/id/trending.json';
import idShortlist from './locales/id/shortlist.json';
import idAuth from './locales/id/auth.json';
import idProfile from './locales/id/profile.json';
import idNotifications from './locales/id/notifications.json';
import idRecap from './locales/id/recap.json';
import idFilters from './locales/id/filters.json';
import idVote from './locales/id/vote.json';
import idSocial from './locales/id/social.json';
import idLists from './locales/id/lists.json';
import idReviews from './locales/id/reviews.json';

export const SUPPORTED_LANGUAGES = ['id'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'id';

export const NAMESPACES = [
  'common',
  'wizard',
  'cafe',
  'map',
  'errors',
  'discover',
  'trending',
  'shortlist',
  'auth',
  'profile',
  'notifications',
  'recap',
  'filters',
  'vote',
  'social',
  'lists',
  'reviews',
] as const;
export type Namespace = (typeof NAMESPACES)[number];

export const resources = {
  id: {
    common: idCommon,
    wizard: idWizard,
    cafe: idCafe,
    map: idMap,
    errors: idErrors,
    discover: idDiscover,
    trending: idTrending,
    shortlist: idShortlist,
    auth: idAuth,
    profile: idProfile,
    notifications: idNotifications,
    recap: idRecap,
    filters: idFilters,
    vote: idVote,
    social: idSocial,
    lists: idLists,
    reviews: idReviews,
  },
} as const;

export type Resources = (typeof resources)['id'];

export * from './keys';

