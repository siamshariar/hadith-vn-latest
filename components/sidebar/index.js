"use client";

import { useState, useEffect, useId, useMemo, useContext } from "react";
import Link from "next/link";
import Skeleton from "react-loading-skeleton";
import Collapse from "@mui/material/Collapse";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CloseIcon from "@mui/icons-material/Close";
import Scrollbar from "../core/scrollbar";
import ErrorState from "../core/error";
import SearchIcon from "../icons/Search";
import { SettingsContext } from "../../contexts/SettingsContext";
import { useLocale } from "../../contexts/LocaleContext";
import useApi from "../../hooks/useApi";
import { buildCategoryTree, getBook, getBooks, getCategories, readableCategories } from "../../lib/api";
import {
  UNASSIGNED_CHAPTER,
  bookPath,
  categoryHadithsPath,
  categoryPath,
  chapterPath,
  shortBookName,
} from "../../lib/hadith";
import styles from "./index.module.scss";

// Case- and accent-insensitive matching, so "giao ly" finds "Giáo lý".
const fold = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();

// A branch of the tree: its link, then a separate toggle for what is under it
// (the disclosure pattern; a link inside the toggle's button would be a control
// inside a control). The toggle names what it shows: "Books of Sahih al-Bukhari".
function Branch({ id, open, onToggle, label, link, children }) {
  return (
    <div>
      <div className={styles.branch}>
        {link}
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={open ? "true" : "false"}
          aria-controls={id}
          aria-label={label}
          onClick={onToggle}
        >
          <ExpandMoreIcon />
        </button>
      </div>
      <Collapse in={open} unmountOnExit>
        <div id={id} className={styles.branchBody}>
          {children}
        </div>
      </Collapse>
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      <Skeleton count={10} height={22} style={{ marginBottom: 10 }} />
    </div>
  );
}

// Parent categories open the category page (subcategories); leaf categories
// open their hadith list.
const categoryHref = (category) =>
  category.totalChildren > 0 || (category.children && category.children.length > 0)
    ? categoryPath(category)
    : categoryHadithsPath(category);

function CategoryLink({ category, active, level, parent }) {
  return (
    <Link
      href={categoryHref(category)}
      className={`${styles.list} ${active ? styles.active : ""} ${parent ? styles.parent : ""}`}
      aria-current={active ? "page" : undefined}
      style={{ paddingLeft: `${5 + level * 4}px` }}
    >
      <bdi>{category.title}</bdi>
      {category.totalHadith > 0 && <span className={styles.count}> ({category.totalHadith})</span>}
    </Link>
  );
}

// The category ids to open so that `selectedId` is visible.
function branchTo(categories, selectedId) {
  const open = new Set();
  if (selectedId == null || !categories.length) return open;
  const byId = new Map(categories.map((category) => [category.id, category]));
  let current = byId.get(selectedId);
  if (current && current.totalChildren > 0) open.add(current.id);
  while (current && current.parentId != null) {
    open.add(current.parentId);
    current = byId.get(current.parentId);
  }
  return open;
}

// `initial`: { categories, partial } from the server. A partial list (the
// top level and the open branch) paints at once; the full list, needed for
// the other branches and the filter, follows in the background. Only the
// categories with something to read in the language (lib/api
// readableCategories), like the server's.
function CategoryTree({ selectedCategoryId, filter, initial, enabled }) {
  const { lang, t } = useLocale();
  const treeId = useId();
  const partial = Boolean(initial && initial.partial);
  const { data, error, retry } = useApi(`categories:${lang}`, () => getCategories(lang), {
    enabled: enabled && (!initial || partial),
  });
  const categories = useMemo(
    () => (Array.isArray(data) && data.length ? readableCategories(data, lang) : (initial && initial.categories) || []),
    [initial, data, lang]
  );
  const tree = useMemo(() => buildCategoryTree(categories), [categories]);
  // Server-provided data renders the open branch on the first paint.
  const [expanded, setExpanded] = useState(() => branchTo(categories, selectedCategoryId));

  // Open the branch that leads to the current category.
  useEffect(() => {
    const open = branchTo(categories, selectedCategoryId);
    if (open.size) setExpanded((previous) => new Set([...previous, ...open]));
  }, [selectedCategoryId, categories]);

  if (error && !categories.length) return <ErrorState error={error} onRetry={retry} compact />;
  if (!categories.length) return <SidebarSkeleton />;

  if (filter) {
    const query = fold(filter);
    const matches = categories.filter(
      (category) => fold(category.title).includes(query) || fold(category.titleArabic).includes(query)
    );
    if (!matches.length) return <div className={styles.empty}>{t("noHadiths")}</div>;
    return matches.map((category) => (
      <CategoryLink key={category.id} category={category} active={category.id === selectedCategoryId} level={0} />
    ));
  }

  const toggle = (id) =>
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const renderNodes = (nodes, level = 0) =>
    nodes.map((category) => {
      const active = category.id === selectedCategoryId;
      if (!category.children.length && !(category.totalChildren > 0)) {
        return <CategoryLink key={category.id} category={category} active={active} level={level} />;
      }
      return (
        <Branch
          key={category.id}
          id={`${treeId}-${category.id}`}
          open={expanded.has(category.id)}
          onToggle={() => toggle(category.id)}
          label={`${t("subcategories")}: ${category.title}`}
          link={<CategoryLink category={category} active={active} level={level} parent />}
        >
          {/* children not in the partial list yet: the full list is on its way */}
          {category.children.length ? (
            renderNodes(category.children, level + 1)
          ) : (
            <Skeleton count={3} height={18} style={{ marginBottom: 8 }} />
          )}
        </Branch>
      );
    });

  return renderNodes(tree);
}

function BookChapters({ book, selectedChapterNo, active, initial }) {
  const { lang, t } = useLocale();
  const { data, error, retry } = useApi(`book:${book.slug}:${lang}`, () => getBook(book.slug, lang), {
    enabled: !initial,
  });
  const chapters = initial || (data && data.chapters);

  if (error && !chapters) return <ErrorState error={error} onRetry={retry} compact />;
  if (!chapters) return <Skeleton count={4} height={18} style={{ marginBottom: 8 }} />;

  return chapters.map((chapter) => {
    const isActive = active && chapter.chapterNo === selectedChapterNo;
    const label = chapter.chapterNo === UNASSIGNED_CHAPTER ? t("unassignedChapter") : chapter.name;
    return (
      <Link
        key={chapter.chapterNo}
        href={chapterPath(book.slug, chapter.chapterNo)}
        className={`${styles.list} ${styles.chapter} ${isActive ? styles.active : ""}`}
        aria-current={isActive ? "page" : undefined}
      >
        {chapter.chapterNo !== UNASSIGNED_CHAPTER && <span className={styles.chapterNo}>{chapter.chapterNo}.</span>}
        <span>{label}</span>
        <span className={styles.count}> ({chapter.totalHadith})</span>
      </Link>
    );
  });
}

function BookTree({ selectedBookSlug, selectedChapterNo, filter, initial, enabled }) {
  const { lang, t } = useLocale();
  const treeId = useId();
  const initialBooks = initial && initial.books;
  const initialChapters = (initial && initial.chapters) || {};
  const { data, error, retry } = useApi(`books:${lang}`, () => getBooks(lang), {
    enabled: enabled && !initialBooks,
  });
  const books = initialBooks || (Array.isArray(data) ? data : []);
  const [expanded, setExpanded] = useState(() => new Set(selectedBookSlug ? [selectedBookSlug] : []));

  useEffect(() => {
    if (selectedBookSlug) setExpanded((previous) => new Set([...previous, selectedBookSlug]));
  }, [selectedBookSlug]);

  // Load the open book's chapters together with the list, not after it
  // (getBook is memoised, so BookChapters reuses this request).
  useEffect(() => {
    if (enabled && selectedBookSlug && !initialChapters[selectedBookSlug]) {
      getBook(selectedBookSlug, lang).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, selectedBookSlug, lang]);

  if (error && !books.length) return <ErrorState error={error} onRetry={retry} compact />;
  if (!books.length) return <SidebarSkeleton />;

  const query = fold(filter);
  const visible = query
    ? books.filter((book) => [book.name, book.nameEnglish, book.nameArabic].some((name) => fold(name).includes(query)))
    : books;
  if (!visible.length) return <div className={styles.empty}>{t("noHadiths")}</div>;

  const toggle = (slug) =>
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });

  return visible.map((book) => {
    const active = book.slug === selectedBookSlug;
    const isOpen = expanded.has(book.slug);
    const current = active && selectedChapterNo == null;
    return (
      <Branch
        key={book.slug}
        id={`${treeId}-${book.slug}`}
        open={isOpen}
        onToggle={() => toggle(book.slug)}
        label={t("chaptersOf", { name: shortBookName(book) })}
        link={
          <Link
            href={bookPath(book)}
            className={`${styles.list} ${current ? styles.active : ""} ${styles.parent}`}
            aria-current={current ? "page" : undefined}
          >
            <span>{shortBookName(book)}</span>
            <span className={styles.count}> ({book.totalHadith})</span>
          </Link>
        }
      >
        <BookChapters
          book={book}
          selectedChapterNo={selectedChapterNo}
          active={active}
          initial={initialChapters[book.slug]}
        />
      </Branch>
    );
  });
}

// Only shown from 1024px (the layouts' aside); phones get the tree in a
// dialog (CategoryModal), which loads it when opened.
const DESKTOP = "(min-width: 1024px)";

function useShown(lazy) {
  const [shown, setShown] = useState(!lazy);
  useEffect(() => {
    if (!lazy) return undefined;
    const query = window.matchMedia(DESKTOP);
    const update = () => setShown(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [lazy]);
  return shown;
}

// `data`: what the page's server props already hold (components/sidebar/
// data.js), rendered on the first paint: { books, chapters: { slug: [...] } }
// or { categories, partial }. Anything missing is loaded in the browser; with `lazy`,
// only on screens that show the sidebar.
export default function Sidebar({
  mode = "categories",
  selectedCategoryId,
  selectedBookSlug,
  selectedChapterNo,
  data,
  lazy = false,
}) {
  const { theme } = useContext(SettingsContext);
  const { t } = useLocale();
  const isBooksMode = mode === "books";
  const [search, setSearch] = useState("");
  const enabled = useShown(lazy);

  return (
    <div className={`${styles.wrapper} ${theme}`}>
      <div className={styles.top}>
        <div className={styles.search}>
          <span className={`${styles.icon} ${styles.search_icon}`}>
            <SearchIcon />
          </span>
          {search && (
            <button
              type="button"
              className={`${styles.icon} ${styles.close_icon}`}
              onClick={() => setSearch("")}
              aria-label={t("clearFilter")}
            >
              <CloseIcon />
            </button>
          )}
          <input
            type="search"
            name="filter"
            value={search}
            placeholder={isBooksMode ? t("books") : t("categories")}
            aria-label={isBooksMode ? t("books") : t("categories")}
            className={styles.input}
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Escape" || !search) return;
              e.preventDefault();
              e.stopPropagation();
              setSearch("");
            }}
          />
        </div>
      </div>
      <div className={styles.content}>
        <Scrollbar className={styles.category}>
          <nav className={styles.lists} aria-label={isBooksMode ? t("books") : t("categories")}>
            {isBooksMode ? (
              <BookTree
                selectedBookSlug={selectedBookSlug}
                selectedChapterNo={selectedChapterNo}
                filter={search.trim()}
                initial={data && data.books ? data : null}
                enabled={enabled}
              />
            ) : (
              <CategoryTree
                selectedCategoryId={selectedCategoryId}
                filter={search.trim()}
                initial={data && data.categories ? data : null}
                enabled={enabled}
              />
            )}
          </nav>
        </Scrollbar>
      </div>
    </div>
  );
}
