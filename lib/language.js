import { config } from "./config";
import { interfaceDirection, interfaceLanguageFor, isInterfaceLanguage, isRtlLanguage } from "./i18n";
import { site } from "./sites";

export { interfaceDirection, isInterfaceLanguage, isRtlLanguage };

// The content language is a hadith language code (`vi`, `en`, `bn` ... see
// /hadith/languages). It is sent to the API as the {localizationCode} segment.
// The default is the country's (config/countries.json `language`).
export const DEFAULT_LANGUAGE = config.language || "en";
export const LANGUAGE_COOKIE = "hadith_lang";

// An international site (config/countries.json "international": ac) is one site for every
// language: the content language follows the reader's browser (below) instead of the country.
export const INTERNATIONAL = site.international === true;

const LANGUAGE_CODE = /^[a-z]{2,3}$/;

export function isLanguageCode(code) {
  return LANGUAGE_CODE.test(String(code || "").trim().toLowerCase());
}

export function normalizeLanguage(code) {
  const value = String(code || "").trim().toLowerCase();
  return LANGUAGE_CODE.test(value) ? value : DEFAULT_LANGUAGE;
}

const cookieOf = (req, name) => (req && req.cookies ? req.cookies[name] : null);
const acceptLanguageOf = (req) => (req && req.headers ? req.headers["accept-language"] : null);

// ---------------------------------------------------------------- the reader's languages

// The languages of an Accept-Language header, most wanted first, lower case and without
// the ones refused (q=0): "bn-BD,bn;q=0.9,en;q=0.8" -> ["bn-bd", "bn", "en"].
export function parseAcceptLanguage(header) {
  const wanted = [];
  String(header || "")
    .split(",")
    .slice(0, 50)
    .forEach((part, index) => {
      const [tag, ...params] = part.split(";");
      const code = tag.trim().toLowerCase();
      if (!/^[a-z]{1,8}(-[a-z0-9]{1,8})*$/.test(code)) return; // also "*"
      let q = 1;
      for (const param of params) {
        const match = param.trim().match(/^q=([0-9.]{1,5})$/i);
        if (match) q = Number(match[1]);
      }
      if (q > 0 && q <= 1) wanted.push({ code, q, index });
    });
  return wanted.sort((a, b) => b.q - a.q || a.index - b.index).map((item) => item.code);
}

// Browser tags that name a hadith language by another code: Filipino is the API's Tagalog,
// Central Kurdish its Kurdish (Sorani), Afghan Persian its Dari, Twi its Akan; "in" is the
// old code of Indonesian.
const TAG_ALIASES = { fil: "tl", ckb: "ku", "fa-af": "prs", tw: "ak", in: "id" };

// The first of `tags` (most wanted first) that names one of `codes`, by its whole tag or
// its language subtag: zh-TW -> zh, bn-BD -> bn, fil -> tl. null when none does.
export function matchLanguage(tags, codes) {
  const available = codes instanceof Set ? codes : new Set(codes || []);
  for (const tag of tags || []) {
    const primary = tag.split("-")[0];
    for (const code of [TAG_ALIASES[tag], tag, TAG_ALIASES[primary], primary]) {
      if (code && available.has(code)) return code;
    }
  }
  return null;
}

// The browser's languages, as Accept-Language has them (navigator.languages).
export function browserLanguages() {
  if (typeof navigator === "undefined") return [];
  const list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
  return list.filter(Boolean).map((tag) => String(tag).toLowerCase());
}

// ---------------------------------------------------------------- content language

// Server side: `?lang=` wins (shareable links), then the saved preference cookie, then the
// country's default. An international site puts the reader's browser languages (the best
// match of Accept-Language among `known`, the API's language codes) before its default.
export function resolveRequestLanguage({ query = {}, req } = {}, known = null) {
  const fromQuery = Array.isArray(query.lang) ? query.lang[0] : query.lang;
  if (!INTERNATIONAL) {
    if (isLanguageCode(fromQuery)) return normalizeLanguage(fromQuery);
    return normalizeLanguage(cookieOf(req, LANGUAGE_COOKIE));
  }
  if (isKnown(fromQuery, known)) return normalizeLanguage(fromQuery);
  return resolvePreferredLanguage({ req }, known);
}

// The reader's preference, without a one-off `?lang=` override.
export function resolvePreferredLanguage({ req } = {}, known = null) {
  const fromCookie = cookieOf(req, LANGUAGE_COOKIE);
  if (isKnown(fromCookie, known)) return normalizeLanguage(fromCookie);
  if (!INTERNATIONAL) return DEFAULT_LANGUAGE;
  return (known && matchLanguage(parseAcceptLanguage(acceptLanguageOf(req)), known)) || DEFAULT_LANGUAGE;
}

function isKnown(code, known) {
  return isLanguageCode(code) && (!known || known.has(normalizeLanguage(code)));
}

export function readLanguageCookie() {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${LANGUAGE_COOKIE}=([^;]*)`));
  return match && isLanguageCode(match[1]) ? match[1] : null;
}

export function writeLanguageCookie(code) {
  if (typeof document === "undefined") return;
  const value = normalizeLanguage(code);
  document.cookie = `${LANGUAGE_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
}

// ---------------------------------------------------------------- interface language

// The interface follows the content language. For the site's own content language it is the
// site's interface: its `ui` when lib/locales has that catalog, else English (lib/i18n
// interfaceLanguageFor), so kr keeps a Korean interface over its English content. For any
// other language it is that language's catalog when there is one, else the site's interface
// again. Right-to-left catalogs are not used until the layout supports them (lib/i18n
// RTL_INTERFACES); Arabic, Urdu and Kurdish content keeps its own dir.
export const SITE_INTERFACE = interfaceLanguageFor(site.ui);

export function interfaceFor(lang) {
  const code = normalizeLanguage(lang);
  if (code === DEFAULT_LANGUAGE) return SITE_INTERFACE;
  return isInterfaceLanguage(code) ? code : SITE_INTERFACE;
}

// Server side, per request: the interface of the page's content language.
export function resolveInterfaceLanguage(context = {}, known = null) {
  return interfaceFor(resolveRequestLanguage(context, known));
}

// BCP 47 tag of an interface, for Intl date formats, and its og:locale: the country's
// (ogLocale bn_BD -> bn-BD) for the site's own `ui`, else the catalog's own `locale` (lib/i18n
// catalogLocale; given here so that this module does not need the catalog loaded).
export function interfaceLocale(ui, catalogLocale) {
  if (ui === site.ui && site.ogLocale) return site.ogLocale.replace("_", "-");
  return catalogLocale || "en-US";
}

export const interfaceOgLocale = (ui, catalogLocale) => interfaceLocale(ui, catalogLocale).replace("-", "_");

// Order of language lists (settings, search filters, sources): the country's content
// language first, then English, then by name.
export function compareLanguages(a, b) {
  const rank = (code) => (code === DEFAULT_LANGUAGE ? 0 : code === "en" ? 1 : 2);
  return rank(a.code) - rank(b.code) || String(a.name || a.code).localeCompare(String(b.name || b.code));
}
