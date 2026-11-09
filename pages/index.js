import Link from "next/link";
import { server, shareImage } from "../lib/config";
import { getHome, loadStatic, readableCategoryTree } from "../lib/api";
import { INTERNATIONAL } from "../lib/language";
import { isCategoryBook } from "../lib/hadith";
import { useLocale } from "../contexts/LocaleContext";
import Meta from "../components/core/meta";
import Container from "../components/core/container";
import ErrorState from "../components/core/error";
import Layout from "../components/layouts/LayoutPrimary";
import { Hero } from "../components/home/banner";
import ContinueReading from "../components/home/ContinueReading";
import { BookGrid } from "../components/home/book-list";
import CategoryList from "../components/home/category-list";
import styles from "../components/home/Home.module.scss";

// A language with nothing of its own in the books (Vietnamese: its hadiths are in the topic
// collection) leads with the categories, on the page and in the phone's navigation.
const categoriesLead = (home, lang) =>
  lang !== "ar" && !(home.books || []).some((book) => !isCategoryBook(book) && book.totalTranslated > 0);

function Section({ id, title, href, children }) {
  const { t } = useLocale();
  return (
    <section className={styles.section} aria-labelledby={id}>
      <div className={styles.sectionHead}>
        <h2 id={id} className={styles.sectionTitle}>
          {title}
        </h2>
        <Link href={href} className={styles.sectionLink}>
          {t("viewAll")} <span aria-hidden="true">→</span>
        </Link>
      </div>
      {children}
    </section>
  );
}

// The home page, as the Quran sites': the band with three cards (the hadith of the day, the
// collections, the categories), then where the reader left off and the library as cards
// (components/home/EntryCard). Search is the header's icon; each site has one language.
export default function Home({ home, navMode, error }) {
  const { t, formatNumber } = useLocale();
  const languageCount = (home && home.totals && home.totals.language) || 0;
  const lead = navMode === "categories" ? "categories" : "books";

  const books = (
    <Section key="books" id="home-books" title={t("books")} href="/books">
      <BookGrid books={home ? home.books : []} />
    </Section>
  );
  const categories = (
    <Section key="categories" id="home-categories" title={t("categories")} href="/categories">
      <CategoryList categories={home ? home.categories : []} />
    </Section>
  );

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
          <Hero daily={home.dailyHadith || null} lead={lead} />
          <Container>
            <div className={styles.sections}>
              <ContinueReading />
              {lead === "categories" ? [categories, books] : [books, categories]}
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
// readableCategoryTree). Built with the site, made again daily (lib/api loadStatic).
export async function getStaticProps() {
  return loadStatic(async (lang) => {
    const home = await getHome(lang);
    const readable = { ...home, categories: readableCategoryTree(home.categories, lang) };
    const navMode = categoriesLead(home, lang) ? "categories" : "books";
    return { props: { home: readable, navMode } };
  });
}
