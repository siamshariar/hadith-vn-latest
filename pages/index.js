import Link from "next/link";
import { server, shareImage } from "../lib/config";
import { getHome, getLanguages, loadPage, readableCategoryTree } from "../lib/api";
import { INTERNATIONAL } from "../lib/language";
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

export default function Home({ home, languages, error }) {
  const { t, formatNumber } = useLocale();
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
          {/* The site heading and search (with "go to hadith"), then the
              hadith of the day and the figures; where the reader left off,
              the collections in groups, the category tree, every language on
              an international site, and how the data is made. */}
          <Hero>
            <HomeSearch />
          </Hero>

          {home.dailyHadith && (
            <Container>
              <section className={styles.dailySection}>
                <DailyHadith hadith={home.dailyHadith} />
              </section>
            </Container>
          )}
          <Stats totals={home.totals} />

          <Container>
            <div className={styles.sections}>
              <ContinueReading />

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

              <section className={styles.section} aria-labelledby="home-categories">
                <div className={styles.sectionHead}>
                  <h2 id="home-categories" className={styles.sectionTitle}>
                    {t("categories")}
                  </h2>
                  <Link href="/categories" className={styles.sectionLink}>
                    {t("viewAll")} <span aria-hidden="true">→</span>
                  </Link>
                </div>
                <CategoryList categories={home.categories} columns={2} />
              </section>

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
    if (!INTERNATIONAL) return { props: { home: readable } };
    return { props: { home: readable, languages: directoryLanguages(languages) } };
  });
}
