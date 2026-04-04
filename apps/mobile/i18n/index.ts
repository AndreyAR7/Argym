import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import esCR from './locales/es-CR.json';
import enUS from './locales/en-US.json';

const resources = {
  'es-CR': { translation: esCR },
  'en-US': { translation: enUS },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'es-CR',
  fallbackLng: 'es-CR',
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: 'v3',
});

export default i18n;
export { i18n };
