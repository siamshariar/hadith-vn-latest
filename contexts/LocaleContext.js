import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_LANGUAGE,
  INTERNATIONAL,
  SITE_INTERFACE,
  interfaceDirection,
  interfaceFor,
  interfaceLocale,
  interfaceOgLocale,
  isRtlLanguage,
  normalizeLanguage,
} from "../lib/language";
import {
  INTERNATIONAL_KEYS,
  formatNumber,
  languageName,
  loadCatalog,
  loadedCatalog,
  registerCatalog,
  translate,
} from "../lib/i18n";
import { site } from "../lib/sites";

export const LocaleContext = createContext(null);

// The interface follows the content language (lib/language.js interfaceFor). Every page comes
// with both (`pageLang`, `pageUi`: lib/api loadStatic) and with the catalog of its interface
// (`uiCatalog`; English is in the bundle), so it renders in them at once.

// A language's name from the API's language object ({ code, name, nativeName }): its
// English name in the English interface, its own name in the others.
const apiName = (ui, language) => (language ? (ui === "en" ? language.name : language.nativeName) || null : null);

// The catalog's name for `code`, else the API's: `fallback` (a language object or a
// name), else the page language's description.
function nameOf(ui, code, fallback, info) {
  const given = fallback && typeof fallback === "object" ? apiName(ui, fallback) : fallback;
  return languageName(ui, code, given || (info && code === info.code ? apiName(ui, info) : null));
}

// t() of an interface. It fills in the site name and the name of the country's content
// language ("Hadith tiếng Việt", "বাংলা হাদিস"; callers' variables win). An international
// site reads the keys of INTERNATIONAL_KEYS (lib/i18n.js) in place of the ones that name it.
// Kept once the interface's catalog is there.
const translators = {};
function translatorFor(ui) {
  if (translators[ui]) return translators[ui];
  const siteVars = { site: site.siteName, siteLanguage: nameOf(ui, site.language, null, null) };
  const t = (key, vars) =>
    translate(ui, (INTERNATIONAL && INTERNATIONAL_KEYS[key]) || key, vars ? { ...siteVars, ...vars } : siteVars);
  if (loadedCatalog(ui)) translators[ui] = t;
  return t;
}

// BCP 47 locale (Intl date formats) and og:locale of an interface: the country's for its own
// `ui`, else the catalog's (en_US, vi_VN, bn_BD).
const localeOf = (ui) => interfaceLocale(ui, (loadedCatalog(ui) || {}).locale);
const ogLocaleOf = (ui) => interfaceOgLocale(ui, (loadedCatalog(ui) || {}).locale);

// Text direction of content in `code`, when known.
function directionOf(code, info) {
  if (info && code === info.code) return info.direction || "ltr";
  if (isRtlLanguage(code)) return "rtl";
  if (code === "en" || code === "vi" || code === "bn") return "ltr";
  return "auto";
}

// Each site reads in one language (lib/api SITE_LANGUAGE) and every page is built in it:
// `pageLang` is that language, `pageUi` the interface with `uiCatalog`, and `languageInfo` the
// API's description of the language ({ code, name, nativeName, direction }). The pages built
// without data (404, 500) only have `pageUi` and `uiCatalog`: they are in the site's language too.
const noop = () => {};

export default function LocaleProvider({ pageLang, pageUi, uiCatalog, languageInfo, children }) {
  // Before anything renders with it.
  registerCatalog(uiCatalog);
  const [, setCatalogsLoaded] = useState(0);

  const lang = normalizeLanguage(pageLang || DEFAULT_LANGUAGE);
  const wantedUi = pageUi || interfaceFor(lang);
  // Until the catalog has loaded, English (in the bundle).
  const ui = loadedCatalog(wantedUi) ? wantedUi : "en";

  useEffect(() => {
    if (loadedCatalog(wantedUi)) return undefined;
    let active = true;
    loadCatalog(wantedUi)
      .then(() => active && setCatalogsLoaded((count) => count + 1))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [wantedUi]);

  // <html lang> and dir (pages/_document.js), should the interface come in late.
  useEffect(() => {
    const root = document.documentElement;
    const dir = interfaceDirection(ui);
    if (root.lang !== ui) root.lang = ui;
    if (root.dir !== dir) root.dir = dir;
  }, [ui]);

  const preferredLang = lang;
  const setLanguage = noop;
  const rememberLanguage = noop;

  const value = useMemo(() => {
    const info = languageInfo && languageInfo.code === lang ? languageInfo : null;
    return {
      lang,
      preferredLang,
      ui,
      dir: interfaceDirection(ui),
      locale: localeOf(ui), // BCP 47, for Intl date formats
      ogLocale: ogLocaleOf(ui),
      languageInfo: info,
      directionOf: (code) => directionOf(code, info),
      setLanguage,
      rememberLanguage,
      t: translatorFor(ui),
      // languageName(code, fallback?): fallback is the API's language object or a name
      languageName: (code, fallback) => nameOf(ui, code, fallback, info),
      formatNumber: (number) => formatNumber(number, ui),
    };
  }, [lang, preferredLang, ui, languageInfo, setLanguage, rememberLanguage]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context) return context;
  // Outside the provider (should not happen): default language, no switching.
  const ui = loadedCatalog(SITE_INTERFACE) ? SITE_INTERFACE : "en";
  return {
    lang: DEFAULT_LANGUAGE,
    preferredLang: DEFAULT_LANGUAGE,
    ui,
    dir: interfaceDirection(ui),
    locale: localeOf(ui),
    ogLocale: ogLocaleOf(ui),
    languageInfo: null,
    directionOf: (code) => directionOf(code, null),
    setLanguage: () => {},
    rememberLanguage: () => {},
    t: translatorFor(ui),
    languageName: (code, fallback) => nameOf(ui, code, fallback, null),
    formatNumber: (number) => formatNumber(number, ui),
  };
}
