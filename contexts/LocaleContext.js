import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  DEFAULT_LANGUAGE,
  INTERNATIONAL,
  SITE_INTERFACE,
  browserLanguages,
  interfaceDirection,
  interfaceFor,
  interfaceLocale,
  interfaceOgLocale,
  isRtlLanguage,
  matchLanguage,
  normalizeLanguage,
  readLanguageCookie,
  writeLanguageCookie,
} from "../lib/language";
import {
  INTERNATIONAL_KEYS,
  catalogCodes,
  formatNumber,
  languageName,
  loadCatalog,
  loadedCatalog,
  registerCatalog,
  translate,
} from "../lib/i18n";
import { site } from "../lib/sites";

export const LocaleContext = createContext(null);

// The interface follows the content language (lib/language.js interfaceFor). A server-rendered
// page comes with both (`pageLang`, `pageUi`: lib/api loadPage) and with the catalog of its
// interface (`uiCatalog`; English is in the bundle), so it renders in them at once. The static
// pages (404, 500) are built in the site's interface: once mounted they take the reader's
// language (that of the page before, else the saved one; an international site also tries the
// browser's languages) and load its catalog.

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

// `pageLang` is the content language a server-rendered page was fetched in (from `?lang=`,
// the preference cookie, on an international site the browser's languages, or the country's
// default), `pageUi` its interface with `uiCatalog`, `pagePreferred` the content language
// without a one-off ?lang=, and `languageInfo` the API's description of the content language
// ({ code, name, nativeName, direction }). Static pages only have `pageUi` and `uiCatalog`.
export default function LocaleProvider({ pageLang, pageUi, pagePreferred, uiCatalog, languageInfo, children }) {
  // Before anything renders with it.
  registerCatalog(uiCatalog);
  const router = useRouter();
  const staticPage = !pageLang;
  // The saved preference (hadith_lang), read once mounted.
  const [saved, setSaved] = useState(null);
  // The language of the last server-rendered page: a static page opened after it stays in it.
  const [lastLang, setLastLang] = useState(null);
  // International site, static page opened first: the browser's languages among the catalogs.
  const [browserLang, setBrowserLang] = useState(null);
  const [, setCatalogsLoaded] = useState(0);

  useEffect(() => {
    setSaved(readLanguageCookie());
    if (INTERNATIONAL) setBrowserLang(matchLanguage(browserLanguages(), catalogCodes));
  }, []);

  useEffect(() => {
    if (pageLang) setLastLang(pageLang);
  }, [pageLang]);

  const lang = normalizeLanguage(pageLang || lastLang || saved || browserLang || DEFAULT_LANGUAGE);
  const wantedUi = !staticPage && pageUi ? pageUi : interfaceFor(lang);
  // Until the wanted catalog has loaded (a static page), the one the page came with.
  const ui = loadedCatalog(wantedUi) ? wantedUi : loadedCatalog(pageUi) ? pageUi : "en";

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

  // <html lang> and dir (pages/_document.js) when the interface changes in the browser.
  useEffect(() => {
    const root = document.documentElement;
    const dir = interfaceDirection(ui);
    if (root.lang !== ui) root.lang = ui;
    if (root.dir !== dir) root.dir = dir;
  }, [ui]);

  // The saved preference, not a one-off ?lang= override. On an international site it can
  // also come from the browser's languages, and is null while not known yet (a static page).
  const preferred = pagePreferred || saved || (INTERNATIONAL ? null : DEFAULT_LANGUAGE);
  const preferredLang = preferred ? normalizeLanguage(preferred) : null;

  const setLanguage = useCallback(
    (code) => {
      const next = normalizeLanguage(code);
      writeLanguageCookie(next);
      setSaved(next);
      if (staticPage) {
        // Nothing to fetch: the page switches here (its catalog loads above).
        setLastLang(next);
        return;
      }
      // Re-run getServerSideProps in the new language; drop a `?lang=` override.
      const { lang: _ignored, ...query } = router.query;
      router.replace({ pathname: router.pathname, query }, undefined, { scroll: false });
    },
    [router, staticPage]
  );

  // Saves the preference only, for a link that opens a page in that language itself.
  const rememberLanguage = useCallback((code) => {
    const next = normalizeLanguage(code);
    writeLanguageCookie(next);
    setSaved(next);
  }, []);

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
