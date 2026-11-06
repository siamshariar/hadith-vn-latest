// Extra translations, stacked under each hadith as quran.com stacks them.
//
// The reader has a primary content language (lib/language.js: the
// hadith_lang cookie, ?lang= for one view) and can add up to two more. Those
// are kept in the hadith_tr cookie, so pages rendered on the server ask the
// API for them (?translations=), and a link can carry them for one view with
// ?tr=bn,ur (an empty ?tr= shows none). Arabic is never one of them: the
// original text is always shown. Until the reader chooses, an international
// site (ac) shows English under any other language (defaultTranslations).

import { INTERNATIONAL, isLanguageCode } from "./language";

export const TRANSLATIONS_COOKIE = "hadith_tr";
export const TRANSLATIONS_PARAM = "tr";
export const MAX_EXTRA_TRANSLATIONS = 2;

// "bn,ur" (or ["bn", "ur"]) -> ["bn", "ur"]: language codes only, in the
// reader's order, without Arabic, the primary language or repeats, at most two.
export function parseTranslations(value, primary) {
  const text = Array.isArray(value) ? value.join(",") : String(value ?? "");
  const codes = [];
  text.split(/[\s,]+/).forEach((part) => {
    const code = part.trim().toLowerCase();
    if (!isLanguageCode(code) || code === "ar" || code === primary || codes.includes(code)) return;
    if (codes.length < MAX_EXTRA_TRANSLATIONS) codes.push(code);
  });
  return codes;
}

// The extras before the reader has chosen any (no hadith_tr cookie, no ?tr=): on an
// international site the English translation under any other language, as quran.com
// shows one; none on a country's site.
export function defaultTranslations(primary) {
  return INTERNATIONAL && primary !== "en" ? ["en"] : [];
}

// Server side: ?tr= wins for this view, then the saved cookie (empty: the reader chose
// none), then the default.
export function resolveRequestTranslations({ query = {}, req } = {}, primary) {
  if (query[TRANSLATIONS_PARAM] !== undefined) return parseTranslations(query[TRANSLATIONS_PARAM], primary);
  const saved = req && req.cookies ? req.cookies[TRANSLATIONS_COOKIE] : undefined;
  if (typeof saved === "string") return parseTranslations(saved, primary);
  return defaultTranslations(primary);
}

// The saved extras (null when the reader never chose any).
export function readTranslationsCookie() {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${TRANSLATIONS_COOKIE}=([^;]*)`));
  if (!match) return null;
  let value = match[1];
  try {
    value = decodeURIComponent(value);
  } catch (_) {
    // keep the raw value; parseTranslations drops anything that is not a code
  }
  return parseTranslations(value);
}

export function writeTranslationsCookie(codes) {
  if (typeof document === "undefined") return;
  const value = encodeURIComponent(parseTranslations(codes).join(","));
  document.cookie = `${TRANSLATIONS_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
}

// For links: ["bn", "ur"] -> "bn,ur".
export const translationsParam = (codes) => parseTranslations(codes).join(",");

// The primary translation as the reader sees it (unchanged by the extras):
// - the hadith's own translation in the language;
// - else HadeethEnc's translation of the same wording (`linked`), with the
//   collection's English kept aside (`fallback`, folded);
// - else the English fallback, labelled; else nothing (the Arabic stands alone).
export function primaryTranslation(hadith) {
  const own = hadith && hadith.translation && hadith.translation.text ? hadith.translation : null;
  const linked = hadith && hadith.linkedTranslation && hadith.linkedTranslation.text ? hadith.linkedTranslation : null;
  if (own && !own.isFallback) return { own, linked: null, fallback: null };
  if (linked) return { own: null, linked, fallback: own };
  return { own, linked: null, fallback: null };
}

// The extra languages the page asked for (lib/api adds `extraLanguages`:
// { code, name, nativeName, direction } in the reader's order), each with
// what the API has in it: the hadith's own translation, HadeethEnc's
// translation of the same wording (`entry.linked` set), or nothing (`entry`
// null: "not translated into X"). The English fallback shown as the primary
// translation is not shown twice.
export function extraTranslations(hadith) {
  if (!hadith || !Array.isArray(hadith.extraLanguages)) return [];
  const entries = Array.isArray(hadith.translations) ? hadith.translations : [];
  const { own } = primaryTranslation(hadith);
  const shownFallback = own && own.isFallback ? own.languageCode : null;
  return hadith.extraLanguages
    .filter((language) => language && language.code !== shownFallback)
    .map((language) => ({
      ...language,
      entry: entries.find((entry) => entry && entry.languageCode === language.code && entry.text) || null,
    }));
}

// The folded English fallback under a linked primary translation is left out
// when the reader asked for English as an extra: it is shown there, open.
export function fallbackShownAsExtra(hadith) {
  const { fallback } = primaryTranslation(hadith);
  if (!fallback) return false;
  return extraTranslations(hadith).some((slot) => slot.code === fallback.languageCode && slot.entry);
}

// One-off view settings a link keeps from page to page: ?lang= and ?tr= (and `also`, more names).
export function keptQuery(query, also = []) {
  const params = new URLSearchParams();
  if (query.lang) params.set("lang", String(query.lang));
  if (query[TRANSLATIONS_PARAM] !== undefined) params.set(TRANSLATIONS_PARAM, String(query[TRANSLATIONS_PARAM]));
  also.forEach((name) => {
    if (query[name] !== undefined) params.set(name, String(query[name]));
  });
  const text = params.toString();
  return text ? `?${text.replace(/%2C/gi, ",")}` : "";
}
