// Routes and display helpers for API hadith objects.

import { isTopicCollection, nameOfBook } from "./names";

const segment = (value) => encodeURIComponent(String(value));

// Citations use the API's `referenceNumber`, the number people cite.
export const hadithPath = (hadith) => `/hadiths/${segment(hadith.id)}`;
export const bookPath = (book) => `/books/${segment(book.slug || book.code || book.id)}`;
export const chapterPath = (bookSlug, chapterNo) => `/books/${segment(bookSlug)}/chapters/${segment(chapterNo)}`;
export const bookHadithPath = (bookSlug, referenceNumber) =>
  `/books/${segment(bookSlug)}/hadiths/${segment(referenceNumber)}`;
export const categoryPath = (category) => `/categories/${segment(category.slug || category.id)}`;
export const categoryHadithsPath = (category) => `${categoryPath(category)}/hadiths`;

// A list's address with its view and page in the path, not the query, so every page of a list is
// built and kept like any other page (getStaticProps): /books/sahih-muslim/chapters/3/translated/
// page/2, /categories/the-creed/hadiths/all/direct/page/4. Page 1 has no /page/1.
const LIST_FLAGS = ["translated", "all", "direct"];
export function listPath(base, { translated = false, all = false, direct = false, page = 1 } = {}) {
  const flags = { translated, all, direct };
  const parts = [base, ...LIST_FLAGS.filter((flag) => flags[flag])];
  if (page > 1) parts.push("page", String(page));
  return parts.join("/");
}

// The view and page of a list from its path segments (params.view of a [[...view]] page), in the
// order listPath writes them. `allowed`: the flags this list has. null: no such page (404);
// `canonical: false`: the same page under another address (/page/1), to redirect.
export function parseListView(segments, allowed) {
  const rest = Array.isArray(segments) ? [...segments] : [];
  const view = { translated: false, all: false, direct: false, page: 1, canonical: true };
  for (const flag of LIST_FLAGS) {
    if (rest[0] !== flag) continue;
    if (!allowed.includes(flag)) return null;
    view[flag] = true;
    rest.shift();
  }
  if (rest.length === 0) return view;
  if (rest.length !== 2 || rest[0] !== "page" || !/^[1-9]\d{0,4}$/.test(rest[1])) return null;
  view.page = Number(rest[1]);
  if (view.page === 1) view.canonical = false;
  return view;
}

// Home › Categories › ancestors (from the API's `breadcrumbs`) › category.
export function categoryCrumbs(category, t, { linkCurrent = false } = {}) {
  return [
    { href: "/", label: t("home") },
    { href: "/categories", label: t("categories") },
    ...(category.breadcrumbs || []).map((crumb) => ({ href: categoryPath(crumb), label: crumb.title })),
    linkCurrent ? { href: categoryPath(category), label: category.title } : { label: category.title },
  ];
}

export const UNASSIGNED_CHAPTER = -1;

// Sahih Muslim's sub-narrations are written 8.01, 8.02 ... and cited 8a, 8b
// (the API accepts both). Other numbers are returned unchanged.
export function lettered(number) {
  const match = String(number ?? "").match(/^(\d+)\.(\d{2})$/);
  if (!match) return number == null ? "" : String(number);
  const index = parseInt(match[2], 10);
  return index >= 1 && index <= 26 ? `${match[1]}${String.fromCharCode(96 + index)}` : String(number);
}

// "1–7" from a chapter's hadithStart / hadithEnd, sunnah.com style. None for
// the source's unassigned group or HadeethEnc's technical chapter, whose
// numbers are not a contiguous range.
export function chapterRange(chapter, book) {
  if (!chapter || chapter.chapterNo === UNASSIGNED_CHAPTER || isCategoryBook(book)) return null;
  const { hadithStart, hadithEnd } = chapter;
  if (!hadithStart) return null;
  const start = lettered(hadithStart);
  const end = hadithEnd ? lettered(hadithEnd) : start;
  return start === end ? start : `${start}–${end}`;
}
// HadeethEnc has a single technical chapter; its real structure is the category tree.
export const isCategoryBook = (book) => isTopicCollection(book);

// HadeethEnc's terms ask whoever shows its content to name it as the source. The site
// does so in one line, "Nguồn: HadeethEnc.com" (lib/citation sourceLine), on its hadiths
// and under its translations; nothing else on the site names a source.
export const HADEETHENC_SOURCE = "HadeethEnc.com";

// The name citations use ("Sahih al-Bukhari 1"): the collection's, as the site shows it.
export function shortBookName(book) {
  if (!book) return "";
  return book.name || book.nameEnglish || "";
}

// The grades shown with their grader (Al-Albani, Darussalam ...). HadeethEnc grades its
// own hadiths: that grade is the hadith's `gradeText`, shown without a source name, so
// its entry in `grades` (the same grade, under HadeethEnc's name) is left out.
export function namedGrades(hadith, book) {
  if (!hadith || isCategoryBook(book || hadith.book)) return [];
  return (hadith.grades || []).filter((grade) => grade && grade.grade);
}

export function citation(hadith, book) {
  const name = shortBookName(book);
  return [name, lettered(hadith.referenceNumber)].filter(Boolean).join(" ");
}

// The URL people cite, /books/{book}/hadiths/8a; by id for the records the
// source does not number. Reference numbers are unique within a book.
export function citablePath(hadith, book) {
  const slug = hadith.bookSlug || (book && book.slug);
  if (!hadith.referenceNumber || !slug) return hadithPath(hadith);
  return bookHadithPath(slug, lettered(hadith.referenceNumber));
}

// Start of a text for descriptions, cut at a word boundary.
export function excerpt(text, max = 160) {
  const flat = cleanText(text).replace(/\s+/g, " ");
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.]+$/, "")}…`;
}

// Source text uses \r\n in places (e.g. HadeethEnc benefits).
export const cleanText = (text) => String(text || "").replace(/\r\n?/g, "\n").trim();

export function booksBySlug(books) {
  const map = {};
  (books || []).forEach((book) => {
    map[book.slug] = book;
  });
  return map;
}

// Minimal, serialisable reference stored for bookmarks, pins and last read.
// Version 2 = ids of the quran-api hadith endpoints. Entries without it come
// from the retired API, whose ids point to different hadiths. The book's name
// is the source's (English): lists show it in the reader's language when
// lib/names has it (storedRefBook).
export const STORAGE_VERSION = 2;

export function storedHadithRef(hadith, book) {
  return {
    v: STORAGE_VERSION,
    id: hadith.id,
    book_slug: hadith.bookSlug || (book && book.slug) || null,
    book_name: shortBookName(book && { ...book, name: book.nameEnglish || book.name }) || null,
    hadith_number: hadith.referenceNumber || null,
    chapter_no: hadith.chapterNo ?? null,
    title: hadith.title || null,
  };
}

export const isCurrentStoredRef = (entry) => Boolean(entry) && entry.v === STORAGE_VERSION;

// Display and navigation for stored references (pins, last read, bookmarks).
// `names`: the book names of the reader's language (lib/names loadNames, hooks/useNames);
// `topic`: the topic collection's name in the interface (t("topicCollection")).
export const storedRefBook = (entry, names, topic) =>
  (entry.book_slug === "hadeethenc" ? topic : nameOfBook(names, entry.book_slug)) || entry.book_name;

export const storedRefLabel = (entry, names, topic) =>
  (entry.title && cleanText(entry.title)) ||
  [storedRefBook(entry, names, topic), lettered(entry.hadith_number)].filter(Boolean).join(" ") ||
  `#${entry.id}`;

export const storedRefSource = (entry, names, topic) =>
  [storedRefBook(entry, names, topic), lettered(entry.hadith_number)].filter(Boolean).join(" ");

// A pin remembers where it was made (e.g. a chapter page, anchored to the
// card); anything else opens the hadith page.
export const storedRefHref = (entry, { preferContext = false } = {}) => {
  const context = entry.source_url;
  if (preferContext && typeof context === "string" && context.startsWith("/") && !context.startsWith("//")) {
    return context;
  }
  return `/hadiths/${segment(entry.id)}`;
};
