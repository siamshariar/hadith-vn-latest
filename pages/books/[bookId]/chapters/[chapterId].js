import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { server, config, shareImage } from "../../../../lib/config";
import { getBook, getChapterHadiths, loadPage, parsePage } from "../../../../lib/api";
import { UNASSIGNED_CHAPTER, bookPath, chapterPath, shortBookName } from "../../../../lib/hadith";
import { useLocale } from "../../../../contexts/LocaleContext";
import useRouteLoading from "../../../../hooks/useRouteLoading";
import Meta from "../../../../components/core/meta";
import Breadcrumbs from "../../../../components/core/breadcrumbs";
import ErrorState, { EmptyState } from "../../../../components/core/error";
import Pagination, { pageHref } from "../../../../components/core/pagination";
import Layout from "../../../../components/layouts/LayoutSecondary";
import HadithCard, { HadithList } from "../../../../components/hadith/HadithCard";
import ReaderBar, { barStyles } from "../../../../components/hadith/ReaderBar";
import CheckIcon from "../../../../components/icons/Check";
import styles from "../../../../components/content/Page.module.scss";

// The filter is a link (it works without JavaScript) shown as a switch; a switch
// toggles on Space as well as Enter.
const toggleOnSpace = (event) => {
  if (event.key !== " ") return;
  event.preventDefault();
  event.currentTarget.click();
};

const chapterLabel = (chapter, t) =>
  chapter.chapterNo === UNASSIGNED_CHAPTER ? t("unassignedChapter") : t("chapterNumber", { number: chapter.chapterNo });

// Keys that change a closed select's value as they go down (Chrome, Edge and Firefox on
// Windows and Linux), with typed letters and digits: browsing, not choosing.
const BROWSE_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown"]);
// A change this soon after such a key came from the key, not from the open list.
const KEYED_MS = 100;

// The book's chapters in a select, like quran.com's surah switcher. Choosing a chapter
// (from the open list, or a phone's picker) opens it, and the select's description
// says so beforehand (WCAG 3.2.2). Browsing with the keyboard does not: Enter opens the
// chapter shown, and leaving the select puts the current chapter back.
function ChapterSwitcher({ book, chapter, chapters, query }) {
  const { t } = useLocale();
  const router = useRouter();
  const hintId = useId();
  const current = String(chapter.chapterNo);
  const [value, setValue] = useState(current);
  const keyedAt = useRef(-Infinity);
  useEffect(() => setValue(current), [current]);

  const label = (item) =>
    item.chapterNo === UNASSIGNED_CHAPTER ? t("unassignedChapter") : `${item.chapterNo}. ${item.name}`;
  if (!chapters || chapters.length < 2) {
    return <span className={barStyles.shrink}>{label(chapter)}</span>;
  }

  const open = (chapterNo) => {
    if (chapterNo !== current) router.push(pageHref(chapterPath(book.slug, chapterNo), query, 1));
  };
  const onKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      open(event.currentTarget.value);
    } else if (BROWSE_KEYS.has(event.key) || event.key.length === 1) {
      keyedAt.current = performance.now();
    }
  };
  const onChange = (event) => {
    setValue(event.target.value);
    if (performance.now() - keyedAt.current > KEYED_MS) open(event.target.value);
  };

  return (
    <span className={barStyles.switcher}>
      <select
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onBlur={() => setValue(current)}
        aria-label={t("chooseChapter")}
        aria-describedby={hintId}
      >
        {chapters.map((item) => (
          <option key={item.chapterNo} value={item.chapterNo}>
            {label(item)}
          </option>
        ))}
      </select>
      <span id={hintId} className="visually_hidden">
        {t("chapterSelectHint")}
      </span>
    </span>
  );
}

export default function Chapter({ data, chapters, neighbours, onlyReadable, readableCount, translations, error }) {
  const { t, lang, formatNumber, languageName } = useLocale();
  const router = useRouter();
  const loading = useRouteLoading();

  if (error || !data) {
    return (
      <div className={styles.page}>
        <ErrorState error={error} />
      </div>
    );
  }

  const { book, chapter, hadiths, pagination } = data;
  const unassigned = chapter.chapterNo === UNASSIGNED_CHAPTER;
  const title = unassigned ? t("unassignedChapter") : chapter.name;
  const basePath = chapterPath(book.slug, chapter.chapterNo);
  const pastLastPage = hadiths.length === 0 && pagination.total > 0;
  // Query kept by pagination and links: the ?lang= and ?tr= overrides and the filter.
  const query = {
    lang: router.query.lang || undefined,
    tr: router.query.tr,
    translated: onlyReadable ? 1 : undefined,
  };
  // The API lists a chapter in the source's order, so without the filter a
  // card's position on the page gives its in-book reference.
  const inBookAt = (index) =>
    onlyReadable || unassigned
      ? undefined
      : { chapterNo: chapter.chapterNo, position: (pagination.page - 1) * pagination.perPage + index + 1 };
  const showToggle =
    lang !== "ar" &&
    readableCount != null &&
    (onlyReadable || (readableCount > 0 && readableCount < chapter.totalHadith));

  return (
    <>
      <Meta
        title={`${title} - ${book.name}`}
        description={`${book.name}, ${chapterLabel(chapter, t)}: ${title}.`}
        url={`${server}${pageHref(basePath, {}, pagination.page)}`}
        image={shareImage}
        type="website"
      />

      <div className={styles.page}>
        <Breadcrumbs
          items={[
            { href: "/", label: t("home") },
            { href: "/books", label: t("books") },
            { href: bookPath(book), label: book.name },
            { label: chapterLabel(chapter, t) },
          ]}
        />

        <ReaderBar picker={{ translations, book: book.slug }}>
          <Link href={bookPath(book)} className={`${barStyles.book} ${barStyles.bookOptional}`}>
            {shortBookName(book)}
          </Link>
          <span className={`${barStyles.separator} ${barStyles.bookOptional}`} aria-hidden="true">
            ›
          </span>
          <ChapterSwitcher book={book} chapter={chapter} chapters={chapters} query={query} />
        </ReaderBar>

        <header className={styles.header}>
          <h1 className={styles.title}>
            {!unassigned && (
              <>
                <span className={styles.titleNumber}>{chapter.chapterNo}</span>
                <span className="visually_hidden">. </span>
              </>
            )}
            {title}
          </h1>
          {chapter.nameArabic && (
            <p className={styles.titleArabic} dir="rtl" lang="ar">
              {chapter.nameArabic}
            </p>
          )}
          <p className={styles.meta}>
            <span>
              {t("hadithCount", { count: chapter.totalHadith })}
            </span>
            {pagination.lastPage > 1 && (
              <span>
                {t("page")} {pagination.page}/{pagination.lastPage}
              </span>
            )}
          </p>
        </header>

        {unassigned && <p className={styles.notice}>{t("unassignedChapterNote")}</p>}

        {showToggle && (
          <div className={styles.toolbar}>
            <Link
              href={pageHref(basePath, { ...query, translated: onlyReadable ? undefined : 1 }, 1)}
              className={`${styles.chip} ${onlyReadable ? styles.chipActive : ""}`}
              role="switch"
              aria-checked={onlyReadable ? "true" : "false"}
              scroll={false}
              onKeyDown={toggleOnSpace}
            >
              <span className={styles.switchBox} aria-hidden="true">
                {onlyReadable && <CheckIcon />}
              </span>
              {t("onlyReadable", {
                language: languageName(lang),
                count: formatNumber(readableCount),
                total: formatNumber(chapter.totalHadith),
              })}
            </Link>
          </div>
        )}

        {pastLastPage ? (
          <EmptyState>
            {t("pageEmpty")} <Link href={pageHref(basePath, query, 1)}>{t("goToFirstPage")}</Link>
          </EmptyState>
        ) : hadiths.length === 0 ? (
          <EmptyState>{t("noHadiths")}</EmptyState>
        ) : (
          <HadithList
            hadiths={hadiths}
            loading={loading}
            renderCard={(hadith, index) => (
              <HadithCard
                key={hadith.id}
                hadith={hadith}
                book={book}
                headingLevel={2}
                inBookReference={inBookAt(index)}
              />
            )}
          />
        )}

        <Pagination pagination={pagination} hrefFor={(page) => pageHref(basePath, query, page)} />

        {neighbours && (neighbours.previous || neighbours.next) && (
          <nav className={`${styles.toolbar} ${styles.neighbours}`} aria-label={t("chapter")}>
            {neighbours.previous ? (
              <Link href={chapterPath(book.slug, neighbours.previous.chapterNo)} className={`${styles.button} ${styles.buttonGhost}`}>
                <span aria-hidden="true">‹</span> {chapterLabel(neighbours.previous, t)}
              </Link>
            ) : (
              <span />
            )}
            {neighbours.next && (
              <Link href={chapterPath(book.slug, neighbours.next.chapterNo)} className={`${styles.button} ${styles.buttonGhost}`}>
                {chapterLabel(neighbours.next, t)} <span aria-hidden="true">›</span>
              </Link>
            )}
          </nav>
        )}
      </div>
    </>
  );
}

Chapter.getLayout = function getLayout(page) {
  const { data } = page.props;
  return (
    <Layout
      sidebar="books"
      selectedBookSlug={data ? data.book.slug : null}
      selectedChapterNo={data ? data.chapter.chapterNo : null}
    >
      {page}
    </Layout>
  );
};

export async function getServerSideProps(context) {
  const { bookId, chapterId } = context.params;
  if (!/^-?\d+$/.test(String(chapterId))) return { notFound: true };

  return loadPage(context, async (lang, { translations }) => {
    // ?translated=1: only hadiths readable in the language (own or linked
    // translation). Off by default; Arabic is the original text.
    const onlyReadable = lang !== "ar" && context.query.translated === "1";
    const [data, book, readableTotal] = await Promise.all([
      getChapterHadiths(bookId, chapterId, lang, {
        page: parsePage(context.query.page),
        perPage: config.perPage,
        translated: onlyReadable,
        translations,
      }),
      // Cached; only used for previous/next chapter links.
      getBook(bookId, lang).catch(() => null),
      // The readable count for the toggle label (the chapter has no such field).
      onlyReadable || lang === "ar"
        ? Promise.resolve(null)
        : getChapterHadiths(bookId, chapterId, lang, { perPage: 1, translated: true })
            .then((result) => result.pagination.total)
            .catch(() => null),
    ]);

    let neighbours = null;
    const chapters = (book && book.chapters) || [];
    const pick = (chapter) => (chapter ? { chapterNo: chapter.chapterNo, name: chapter.name } : null);
    const index = chapters.findIndex((chapter) => chapter.chapterNo === data.chapter.chapterNo);
    if (index !== -1) {
      neighbours = { previous: pick(chapters[index - 1]), next: pick(chapters[index + 1]) };
    }

    return {
      props: {
        data,
        // for the chapter switcher
        chapters: chapters.map(pick),
        neighbours,
        onlyReadable,
        readableCount: onlyReadable ? data.pagination.total : readableTotal,
        backLink: bookPath(data.book),
      },
    };
  });
}
