import Link from "next/link";
import { server, config, shareImage } from "../../../../../lib/config";
import { getBook, getChapterHadiths, loadStatic, staticPaths } from "../../../../../lib/api";
import { INTERNATIONAL } from "../../../../../lib/language";
import { UNASSIGNED_CHAPTER, bookPath, chapterPath, listPath, parseListView } from "../../../../../lib/hadith";
import { useLocale } from "../../../../../contexts/LocaleContext";
import useRouteLoading from "../../../../../hooks/useRouteLoading";
import Meta from "../../../../../components/core/meta";
import Breadcrumbs from "../../../../../components/core/breadcrumbs";
import ErrorState, { EmptyState } from "../../../../../components/core/error";
import Pager from "../../../../../components/core/Pager";
import Layout from "../../../../../components/layouts/LayoutSecondary";
import { sidebarBooksData } from "../../../../../components/sidebar/data";
import HadithCard, { HadithList } from "../../../../../components/hadith/HadithCard";
import TranslationPicker from "../../../../../components/hadith/TranslationPicker";
import styles from "../../../../../components/content/Page.module.scss";

// The filter is a link (it works without JavaScript) shown as a switch; a switch
// toggles on Space as well as Enter.
const toggleOnSpace = (event) => {
  if (event.key !== " ") return;
  event.preventDefault();
  event.currentTarget.click();
};

const chapterLabel = (chapter, t) =>
  chapter.chapterNo === UNASSIGNED_CHAPTER ? t("unassignedChapter") : t("chapterNumber", { number: chapter.chapterNo });

const numberedName = (chapter, t, formatNumber) =>
  chapter.chapterNo === UNASSIGNED_CHAPTER ? t("unassignedChapter") : `${formatNumber(chapter.chapterNo)}. ${chapter.name}`;

export default function Chapter({ data, neighbours, onlyReadable, readableCount, error }) {
  const { t, lang, formatNumber, languageName } = useLocale();
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
  // The filter stays on from page to page and chapter to chapter.
  const pageOf = (page) => listPath(basePath, { translated: onlyReadable, page });
  const chapterHref = (chapterNo) => listPath(chapterPath(book.slug, chapterNo), { translated: onlyReadable });
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
        url={`${server}${listPath(basePath, { page: pagination.page })}`}
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

        <header className={styles.header}>
          <h1 className={styles.title}>{numberedName(chapter, t, formatNumber)}</h1>
          {(chapter.nameArabic || book.nameArabic) && (
            <p className={styles.titleArabic} dir="rtl" lang="ar">
              {chapter.nameArabic || book.nameArabic}
            </p>
          )}
          <p className={styles.meta}>
            <span>{book.name}</span>
            <span>{t("hadithCount", { count: chapter.totalHadith })}</span>
            {pagination.lastPage > 1 && (
              <span>
                {t("page")} {formatNumber(pagination.page)}/{formatNumber(pagination.lastPage)}
              </span>
            )}
          </p>
        </header>

        {unassigned && <p className={styles.notice}>{t("unassignedChapterNote")}</p>}

        <div className={styles.toolbar}>
          {showToggle && (
            <Link
              href={listPath(basePath, { translated: !onlyReadable })}
              className={styles.switch}
              role="switch"
              aria-checked={onlyReadable ? "true" : "false"}
              scroll={false}
              onKeyDown={toggleOnSpace}
            >
              <span className={styles.switchTrack} aria-hidden="true" />
              {t("onlyReadable", {
                language: languageName(lang),
                count: formatNumber(readableCount),
                total: formatNumber(chapter.totalHadith),
              })}
            </Link>
          )}
          {/* Other languages only on the international site; a country's site reads in its own */}
          {INTERNATIONAL && (
            <span className={styles.toolbarEnd}>
              <TranslationPicker book={book.slug} />
            </span>
          )}
        </div>

        {pastLastPage ? (
          <EmptyState>
            {t("pageEmpty")} <Link href={pageOf(1)}>{t("goToFirstPage")}</Link>
          </EmptyState>
        ) : hadiths.length === 0 ? (
          <EmptyState>{t("noHadiths")}</EmptyState>
        ) : (
          <HadithList
            hadiths={hadiths}
            loading={loading}
            extras={{
              key: `${pageOf(pagination.page)}`,
              fetch: (codes) =>
                getChapterHadiths(book.slug, chapter.chapterNo, lang, {
                  page: pagination.page,
                  perPage: pagination.perPage,
                  translated: onlyReadable,
                  translations: codes,
                }).then((result) => result.hadiths),
            }}
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
      </div>

      <Pager
        pagination={pagination}
        hrefFor={pageOf}
        label={t("chapter")}
        before={
          neighbours && neighbours.previous
            ? { href: chapterHref(neighbours.previous.chapterNo), label: numberedName(neighbours.previous, t, formatNumber) }
            : null
        }
        after={
          neighbours && neighbours.next
            ? { href: chapterHref(neighbours.next.chapterNo), label: numberedName(neighbours.next, t, formatNumber) }
            : null
        }
      />
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
      title={data ? ({ t, formatNumber }) => numberedName(data.chapter, t, formatNumber) : undefined}
    >
      {page}
    </Layout>
  );
};

// /books/{book}/chapters/{n}[/translated][/page/{p}]: built on the first visit, then kept
// (lib/api loadStatic).
export async function getStaticPaths() {
  return staticPaths();
}

export async function getStaticProps({ params }) {
  const { bookId, chapterId } = params;
  if (!/^-?\d+$/.test(String(chapterId))) return { notFound: true };
  const view = parseListView(params.view, ["translated"]);
  if (!view) return { notFound: true };
  if (!view.canonical) {
    return { redirect: { destination: listPath(chapterPath(bookId, chapterId), view), permanent: true } };
  }

  return loadStatic(async (lang) => {
    // translated: only hadiths readable in the language (own or linked translation). Off by
    // default; Arabic is the original text.
    const onlyReadable = lang !== "ar" && view.translated;
    if (view.translated && !onlyReadable) return { notFound: true };
    const [data, book, readableTotal] = await Promise.all([
      getChapterHadiths(bookId, chapterId, lang, {
        page: view.page,
        perPage: config.perPage,
        translated: onlyReadable,
      }),
      // Cached; for the previous/next chapter links and the navigation.
      getBook(bookId, lang).catch(() => null),
      // The readable count for the toggle label (the chapter has no such field).
      onlyReadable || lang === "ar"
        ? Promise.resolve(null)
        : getChapterHadiths(bookId, chapterId, lang, { perPage: 1, translated: true })
            .then((result) => result.pagination.total)
            .catch(() => null),
    ]);
    // a page past the end is not a page
    if (data.hadiths.length === 0 && view.page > 1) return { notFound: true };

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
        neighbours,
        onlyReadable,
        readableCount: onlyReadable ? data.pagination.total : readableTotal,
        sidebarData: await sidebarBooksData(lang, { book }),
        backLink: bookPath(data.book),
      },
    };
  });
}
