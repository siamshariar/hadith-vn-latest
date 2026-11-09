import Link from "next/link";
import { server, shareImage } from "../../../lib/config";
import { SITE_LANGUAGE, getBook, getBooks, getEditions, loadStatic, staticPaths } from "../../../lib/api";
import { translatorName } from "../../../lib/citation";
import { bookPath, isCategoryBook } from "../../../lib/hadith";
import { useLocale } from "../../../contexts/LocaleContext";
import Meta from "../../../components/core/meta";
import Breadcrumbs from "../../../components/core/breadcrumbs";
import ErrorState, { EmptyState } from "../../../components/core/error";
import Layout from "../../../components/layouts/LayoutSecondary";
import { sidebarBooksData } from "../../../components/sidebar/data";
import BookIntro from "../../../components/home/BookIntro";
import ChapterList from "../../../components/home/ChapterList";
import styles from "../../../components/content/Page.module.scss";

export default function Book({ book, counts, editions, error }) {
  const { t, formatNumber } = useLocale();

  if (error || !book) {
    return (
      <div className={styles.page}>
        <ErrorState error={error} />
      </div>
    );
  }

  const chapters = book.chapters || [];
  const description = [
    book.nameArabic ? `${book.name} (${book.nameArabic})` : book.name,
    t("hadithCount", { count: book.totalHadith }),
    chapters.length > 1 ? t("chapterCount", { count: chapters.length }) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <Meta
        title={book.name}
        description={description}
        url={`${server}${bookPath(book)}`}
        image={shareImage}
        type="website"
      />

      <div className={styles.page}>
        <Breadcrumbs
          items={[
            { href: "/", label: t("home") },
            { href: "/books", label: t("books") },
            { label: book.name },
          ]}
        />

        <BookIntro book={book} chapterCount={chapters.length} counts={counts} editions={editions || []} />

        {isCategoryBook(book) && (
          <p className={styles.notice}>
            {t("browseByCategory")} <Link href="/categories">{t("browseCategories")}</Link>
          </p>
        )}

        <section aria-labelledby="book-chapters">
          <h2 id="book-chapters" className={styles.sectionTitle}>
            {t("chapterCount", { count: chapters.length })}
          </h2>
          {chapters.length === 0 ? (
            <EmptyState>{t("noHadiths")}</EmptyState>
          ) : (
            <ChapterList book={book} chapters={chapters} />
          )}
        </section>
      </div>
    </>
  );
}

Book.getLayout = function getLayout(page) {
  const { book } = page.props;
  return (
    <Layout sidebar="books" selectedBookSlug={book ? book.slug : null} title={book ? () => book.name : undefined}>
      {page}
    </Layout>
  );
};

// The collections are few: built with the site (the rest of the pages on their first visit).
export async function getStaticPaths() {
  return staticPaths(async () => (await getBooks(SITE_LANGUAGE)).map((book) => ({ params: { bookId: book.slug } })));
}

export async function getStaticProps({ params }) {
  return loadStatic(async (lang) => {
    const [book, books, editions] = await Promise.all([
      getBook(params.bookId, lang),
      // The book endpoint has no per-language counts; the (cached) list does.
      getBooks(lang).catch(() => []),
      // Cached; the page works without them.
      getEditions().catch(() => []),
    ]);
    const listed = books.find((item) => item.slug === book.slug);
    return {
      props: {
        book,
        counts: listed ? { own: listed.totalTranslated || 0, linked: listed.totalLinkedTranslated || 0 } : null,
        // one per language, with its translator when the source names one
        editions: editions
          .filter((edition) => edition.bookSlug === book.slug)
          .map((edition) => ({
            languageCode: edition.languageCode,
            languageName: edition.languageName,
            languageNativeName: edition.languageNativeName,
            translator: translatorName(edition.author, edition),
          })),
        sidebarData: await sidebarBooksData(lang, { book, books: books.length ? books : null }),
        backLink: "/books",
      },
    };
  });
}
