// Client for the hadith endpoints of the Quran API (see quran-api/docs/HADITH_API.md).
// Every content endpoint is GET /hadith/.../localizations/{loc}; the response
// echoes the language actually used. Nothing here falls back to local data:
// when the API fails, callers get an ApiError and show an error state. Book names
// come back in the content language (lib/names.js), the topic collection's in the
// interface's.

import { config } from "./config";
import { loadCatalog, translate } from "./i18n";
import {
  DEFAULT_LANGUAGE,
  INTERNATIONAL,
  SITE_INTERFACE,
  interfaceFor,
  normalizeLanguage,
  resolvePreferredLanguage,
  resolveRequestLanguage,
} from "./language";
import { applyNames, loadNames } from "./names";
import { parseTranslations, resolveRequestTranslations } from "./translations";

const HADITH_API = `${config.apiBaseUrl}/hadith`;

// Request headers. A staging API behind a free ngrok tunnel answers browsers with a
// warning page instead of JSON unless they send ngrok-skip-browser-warning; only such an
// API gets it (it costs a CORS preflight). Every other API gets CORS-safelisted headers
// only: the production API allows no extra request headers.
const API_HEADERS = /\.ngrok(-free)?\.(app|dev)$/.test(new URL(HADITH_API).hostname)
  ? { Accept: "application/json", "ngrok-skip-browser-warning": "1" }
  : { Accept: "application/json" };

export class ApiError extends Error {
  constructor(message, { status = 0, url = "" } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.url = url;
  }
}

function buildUrl(path, query) {
  const url = new URL(`${HADITH_API}${path}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

async function request(path, { query, signal } = {}) {
  const url = buildUrl(path, query);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.apiFetchTimeout);
  const forwardAbort = () => controller.abort();
  if (signal) signal.addEventListener("abort", forwardAbort);

  let response;
  try {
    response = await fetch(url, {
      headers: API_HEADERS,
      signal: controller.signal,
    });
  } catch (error) {
    if (signal && signal.aborted) throw error; // cancelled by the caller
    const timedOut = error && error.name === "AbortError";
    throw new ApiError(
      timedOut ? "The hadith API did not respond in time." : "The hadith API could not be reached.",
      { url }
    );
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", forwardAbort);
  }

  if (!response.ok) {
    let message = `The hadith API answered with HTTP ${response.status}.`;
    try {
      const body = await response.json();
      if (body && body.message) message = body.message;
    } catch (_) {
      // keep the generic message
    }
    throw new ApiError(message, { status: response.status, url });
  }

  try {
    return await response.json();
  } catch (_) {
    throw new ApiError("The hadith API returned an invalid response.", { status: response.status, url });
  }
}

// Small in-memory cache for reference data that rarely changes (languages,
// books, the category list). Failed requests are not cached.
const MEMO_TTL = 10 * 60 * 1000;
const memoStore = new Map();

function memo(key, load) {
  const hit = memoStore.get(key);
  if (hit && Date.now() - hit.at < MEMO_TTL) return hit.promise;
  const promise = load().catch((error) => {
    memoStore.delete(key);
    throw error;
  });
  memoStore.set(key, { at: Date.now(), promise });
  return promise;
}

const segment = (value) => encodeURIComponent(String(value));
const localization = (language) => `/localizations/${segment(normalizeLanguage(language))}`;

// A response with the book names of `language` (lib/names.js `shape`), loaded alongside the
// request, and the topic collection named in the interface of that language (its catalog
// is the page's, so it is there or loads with it; English until then).
function named(pending, language, shape) {
  const lang = normalizeLanguage(language);
  const ui = interfaceFor(lang);
  return Promise.all([pending, loadNames(lang), loadCatalog(ui).catch(() => null)]).then(([data, names]) =>
    applyNames(data, { names, topic: translate(ui, "topicCollection") }, shape)
  );
}

// ---------------------------------------------------------------- extra translations

// `translations` (lib/translations): extra languages to show under each
// hadith, sent as ?translations=bn,ur. The API adds `translations` to every
// hadith it returns, leaving out the languages it has nothing in; each
// hadith also gets `extraLanguages` here ({ code, name, nativeName,
// direction } of every language asked for, in order), so a page can say
// "not translated into X" and label each text without another request.
const translationsQuery = (codes) => {
  const list = parseTranslations(codes);
  return list.length ? list.join(",") : undefined;
};

function markExtraLanguages(result, extraLanguages) {
  const mark = (hadith) => {
    if (hadith && typeof hadith === "object" && "arabic" in hadith) hadith.extraLanguages = extraLanguages;
  };
  if (!result || typeof result !== "object") return;
  if (Array.isArray(result.hadiths)) result.hadiths.forEach(mark);
  if (result.dailyHadith) mark(result.dailyHadith);
  mark(result);
}

async function withExtras(pending, codes) {
  const list = parseTranslations(codes);
  if (!list.length) return pending;
  const [result, languages] = await Promise.all([pending, getLanguages().catch(() => [])]);
  const extraLanguages = list.map((code) => {
    const language = (languages || []).find((item) => item.code === code);
    return {
      code,
      name: (language && language.name) || code,
      nativeName: (language && (language.nativeName || language.name)) || code,
      direction: (language && language.direction) || "auto",
    };
  });
  markExtraLanguages(result, extraLanguages);
  return result;
}

// ---------------------------------------------------------------- endpoints

export function getLanguages() {
  return memo("languages", () => request("/languages"));
}

// Every source edition: { code, bookSlug, bookName, languageCode,
// languageName, languageNativeName, author, source, sourceUrl, totalHadith }.
export function getEditions() {
  return memo("editions", () => request("/editions"));
}

export function getHome(language, { translations, signal } = {}) {
  return withExtras(
    named(request(`/home${localization(language)}`, { query: { translations: translationsQuery(translations) }, signal }), language, "home"),
    translations
  );
}

export function getBooks(language) {
  const lang = normalizeLanguage(language);
  return memo(`books:${lang}`, () => named(request(`/books${localization(lang)}`), lang, "books"));
}

export function getBook(book, language) {
  const lang = normalizeLanguage(language);
  return memo(`book:${book}:${lang}`, () => named(request(`/books/${segment(book)}${localization(lang)}`), lang, "book"));
}

// `translated`: only hadiths readable in the language (own or linked translation).
export function getChapterHadiths(book, chapterNo, language, { page, perPage, translated, translations, signal } = {}) {
  return withExtras(
    named(
      request(`/books/${segment(book)}/chapters/${segment(chapterNo)}${localization(language)}`, {
        query: { page, perPage, translated: translated ? 1 : undefined, translations: translationsQuery(translations) },
        signal,
      }),
      language,
      "chapter"
    ),
    translations
  );
}

export function getBookHadith(book, number, language, { translations, signal } = {}) {
  return withExtras(
    named(
      request(`/books/${segment(book)}/hadiths/${segment(number)}${localization(language)}`, {
        query: { translations: translationsQuery(translations) },
        signal,
      }),
      language,
      "hadith"
    ),
    translations
  );
}

export function getCategories(language) {
  const lang = normalizeLanguage(language);
  return memo(`categories:${lang}`, () => request(`/categories${localization(lang)}`));
}

export function getCategory(category, language, options) {
  return request(`/categories/${segment(category)}${localization(language)}`, options);
}

// `direct`: leave out the subcategories' hadiths; `translated`: only hadiths
// translated into the language.
export function getCategoryHadiths(category, language, { page, perPage, direct, translated, translations, signal } = {}) {
  return withExtras(
    request(`/categories/${segment(category)}/hadiths${localization(language)}`, {
      query: {
        page,
        perPage,
        direct: direct ? 1 : undefined,
        translated: translated ? 1 : undefined,
        translations: translationsQuery(translations),
      },
      signal,
    }),
    translations
  );
}

export function getHadith(id, language, { translations, signal } = {}) {
  return withExtras(
    named(
      request(`/hadiths/${segment(id)}${localization(language)}`, {
        query: { translations: translationsQuery(translations) },
        signal,
      }),
      language,
      "hadith"
    ),
    translations
  );
}

export function getDailyHadith(language, { translations, signal } = {}) {
  return withExtras(
    named(request(`/daily${localization(language)}`, { query: { translations: translationsQuery(translations) }, signal }), language, "hadith"),
    translations
  );
}

export const MIN_SEARCH_LENGTH = 2;

export function searchHadiths(q, language, { page, perPage, book, translations, signal } = {}) {
  return withExtras(
    request(`/search${localization(language)}`, {
      query: { q, page, perPage, book, translations: translationsQuery(translations) },
      signal,
    }),
    translations
  );
}

// ---------------------------------------------------------------- helpers

// The categories a reader of `lang` can read something in (the API's totalTranslated), with
// the ones above them; in Arabic, the original, every one. The lists of categories (the home
// page, the category tree, the sidebar) show only these; the others' pages still open. A
// parent's `totalChildren` counts the children kept.
const readable = (category) => category.totalTranslated == null || category.totalTranslated > 0;

export function readableCategories(categories, lang) {
  const list = categories || [];
  if (normalizeLanguage(lang) === "ar") return list;
  const byId = new Map(list.map((category) => [category.id, category]));
  const kept = new Set();
  list.filter(readable).forEach((category) => {
    for (let node = category; node && !kept.has(node.id); node = byId.get(node.parentId)) kept.add(node.id);
  });
  const children = new Map();
  list.forEach((category) => {
    if (kept.has(category.id) && category.parentId != null) children.set(category.parentId, (children.get(category.parentId) || 0) + 1);
  });
  return list
    .filter((category) => kept.has(category.id))
    .map((category) => (category.totalChildren > 0 ? { ...category, totalChildren: children.get(category.id) || 0 } : category));
}

// The same for categories that come with their `children` (/hadith/home).
export function readableCategoryTree(categories, lang) {
  if (normalizeLanguage(lang) === "ar") return categories || [];
  return (categories || []).reduce((kept, category) => {
    const children = readableCategoryTree(category.children, lang);
    if (readable(category) || children.length) kept.push(category.children ? { ...category, children } : category);
    return kept;
  }, []);
}

// Flat category list (with parentId) -> top-level nodes with nested children.
export function buildCategoryTree(categories) {
  const nodes = new Map();
  (categories || []).forEach((category) => nodes.set(category.id, { ...category, children: [] }));
  const roots = [];
  nodes.forEach((node) => {
    const parent = node.parentId != null ? nodes.get(node.parentId) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });
  return roots;
}

// Minimal book records ({ slug, code, name, nameEnglish, source }) for the
// books that a list of hadiths comes from, so cards can cite "Sahih al-Bukhari 1".
export async function booksForHadiths(hadiths, language) {
  const slugs = new Set((hadiths || []).map((hadith) => hadith.bookSlug));
  if (!slugs.size) return {};
  const books = await getBooks(language);
  const map = {};
  books.forEach((book) => {
    if (slugs.has(book.slug)) {
      map[book.slug] = { slug: book.slug, code: book.code, name: book.name, nameEnglish: book.nameEnglish || null, source: book.source };
    }
  });
  return map;
}

export function parsePage(value) {
  const page = parseInt(Array.isArray(value) ? value[0] : value, 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

// The catalog a page's interface needs in the browser, sent with its props (English is in
// the bundle).
const catalogProp = (ui) => (ui === "en" ? Promise.resolve(null) : loadCatalog(ui).catch(() => null));

// Wraps getServerSideProps: resolves the content language and the extra
// translations (?tr=, else the hadith_tr cookie; see lib/translations), runs
// the loader and turns API failures into a 404 or an error state (never
// local data). The loader is called as loader(lang, { translations }) and
// returns `{ props }`, `{ notFound: true }` or `{ redirect }`; the page gets
// `translations` (the extra language codes) with its props, `uiLang`, the
// interface language, which follows the content language (lib/language.js
// interfaceFor), with `uiCatalog`, that interface's strings
// (contexts/LocaleContext.js, pages/_document.js), and `preferredLang`, the
// content language it would have without a one-off ?lang=.
export async function loadPage(context, loader) {
  let languages = null;
  try {
    languages = await getLanguages();
  } catch (_) {
    // Not fatal: the page loader reports API failures itself.
  }
  const known = languages ? new Set(languages.map((language) => language.code)) : null;
  let lang = resolveRequestLanguage(context, known);
  let languageInfo = null;
  if (languages) {
    // Unknown codes would silently come back in English; use the default instead.
    languageInfo = languages.find((language) => language.code === lang) || null;
    if (!languageInfo) {
      lang = DEFAULT_LANGUAGE;
      languageInfo = languages.find((language) => language.code === lang) || null;
    }
  }
  const uiLang = interfaceFor(lang);
  const preferredLang = resolvePreferredLanguage(context, known);
  if (INTERNATIONAL && context.res) context.res.setHeader("Vary", "Accept-Language, Cookie");
  // Codes the API does not know would only ever read "not translated".
  const translations = resolveRequestTranslations(context, lang).filter((code) => !known || known.has(code));
  const pending = catalogProp(uiLang);
  const locale = async () => ({ lang, uiLang, uiCatalog: await pending, preferredLang, languageInfo, translations });

  try {
    const result = (await loader(lang, { translations })) || { notFound: true };
    if (!result.props) return result;
    return { props: { ...(await locale()), ...result.props } };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return { notFound: true };
    }
    console.error(`[hadith-api] ${error.message}${error.url ? ` (${error.url})` : ""}`);
    if (context.res) context.res.statusCode = 502;
    return {
      props: {
        ...(await locale()),
        error: { message: error.message || "Unknown error", status: error.status || 0 },
      },
    };
  }
}

// getStaticProps of the pages built once, with no request (404, 500): the site's interface
// and its catalog. The browser then switches them to the reader's (contexts/LocaleContext.js).
export async function loadStaticPage(props = {}) {
  return { props: { uiLang: SITE_INTERFACE, uiCatalog: await catalogProp(SITE_INTERFACE), ...props } };
}
