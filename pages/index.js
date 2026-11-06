import Link from "next/link";
import { server, shareImage } from "../lib/config";
import { getHome, getLanguages, loadPage, readableCategoryTree } from "../lib/api";
import { INTERNATIONAL } from "../lib/language";
import { isCategoryBook } from "../lib/hadith";
import { useLocale } from "../contexts/LocaleContext";
import Meta from "../components/core/meta";
import Container from "../components/core/container";
import ErrorState from "../components/core/error";
import Layout from "../components/layouts/LayoutPrimary";
import DailyHadith, { Hero } from "../components/home/banner";
import HomeSearch from "../components/home/search";
import Stats from "../components/home/Stats";
import ContinueReading from "../components/home/ContinueReading";
import { BookGroups } from "../components/home/book-list";
import CategoryList from "../components/home/category-list";
import LanguageDirectory, { directoryLanguages } from "../components/home/LanguageDirectory";
import styles from "../components/home/Home.module.scss";

// A language with nothing of its own in the books (Vietnamese: its hadiths are in the topic
// collection) leads with the categories, on the page and in the phone's navigation.
const categoriesLead = (home, lang) =>
  lang !== "ar" && !(home.books || []).some((book) => !isCategoryBook(book) && book.totalTranslated > 0);

function BooksSection({ home }) {
  const { t } = useLocale();
  return (
    <section className={styles.section} aria-labelledby="home-books">
      <div className={styles.sectionHead}>
        <h2 id="home-books" className={styles.sectionTitle}>
          {t("books")}
        </h2>
        <Link href="/books" className={styles.sectionLink}>
          {t("viewAll")} <span aria-hidden="true">→</span>
        </Link>
      </div>
      <BookGroups books={home.books} showTranslation />
    </section>
  );
}

function CategoriesSection({ home }) {
  const { t } = useLocale();
  return (
    <section className={styles.section} aria-labelledby="home-categories">
      <div className={styles.sectionHead}>
        <h2 id="home-categories" className={styles.sectionTitle}>
          {t("categories")}
        </h2>
        <Link href="/categories" className={styles.sectionLink}>
          {t("viewAll")} <span aria-hidden="true">→</span>
        </Link>
      </div>
      <CategoryList categories={home.categories} compact />
    </section>
  );
}

export default function Home({ home, languages, error }) {
  const { t, lang, formatNumber } = useLocale();
  // An international site is "Hadith.ac – Hadith collections in all languages" (lib/i18n
  // homeTitleAll), described with the number of languages it has.
  const languageCount = (languages && languages.length) || (home && home.totals && home.totals.language) || 0;

  return (
    <>
      <Meta
        title={t("home")}
        fullTitle={INTERNATIONAL ? t("homeTitleAll") : undefined}
        description={INTERNATIONAL && languageCount ? t("homeDescriptionAll", { count: formatNumber(languageCount) }) : t("siteTagline")}
        url={server}
        image={shareImage}
        type="website"
      />

      {error || !home ? (
        <Container>
          <h1 className="visually_hidden">{t("siteHeading")}</h1>
          <div className={styles.error}>
            <ErrorState error={error} />
          </div>
        </Container>
      ) : (
        <>
          {/* The hadith of the day and the way in (search, "go to hadith", the figures); where
              the reader left off, the collections in groups, the categories, every language on
              an international site, and how the data is made. */}
          <Hero daily={home.dailyHadith ? <DailyHadith hadith={home.dailyHadith} /> : null}>
            <h2 className={styles.findTitle}>{t("search")}</h2>
            <HomeSearch />
            <Stats totals={home.totals} />
          </Hero>

          <Container>
            <div className={styles.sections}>
              <ContinueReading />

              {categoriesLead(home, lang) ? (
                <>
                  <CategoriesSection home={home} />
                  <BooksSection home={home} />
                </>
              ) : (
                <>
                  <BooksSection home={home} />
                  <CategoriesSection home={home} />
                </>
              )}

              {languages && languages.length > 0 && <LanguageDirectory languages={languages} />}

              <p className={styles.sources}>
                <Link href="/sources">
                  {t("dataAndMethod")} <span aria-hidden="true">→</span>
                </Link>
              </p>
            </div>
          </Container>
        </>
      )}
    </>
  );
}

Home.getLayout = function getLayout(page) {
  return <Layout>{page}</Layout>;
};

// The categories listed are those with something to read in the language (lib/api
// readableCategoryTree). An international site also lists every content language
// (/hadith/languages).
export async function getServerSideProps(context) {
  return loadPage(context, async (lang) => {
    const [home, languages] = await Promise.all([getHome(lang), INTERNATIONAL ? getLanguages() : null]);
    const readable = { ...home, categories: readableCategoryTree(home.categories, lang) };
    const navMode = categoriesLead(home, lang) ? "categories" : "books";
    if (!INTERNATIONAL) return { props: { home: readable, navMode } };
    return { props: { home: readable, navMode, languages: directoryLanguages(languages) } };
  });
}
