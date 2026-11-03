import { server, shareImage } from "../../lib/config";
import { getBooks, loadPage } from "../../lib/api";
import { useLocale } from "../../contexts/LocaleContext";
import Meta from "../../components/core/meta";
import Breadcrumbs from "../../components/core/breadcrumbs";
import ErrorState from "../../components/core/error";
import Layout from "../../components/layouts/LayoutSecondary";
import { sidebarBooksData } from "../../components/sidebar/data";
import { BookGroups } from "../../components/home/book-list";
import styles from "../../components/content/Page.module.scss";

export default function Books({ books, error }) {
  const { t, lang, formatNumber, languageName } = useLocale();
  const list = books || [];
  const translated = list.reduce((sum, book) => sum + (book.totalTranslated || 0), 0);
  const linked = list.reduce((sum, book) => sum + (book.totalLinkedTranslated || 0), 0);
  const total = list.reduce((sum, book) => sum + (book.totalHadith || 0), 0);

  return (
    <>
      <Meta
        title={t("books")}
        description={t("booksDescription")}
        url={`${server}/books`}
        image={shareImage}
        type="website"
      />

      <div className={styles.page}>
        <Breadcrumbs items={[{ href: "/", label: t("home") }, { label: t("books") }]} />

        <header className={styles.header}>
          <h1 className={styles.title}>{t("books")}</h1>
          {list.length > 0 && (
            <p className={styles.meta}>
              <span>{t("bookCount", { count: list.length })}</span>
              <span>{t("hadithCount", { count: total })}</span>
            </p>
          )}
        </header>

        {error ? (
          <ErrorState error={error} />
        ) : (
          <>
            {lang !== "en" && lang !== "ar" && list.length > 0 && translated < total && (
              <p className={`${styles.notice} ${styles.warning}`}>
                {/* whole sentences, so that each language words and punctuates them its own way */}
                {linked > 0
                  ? t("booksCoverageLinked", { count: translated, linked: formatNumber(linked), language: languageName(lang) })
                  : t("booksCoverage", { count: translated, language: languageName(lang) })}{" "}
                {t("contentLanguageNote")}
              </p>
            )}
            <BookGroups books={list} showTranslation level={2} />
          </>
        )}
      </div>
    </>
  );
}

Books.getLayout = function getLayout(page) {
  return <Layout sidebar="books">{page}</Layout>;
};

export async function getServerSideProps(context) {
  // Old links used /books?book={id}; the book page now lives at /books/{book}.
  const legacyBook = context.query.book;
  if (legacyBook && /^[\w-]+$/.test(String(legacyBook))) {
    return { redirect: { destination: `/books/${legacyBook}`, permanent: true } };
  }

  return loadPage(context, async (lang) => {
    const books = await getBooks(lang);
    return {
      props: {
        books,
        sidebarData: await sidebarBooksData(lang, { books }),
        backLink: "/",
      },
    };
  });
}
