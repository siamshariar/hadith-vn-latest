"use client";

import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Skeleton from "react-loading-skeleton";
import ErrorState from "../core/error";
import ReaderSettings from "../hadith/ReaderSettings";
import BackIcon from "../icons/NavigateBefore";
import BookmarkIcon from "../icons/BookmarkBorder";
import ChevronRightIcon from "../icons/ChevronRight";
import CloseIcon from "../icons/Close";
import ListIcon from "../icons/FormatListBulleted";
import MenuBookIcon from "../icons/MenuBook";
import PanelCloseIcon from "../icons/PanelClose";
import PanelOpenIcon from "../icons/PanelOpen";
import SearchIcon from "../icons/Search";
import SettingsIcon from "../icons/SettingsOutlined";
import { useLocale } from "../../contexts/LocaleContext";
import useApi from "../../hooks/useApi";
import { getBook, getBooks, getCategories, readableCategories } from "../../lib/api";
import {
  UNASSIGNED_CHAPTER,
  bookPath,
  categoryHadithsPath,
  categoryPath,
  chapterPath,
  isCategoryBook,
  listPath,
  shortBookName,
} from "../../lib/hadith";
import { NAV_KEY } from "../../lib/settings";
import styles from "./index.module.scss";

// Before the browser paints, so the list never jumps to the reader's place (useEffect on the server).
const useBeforePaint = typeof window === "undefined" ? useEffect : useLayoutEffect;

// Case- and accent-insensitive matching, so "giao ly" finds "Giáo lý".
const fold = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();

function NavSkeleton() {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      <Skeleton count={10} height={30} style={{ marginBottom: 12 }} />
    </div>
  );
}

// Parent categories open the category page (subcategories); leaf categories
// open their hadith list.
const categoryHref = (category) => (category.totalChildren > 0 ? categoryPath(category) : categoryHadithsPath(category));

// One row of the list: a link to a page (with `onClick` too, the list also goes down a level
// at once, while the page comes), or with `onClick` alone a button that goes down a level.
function Row({ href, onClick, current, number, name, note, count, more, label }) {
  const inner = (
    <>
      {number != null && <span className={styles.num}>{number}</span>}
      <span className={styles.name}>
        {name}
        {note && <small>{note}</small>}
      </span>
      {count != null && <span className={styles.count}>{count}</span>}
      {more && (
        <span className={styles.go}>
          <ChevronRightIcon />
        </span>
      )}
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className={styles.row}
        onClick={onClick}
        prefetch={false}
        aria-current={current ? (typeof current === "string" ? current : "page") : undefined}
        aria-label={label}
      >
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" className={styles.row} onClick={onClick} aria-current={current ? "true" : undefined} aria-label={label}>
      {inner}
    </button>
  );
}

// The navigation of the reading pages, the same on the web (the side card) and on phones and
// tablets (components/mobile/NavDrawer): two tabs, a filter, and one level of the tree at a
// time, books → chapters and categories → subcategories, the reader's place marked and in
// view. `mode` is the tab the page belongs to. `data`: what the page's server props already
// hold (components/sidebar/data.js), rendered on the first paint; anything else loads in the
// browser, only `enabled`. `after`: what follows the rows inside the list (the drawer's links).
export const Nav = forwardRef(function Nav(
  { mode = "categories", selectedCategoryId = null, selectedBookSlug = null, selectedChapterNo = null, data, enabled = true, after = null },
  ref
) {
  const { lang, t, formatNumber } = useLocale();
  const router = useRouter();
  // From chapter to chapter, the "only readable" filter stays (it is in the path).
  const translatedView = /\/translated(\/|$)/.test(String(router.asPath || "").split(/[?#]/)[0]);
  const ids = useId();
  // Where the reader has gone in the list; undefined: where the page is. A new page starts over.
  const [tabState, setTabState] = useState();
  const [bookState, setBookState] = useState();
  const [levelState, setLevelState] = useState();
  const [query, setQuery] = useState("");
  const pageKey = `${mode}|${selectedBookSlug}|${selectedChapterNo}|${selectedCategoryId}`;
  const [seen, setSeen] = useState(pageKey);
  if (seen !== pageKey) {
    setSeen(pageKey);
    setTabState(undefined);
    setBookState(undefined);
    setLevelState(undefined);
    setQuery("");
  }
  const tab = tabState || (mode === "books" ? "books" : "categories");
  const q = fold(query.trim());

  // ---- books
  const initialBooks = data && data.books ? data.books : null;
  const initialChapters = (data && data.chapters) || {};
  const booksApi = useApi(`books:${lang}`, () => getBooks(lang), { enabled: enabled && tab === "books" && !initialBooks });
  const books = initialBooks || (Array.isArray(booksApi.data) ? booksApi.data : []);
  const openSlug = bookState === undefined ? selectedBookSlug : bookState;
  const openBook = openSlug ? books.find((book) => book.slug === openSlug) : null;
  const inBook = tab === "books" && Boolean(openBook) && !isCategoryBook(openBook);
  const needChapters = inBook && !initialChapters[openSlug];
  const chaptersApi = useApi(needChapters ? `book:${openSlug}:${lang}` : null, () => getBook(openSlug, lang), { enabled });
  const chapters =
    initialChapters[openSlug] || (chaptersApi.data && chaptersApi.data.slug === openSlug ? chaptersApi.data.chapters : null);

  // ---- categories: `partial` from the server (the top level and the open branch) paints at
  // once; the whole list, needed for the other branches and the filter, follows.
  const initialCategories = data && data.categories ? data : null;
  const partial = Boolean(initialCategories && initialCategories.partial);
  const categoriesApi = useApi(`categories:${lang}`, () => getCategories(lang), {
    enabled: enabled && tab === "categories" && (!initialCategories || partial),
  });
  const categories = useMemo(
    () =>
      Array.isArray(categoriesApi.data) && categoriesApi.data.length
        ? readableCategories(categoriesApi.data, lang)
        : (initialCategories && initialCategories.categories) || [],
    [initialCategories, categoriesApi.data, lang]
  );
  const byId = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const kids = useMemo(() => {
    const map = new Map();
    categories.forEach((category) => {
      const key = category.parentId == null ? "root" : category.parentId;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(category);
    });
    return map;
  }, [categories]);
  const selected = selectedCategoryId != null ? byId.get(selectedCategoryId) : null;
  const pageLevel = selected ? (selected.totalChildren > 0 ? selected.id : selected.parentId ?? null) : null;
  const level = levelState === undefined ? pageLevel : levelState;
  const levelCategory = level != null ? byId.get(level) : null;

  const countOf = (value) => (value > 0 ? formatNumber(value) : null);
  const bookNote = (book) =>
    [
      t("hadithCount", { count: book.totalHadith }),
      book.totalChapter > 1 ? t("chapterCount", { count: book.totalChapter }) : null,
    ]
      .filter(Boolean)
      .join(" · ");
  const pathOf = (category) => {
    const names = [];
    for (let node = byId.get(category.parentId); node; node = byId.get(node.parentId)) names.unshift(node.title);
    return names.join(" › ");
  };

  // ---- the list's place and focus
  const list = useRef(null);
  const crumb = useRef(null);
  const field = useRef(null);
  const moved = useRef(false);
  // The current row in view, or the top of a new level. The list scrolls by itself, except in the
  // drawer on a short screen (a phone on its side), where the whole drawer does
  // (NavDrawer.module.scss).
  const reveal = useCallback(() => {
    const rows = list.current;
    if (!rows) return;
    const box = getComputedStyle(rows).overflowY === "visible" ? rows.closest(".MuiDrawer-paper") : rows;
    if (!box) return;
    const current = rows.querySelector("[aria-current]");
    box.scrollTop = current ? Math.max(0, current.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 80) : 0;
  }, []);
  const chaptersShown = Boolean(chapters);
  useBeforePaint(() => {
    reveal();
    if (!moved.current) return;
    moved.current = false;
    // on the way back up, into a level whose row the reader came from; else its first
    const box = list.current;
    const target = (crumb.current && crumb.current.querySelector("button")) || (box && (box.querySelector("[aria-current]") || box.querySelector("a, button")));
    if (target) target.focus({ preventScroll: true });
  }, [reveal, tab, openSlug, level, Boolean(q), chaptersShown, categories.length, books.length, selectedChapterNo, selectedCategoryId]);

  const go = (change) => {
    moved.current = true;
    change();
  };
  const showTab = (name) => {
    setTabState(name);
    setQuery("");
  };
  useImperativeHandle(ref, () => ({ showTab, reveal }), [reveal]);

  const tabs = [
    { name: "books", label: t("books") },
    { name: "categories", label: t("categories") },
  ];
  const tabId = (name) => `${ids}-tab-${name}`;
  const onTabKey = (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = tab === "books" ? "categories" : "books";
    showTab(event.key === "Home" ? "books" : event.key === "End" ? "categories" : next);
    window.requestAnimationFrame(() => {
      const el = document.getElementById(tabId(event.key === "Home" ? "books" : event.key === "End" ? "categories" : next));
      if (el) el.focus();
    });
  };

  // ---- the rows
  const bookRow = (book, index) => {
    const topic = isCategoryBook(book);
    return (
      <Row
        key={book.slug}
        href={bookPath(book)}
        onClick={() => {
          // the book's page comes (its chapters on the right) and the list shows them at once,
          // the focus going into them as when going down a level
          setQuery("");
          if (topic) showTab("categories");
          else go(() => setBookState(book.slug));
        }}
        current={book.slug === selectedBookSlug ? (selectedChapterNo == null ? "page" : "true") : false}
        number={index == null ? null : formatNumber(index + 1)}
        name={shortBookName(book)}
        note={bookNote(book)}
        more
      />
    );
  };
  const chapterRow = (chapter, book, note) => {
    const unassigned = chapter.chapterNo === UNASSIGNED_CHAPTER;
    return (
      <Row
        key={`${book.slug}-${chapter.chapterNo}`}
        href={listPath(chapterPath(book.slug, chapter.chapterNo), { translated: translatedView })}
        current={book.slug === selectedBookSlug && chapter.chapterNo === selectedChapterNo}
        number={unassigned ? "–" : formatNumber(chapter.chapterNo)}
        name={unassigned ? t("unassignedChapter") : chapter.name}
        note={note}
        count={countOf(chapter.totalHadith)}
      />
    );
  };
  // `found`: a filter's result: a link to its page, with where it is in the tree.
  const categoryRow = (category, number, found = false) => {
    const parent = category.totalChildren > 0;
    const current = category.id === selectedCategoryId;
    const name = <bdi>{category.title}</bdi>;
    if (parent && !found) {
      return (
        <Row
          key={category.id}
          href={categoryPath(category)}
          onClick={() => {
            // the category's page comes (its subcategories on the right), the list goes down
            setQuery("");
            go(() => setLevelState(category.id));
          }}
          current={current}
          number={number}
          name={name}
          count={countOf(category.totalHadith)}
          more
        />
      );
    }
    return (
      <Row
        key={category.id}
        href={categoryHref(category)}
        current={current}
        number={number}
        name={name}
        note={found ? pathOf(category) : null}
        count={countOf(category.totalHadith)}
      />
    );
  };

  // ---- what the list shows
  let rows;
  let heading = null;
  if (tab === "books") {
    if (booksApi.error && !books.length) {
      rows = <ErrorState error={booksApi.error} onRetry={booksApi.retry} compact />;
    } else if (!books.length) {
      rows = <NavSkeleton />;
    } else if (q) {
      const foundBooks = books.filter((book) => [book.name, book.nameEnglish, book.nameArabic].some((name) => fold(name).includes(q)));
      const foundChapters = openBook && chapters ? chapters.filter((chapter) => fold(chapter.name).includes(q)) : [];
      rows =
        foundBooks.length + foundChapters.length ? (
          <>
            {foundBooks.map((book) => bookRow(book, null))}
            {foundChapters.map((chapter) => chapterRow(chapter, openBook, shortBookName(openBook)))}
          </>
        ) : (
          <p className={styles.empty}>{t("noHadiths")}</p>
        );
    } else if (inBook) {
      heading = (
        <div className={styles.crumb} ref={crumb}>
          <button type="button" className={styles.up} onClick={() => go(() => setBookState(null))} aria-label={t("goBack")} title={t("goBack")}>
            <BackIcon />
          </button>
          <Link href={bookPath(openBook)} className={styles.crumbLink} aria-current={openSlug === selectedBookSlug && selectedChapterNo == null ? "page" : undefined}>
            {shortBookName(openBook)}
            <small>{bookNote(openBook)}</small>
          </Link>
        </div>
      );
      if (chaptersApi.error && !chapters) rows = <ErrorState error={chaptersApi.error} onRetry={chaptersApi.retry} compact />;
      else if (!chapters) rows = <NavSkeleton />;
      else rows = chapters.map((chapter) => chapterRow(chapter, openBook));
    } else {
      rows = books.map((book, index) => bookRow(book, index));
    }
  } else if (categoriesApi.error && !categories.length) {
    rows = <ErrorState error={categoriesApi.error} onRetry={categoriesApi.retry} compact />;
  } else if (!categories.length) {
    rows = <NavSkeleton />;
  } else if (q) {
    const found = categories.filter((category) => fold(category.title).includes(q) || fold(category.titleArabic).includes(q)).slice(0, 80);
    rows = found.length ? (
      found.map((category) => categoryRow(category, null, true))
    ) : (
      <p className={styles.empty}>{t("noHadiths")}</p>
    );
  } else if (levelCategory) {
    heading = (
      <div className={styles.crumb} ref={crumb}>
        <button
          type="button"
          className={styles.up}
          onClick={() => go(() => setLevelState(levelCategory.parentId ?? null))}
          aria-label={t("goBack")}
          title={t("goBack")}
        >
          <BackIcon />
        </button>
        <Link href={categoryPath(levelCategory)} className={styles.crumbLink} aria-current={levelCategory.id === selectedCategoryId ? "page" : undefined}>
          <bdi>{levelCategory.title}</bdi>
          <small>{t("hadithCount", { count: levelCategory.totalHadith })}</small>
        </Link>
      </div>
    );
    const children = kids.get(level) || [];
    // not in the partial list yet: the whole list is on its way
    if (children.length) rows = children.map((category) => categoryRow(category));
    else if (categoriesApi.error) rows = <ErrorState error={categoriesApi.error} onRetry={categoriesApi.retry} compact />;
    else rows = <NavSkeleton />;
  } else {
    rows = (kids.get("root") || []).map((category, index) => categoryRow(category, formatNumber(index + 1)));
  }

  const named = tab === "books" ? t("books") : t("categories");

  return (
    <div className={styles.nav}>
      <div className={styles.tabs} role="tablist" aria-label={`${t("books")} / ${t("categories")}`}>
        {tabs.map(({ name, label }) => (
          <button
            key={name}
            type="button"
            role="tab"
            id={tabId(name)}
            className={styles.tab}
            aria-selected={tab === name ? "true" : "false"}
            aria-controls={`${ids}-panel`}
            tabIndex={tab === name ? 0 : -1}
            onClick={() => showTab(name)}
            onKeyDown={onTabKey}
          >
            {label}
          </button>
        ))}
      </div>
      <div className={styles.filter}>
        <SearchIcon />
        <input
          ref={field}
          type="search"
          name="filter"
          value={query}
          placeholder={t("search")}
          aria-label={named}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Escape" || !query) return;
            event.preventDefault();
            event.stopPropagation();
            setQuery("");
          }}
        />
        {query && (
          <button
            type="button"
            className={styles.clear}
            onClick={() => {
              setQuery("");
              if (field.current) field.current.focus();
            }}
            aria-label={t("clearFilter")}
            title={t("clearFilter")}
          >
            <CloseIcon />
          </button>
        )}
      </div>
      {heading}
      <div id={`${ids}-panel`} className={styles.list} role="tabpanel" aria-labelledby={tabId(tab)} ref={list}>
        <nav aria-label={named}>{rows}</nav>
        {!q && after}
      </div>
    </div>
  );
});

// Only shown from 1024px (the layouts' aside); phones get it in a drawer, which loads it when opened.
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

// Closed down to the rail or not: on <html> (data-nav, set before the first paint by
// pages/_document.js) and saved, so the choice holds on every page. The styles show one or the
// other; both are in the page, so nothing here depends on the server knowing the choice.
function saveClosed(closed) {
  const html = document.documentElement;
  if (closed) html.setAttribute("data-nav", "closed");
  else html.removeAttribute("data-nav");
  try {
    if (closed) localStorage.setItem(NAV_KEY, "closed");
    else localStorage.removeItem(NAV_KEY);
  } catch (_) {
    // storage unavailable (private mode): this page only
  }
}

// The side card of the web layout: the navigation, with Saved, the settings and the button that
// closes it down to quran.vn's 70px rail, where each icon opens it again.
export default function Sidebar({ lazy = false, ...where }) {
  const { t, lang } = useLocale();
  const enabled = useShown(lazy);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const nav = useRef(null);
  const railOpen = useRef(null);

  const close = () => {
    saveClosed(true);
    if (railOpen.current) railOpen.current.focus({ preventScroll: true });
  };
  const open = (tab) => {
    saveClosed(false);
    if (nav.current) {
      if (tab) nav.current.showTab(tab);
      else nav.current.reveal();
    }
    window.requestAnimationFrame(() => {
      const current = document.querySelector('aside [role="tab"][aria-selected="true"]');
      if (current) current.focus({ preventScroll: true });
      if (nav.current) nav.current.reveal();
    });
  };

  return (
    <div className={styles.sidebar}>
      <div className={styles.rail}>
        <button type="button" ref={railOpen} onClick={() => open()} aria-expanded="false" aria-label={t("menu")} title={t("menu")}>
          <PanelOpenIcon />
        </button>
        <button type="button" onClick={() => open("books")} aria-label={t("books")} title={t("books")}>
          <MenuBookIcon />
        </button>
        <button type="button" onClick={() => open("categories")} aria-label={t("categories")} title={t("categories")}>
          <ListIcon />
        </button>
        <Link href="/bookmarks" aria-label={t("savedLists")} title={t("savedLists")}>
          <BookmarkIcon />
        </Link>
        <button type="button" onClick={() => setSettingsOpen(true)} aria-haspopup="dialog" aria-label={t("readerSettings")} title={t("readerSettings")}>
          <SettingsIcon />
        </button>
      </div>
      <div className={styles.panel}>
        {/* a new language starts afresh: the lists of the last one must not show */}
        <Nav key={lang} ref={nav} {...where} enabled={enabled} />
        <div className={styles.foot}>
          <Link href="/bookmarks">
            <BookmarkIcon />
            <span>{t("savedLists")}</span>
          </Link>
          <button type="button" onClick={() => setSettingsOpen(true)} aria-haspopup="dialog">
            <SettingsIcon />
            <span>{t("settings")}</span>
          </button>
          <button type="button" className={styles.collapse} onClick={close} aria-expanded="true" aria-label={t("close")} title={t("close")}>
            <PanelCloseIcon />
          </button>
        </div>
      </div>
      <ReaderSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
