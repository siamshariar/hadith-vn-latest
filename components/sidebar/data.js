import { getBook, getBooks, getCategories, readableCategories } from "../../lib/api";

// Server side (getServerSideProps): the sidebar's data as a page prop
// (`sidebarData`), so the desktop sidebar comes with the page instead of
// after hydration and one or two requests in a row. Only the fields the
// sidebar shows (and filters by: the English name too, under a name in the
// reader's language or the topic collection's interface name); getBooks / getBook / getCategories are memoised in
// lib/api, so pages that already fetched them pay nothing.
const slimBook = ({ slug, code, source, name, nameEnglish, nameArabic, totalHadith }) => ({
  slug,
  code,
  source,
  name,
  nameEnglish: nameEnglish || null,
  nameArabic: nameArabic || null,
  totalHadith,
});

const slimChapter = ({ chapterNo, name, totalHadith }) => ({ chapterNo, name, totalHadith });

// Books mode. `book` is a slug or an already fetched book (its chapters).
export async function sidebarBooksData(lang, { book = null, books = null } = {}) {
  const [list, current] = await Promise.all([
    books || getBooks(lang),
    typeof book === "string" ? getBook(book, lang).catch(() => null) : book,
  ]);
  const chapters = {};
  if (current && Array.isArray(current.chapters)) chapters[current.slug] = current.chapters.map(slimChapter);
  return { books: (list || []).map(slimBook), chapters };
}

const slimCategory = ({ id, parentId, slug, title, totalHadith, totalChildren }) => ({
  id,
  parentId: parentId ?? null,
  slug: slug || null,
  title,
  totalHadith,
  totalChildren: totalChildren || 0,
});

// Categories mode: the top level and the branch down to `selectedId` (with
// its children), a few KB instead of the whole 493-category list; the
// sidebar loads the rest in the browser. Only the categories with something
// to read in the language (lib/api readableCategories). Null when the API
// fails (the sidebar then loads everything itself).
export async function sidebarCategoriesData(lang, selectedId = null) {
  try {
    const all = readableCategories(await getCategories(lang), lang);
    const byId = new Map(all.map((category) => [category.id, category]));
    const open = new Set();
    let current = selectedId != null ? byId.get(selectedId) : null;
    if (current && current.totalChildren > 0) open.add(current.id);
    while (current && current.parentId != null) {
      open.add(current.parentId);
      current = byId.get(current.parentId);
    }
    const shown = all.filter((category) => category.parentId == null || open.has(category.parentId));
    return { categories: shown.map(slimCategory), partial: shown.length < all.length };
  } catch (_) {
    return null;
  }
}
