// Interface strings, one catalog per interface language in lib/locales (en, vi, bn ...). The
// interface follows the content language when there is a catalog for it, else it is the
// site's (lib/language.js interfaceFor). A string missing from a catalog falls back to
// English, then to its key; `npm run i18n:missing` lists the gaps. Besides the variables a
// caller passes, LocaleContext's t() fills {site} (the site name) and {siteLanguage} (the
// name of the country's content language).
//
// Only English is in the browser bundle. Another catalog is used once it has been loaded
// (loadCatalog: its own chunk) or handed over with a page's props (registerCatalog); every
// function below reads the catalogs that are there, and falls back to English for the others.
import en, { languageNames as enLanguageNames, locale as enLocale, nativeName as enNativeName } from "./locales/en.js";
import { catalogLoaders } from "./locales/index.js";

// A catalog as the functions below and the pages' props have it (plain JSON):
// { code, strings, languageNames, nativeName, locale }.
const ENGLISH = { code: "en", strings: en, languageNames: enLanguageNames, nativeName: enNativeName, locale: enLocale };
const catalogOf = (code, module) => ({
  code,
  strings: module.default,
  languageNames: module.languageNames || {},
  nativeName: module.nativeName || code,
  locale: module.locale || ENGLISH.locale,
});

const loaded = { en: ENGLISH };
const loading = {};

// Every catalog's code, English first (lib/locales/index.js).
export const catalogCodes = ["en", ...Object.keys(catalogLoaders)];

export function hasCatalog(code) {
  return catalogCodes.includes(code);
}

// The catalog when it is there, else null.
export const loadedCatalog = (code) => loaded[code] || null;

// Loads a catalog (in the browser, its chunk); resolves to null when there is none.
export function loadCatalog(code) {
  if (loaded[code]) return Promise.resolve(loaded[code]);
  if (!Object.prototype.hasOwnProperty.call(catalogLoaders, code)) return Promise.resolve(null);
  if (!loading[code]) {
    loading[code] = catalogLoaders[code]().then(
      (module) => (loaded[code] = catalogOf(code, module)),
      (error) => {
        delete loading[code];
        throw error;
      }
    );
  }
  return loading[code];
}

// A catalog that came with a page's props (lib/api loadPage), so that the page renders in it.
export function registerCatalog(catalog) {
  if (catalog && hasCatalog(catalog.code) && catalog.strings && !loaded[catalog.code]) loaded[catalog.code] = catalog;
}

// Every catalog, by code: for the Node scripts (i18n-missing, check-sites, the country matrix,
// the end-to-end suite), which check them all.
export async function loadCatalogs() {
  const all = await Promise.all(catalogCodes.map((code) => loadCatalog(code)));
  return Object.fromEntries(all.map((catalog) => [catalog.code, catalog]));
}

// A catalog's own name and locale (BCP 47: numbers, plurals, dates, og:locale); English's
// until it is loaded.
export const catalogName = (code) => (loaded[code] || ENGLISH).nativeName;
export const catalogLocale = (code) => (loaded[code] || ENGLISH).locale;

// One Intl object per locale: they are costly to make.
const intlCache = new Map();
function intl(kind, locale) {
  const key = `${kind}:${locale}`;
  if (!intlCache.has(key)) {
    let made;
    try {
      made =
        kind === "plural" ? new Intl.PluralRules(locale) : new Intl.NumberFormat(locale, { numberingSystem: "latn", maximumFractionDigits: 0 });
    } catch (_) {
      made = kind === "plural" ? new Intl.PluralRules("en") : new Intl.NumberFormat("en", { maximumFractionDigits: 0 });
    }
    intlCache.set(key, made);
  }
  return intlCache.get(key);
}

// Plural forms: the names of a plural form of `key` for `count` ("chapterCount_few" in
// Russian for 43), the form first, then the key itself.
export const PLURAL_FORMS = ["zero", "one", "two", "few", "many", "other"];
const pluralKeys = (catalog, key, count) => [`${key}_${intl("plural", catalog.locale).select(count)}`, key];

// The interface catalog's string, else the English one, else the key itself. A `count` that
// is a number picks the plural form for it (`${key}_one`, `${key}_few` ..., by the catalog's
// locale) when the catalog has one, and is written as formatNumber writes it.
export function translate(ui, key, vars) {
  const catalog = loaded[ui] || ENGLISH;
  const counted = vars && typeof vars.count === "number" && Number.isFinite(vars.count);
  const lookup = (table) => (counted ? pluralKeys(table, key, vars.count) : [key]).map((name) => table.strings[name]).find((text) => text != null);
  let text = lookup(catalog) ?? (catalog === ENGLISH ? undefined : lookup(ENGLISH)) ?? key;
  if (vars) {
    const values = counted ? { ...vars, count: formatNumber(vars.count, ui) } : vars;
    Object.entries(values).forEach(([name, value]) => {
      text = text.split(`{${name}}`).join(String(value));
    });
  }
  return text;
}

// The name of a language inside a sentence ("Bản dịch tiếng Anh"), from the interface
// catalog's `languageNames`. `fallback` is the API's language object or native name, used
// for codes the catalog does not name.
export function languageName(ui, code, fallback) {
  const table = (loaded[ui] || ENGLISH).languageNames;
  if (table[code]) return table[code];
  if (fallback) return fallback;
  return String(code || "").toUpperCase();
}

// A whole number as the interface's locale writes it (catalogLocale), always in Latin digits
// like the hadith numbers next to it: 1,234 (en), 1.234 (vi), 1,23,456 (bn), 7 563 (ru).
export function formatNumber(value, ui) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  return intl("number", catalogLocale(ui)).format(Math.trunc(number));
}

// Languages written right to left. Content blocks in them carry their own `dir` either way.
const RTL_LANGUAGES = new Set(["ar", "ur", "ku", "ckb", "fa", "prs", "ps", "sd", "ug", "dv", "he", "yi"]);

export function isRtlLanguage(code) {
  return RTL_LANGUAGES.has(String(code || "").toLowerCase());
}

// The switch for right-to-left interfaces. The layout is left-to-right only for now, so their
// catalogs (ar, ur, ku) can be registered and checked like the others but are not used: a
// reader of those languages gets the site's interface. Turn it on once the layout supports
// RTL: those readers then get their catalog, with <html dir="rtl"> (interfaceDirection).
export const RTL_INTERFACES = false;

// Whether `code` can be the interface: it has a catalog, which is left-to-right unless
// RTL_INTERFACES is on.
export function isInterfaceLanguage(code) {
  return hasCatalog(code) && (RTL_INTERFACES || !isRtlLanguage(code));
}

// `dir` of the page (<html>) in an interface.
export const interfaceDirection = (ui) => (isRtlLanguage(ui) ? "rtl" : "ltr");

// The interface a country gets for its `ui` (config/countries.json): that catalog when it
// can be used, else English.
export function interfaceLanguageFor(ui) {
  return isInterfaceLanguage(ui) ? ui : "en";
}

// The interfaces in use, English first (lib/locales/index.js order).
export const interfaceLanguages = catalogCodes.filter(isInterfaceLanguage);

// On an international site every language is the site's, so the strings that name the
// country's language ("Hadith in {siteLanguage}") are read from these keys instead
// (contexts/LocaleContext.js t()). Each catalog has both.
export const INTERNATIONAL_KEYS = {
  siteHeading: "siteHeadingAll",
  aboutApp: "aboutAppAll",
  searchPlaceholderLong: "searchPlaceholderAll",
  searchTips: "searchTipsAll",
};
