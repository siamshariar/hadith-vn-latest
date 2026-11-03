// Book names in the content language. The API names the collections in English (and in
// Arabic); lib/names/<lang>.json has, for one language, the names that a source attests:
// { "books": { slug: name }, "bookSources": { slug: "wikidata:Q… label" | "api:nameArabic" } }.
// Chapters keep the API's names. lib/api applies the names to what it returns, on the server
// and in the browser, so every page shows them (applyNames below): a book's `name` becomes the
// file's (`nameEnglish` and `nameArabic` stay the API's). A book the file does not have, or a
// language without a file, keeps the API's name.
//
// The topic collection (HadeethEnc's hadiths, by category) is not named by a source but by the
// interface: its `name` is the interface's "topicCollection" string, which lib/api passes in
// (`topic`), in every language.
//
// Each language's file is loaded the first time it is needed, as a chunk of its own in the
// browser. NAMES_FIXTURE=1 (test builds only, next.config.js) reads scripts/e2e/fixtures/names
// instead: a few names the end-to-end suite checks.
const LANGUAGE_CODE = /^[a-z]{2,3}$/;
const loaded = new Map();

const importNames = (lang) =>
  process.env.NAMES_FIXTURE === "1" ? import(`../scripts/e2e/fixtures/names/${lang}.json`) : import(`./names/${lang}.json`);

// The names of a language, or null when it has none.
export function loadNames(lang) {
  const code = String(lang || "");
  if (!LANGUAGE_CODE.test(code)) return Promise.resolve(null);
  if (!loaded.has(code)) {
    loaded.set(
      code,
      importNames(code).then(
        (module) => module.default || module,
        () => null
      )
    );
  }
  return loaded.get(code);
}

// The topic collection, by its slug, code or source (lib/hadith isCategoryBook uses this).
export const TOPIC_COLLECTION = "hadeethenc";
export const isTopicCollection = (book) =>
  Boolean(book) && (book.source === TOPIC_COLLECTION || book.code === TOPIC_COLLECTION || book.slug === TOPIC_COLLECTION);

// A book's name in `names` (loadNames), or null.
export const nameOfBook = (names, slug) => (names && names.books && slug ? names.books[slug] : null) || null;

// `naming`: { names, topic }, the language's names and the topic collection's name.
function nameBook(book, naming) {
  if (!book || typeof book !== "object") return;
  const name = isTopicCollection(book) ? naming.topic : nameOfBook(naming.names, book.slug);
  if (name) book.name = name;
}

function nameHadith(hadith, naming) {
  if (!hadith || typeof hadith !== "object") return;
  nameBook(hadith.book, naming);
  // "Cũng có trong": { bookSlug, bookName, ... }
  (Array.isArray(hadith.related) ? hadith.related : []).forEach((item) => {
    const name = item.bookSlug === TOPIC_COLLECTION ? naming.topic : nameOfBook(naming.names, item.bookSlug);
    if (name) item.bookName = name;
  });
}

// Puts the names into an API response, in place (each response is named once, before it is
// cached). `naming`: { names (loadNames), topic (the topic collection's name in the
// interface) }. `shape`: "books" (the list), "book", "chapter" (a chapter's hadiths, with
// their book), "hadith" or "home" (its books and daily hadith).
export function applyNames(data, naming, shape) {
  if (!data || typeof data !== "object") return data;
  const given = { names: (naming && naming.names) || null, topic: (naming && naming.topic) || null };
  if (shape === "books") {
    (Array.isArray(data) ? data : []).forEach((book) => nameBook(book, given));
  } else if (shape === "book") {
    nameBook(data, given);
  } else if (shape === "chapter") {
    nameBook(data.book, given);
  } else if (shape === "hadith") {
    nameHadith(data, given);
  } else if (shape === "home") {
    (Array.isArray(data.books) ? data.books : []).forEach((book) => nameBook(book, given));
    nameHadith(data.dailyHadith, given);
  }
  return data;
}
