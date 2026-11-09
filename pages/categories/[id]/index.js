import Link from "next/link";
import { server, shareImage } from "../../../lib/config";
import { booksForHadiths, getCategory, getCategoryHadiths, loadStatic, staticPaths } from "../../../lib/api";
import { categoryCrumbs, categoryHadithsPath, categoryPath, listPath } from "../../../lib/hadith";
import { useLocale } from "../../../contexts/LocaleContext";
import Meta from "../../../components/core/meta";
import Breadcrumbs from "../../../components/core/breadcrumbs";
import ErrorState, { EmptyState } from "../../../components/core/error";
import Layout from "../../../components/layouts/LayoutSecondary";
import { sidebarCategoriesData } from "../../../components/sidebar/data";
import HadithCard, { HadithList } from "../../../components/hadith/HadithCard";
import CategoryList from "../../../components/home/category-list";
import styles from "../../../components/content/Page.module.scss";

const PREVIEW_SIZE = 5;


export default function Category({ category, preview, previewFiltered, books, error }) {
  const { t, lang, formatNumber, languageName } = useLocale();

  if (error || !category) {
    return (
      <div className={styles.page}>
        <ErrorState error={error} />
      </div>
    );
  }

  const children = category.children || [];
  const hadiths = (preview && preview.hadiths) || [];
  const total = category.totalHadith || 0;
  const language = languageName(lang);
  const showTranslated = lang !== "ar" && category.totalTranslated != null;
  const translated = category.totalTranslated || 0;

  return (
    <>
      <Meta
        title={category.title}
        description={`${category.title}: ${t("hadithCount", { count: total })}.`}
        url={`${server}${categoryPath(category)}`}
        image={shareImage}
        type="website"
      />

      <div className={styles.page}>
        <Breadcrumbs items={categoryCrumbs(category, t)} />

        <header className={styles.header}>
          <h1 className={styles.title}>{category.title}</h1>
          <p className={styles.meta}>
            <span>
              {t("hadithCount", { count: total })}
            </span>
            {showTranslated && <span>{t("countTranslated", { count: formatNumber(translated), language })}</span>}
            {children.length > 0 && (
              <span>
                {t("subcategoryCount", { count: children.length })}
              </span>
            )}
          </p>
        </header>

        {children.length > 0 && (
          <section className={styles.section} aria-labelledby="category-children">
            <div className={styles.sectionHead}>
              <h2 id="category-children" className={styles.sectionTitle}>
                {t("subcategories")}
              </h2>
            </div>
            <CategoryList categories={children} />
          </section>
        )}

        <section className={styles.section} aria-labelledby="category-hadiths">
          <div className={styles.sectionHead}>
            <h2 id="category-hadiths" className={styles.sectionTitle}>
              {t("hadithsInCategory")}
            </h2>
          </div>

          {hadiths.length === 0 ? (
            <EmptyState>{t("noHadiths")}</EmptyState>
          ) : (
            <HadithList
              hadiths={hadiths}
              extras={{
                key: `${categoryPath(category)}:preview:${previewFiltered}`,
                fetch: (codes) =>
                  getCategoryHadiths(category.id, lang, {
                    perPage: PREVIEW_SIZE,
                    translated: previewFiltered,
                    translations: codes,
                  }).then((result) => result.hadiths),
              }}
              renderCard={(hadith) => <HadithCard key={hadith.id} hadith={hadith} book={books[hadith.bookSlug]} />}
            />
          )}

          {/* The hadith list defaults to the translated ones (see its /all). */}
          {previewFiltered ? (
            <p className={styles.more}>
              {translated > hadiths.length && (
                <Link href={categoryHadithsPath(category)} className={styles.button}>
                  {t("viewTranslatedInCategory", { count: formatNumber(translated), language })}
                </Link>
              )}{" "}
              {total > translated && (
                <Link href={listPath(categoryHadithsPath(category), { all: true })} className={`${styles.button} ${styles.buttonGhost}`}>
                  {t("viewAllInCategory", { count: formatNumber(total) })}
                </Link>
              )}
            </p>
          ) : (
            total > hadiths.length && (
              <p className={styles.more}>
                <Link href={categoryHadithsPath(category)} className={styles.button}>
                  {t("allHadithsInCategory", { count: formatNumber(total) })}
                </Link>
              </p>
            )
          )}
        </section>
      </div>
    </>
  );
}

Category.getLayout = function getLayout(page) {
  const { category } = page.props;
  return (
    <Layout selectedCategoryId={category ? category.id : null} title={category ? () => category.title : undefined}>
      {page}
    </Layout>
  );
};

export async function getStaticPaths() {
  return staticPaths();
}

export async function getStaticProps({ params }) {
  const { id } = params;
  return loadStatic(async (lang) => {
    // Preview the hadiths translated into the reader's language first,
    // like the full list; fall back to all when none are.
    let previewFiltered = lang !== "ar";
    const [category, firstPreview] = await Promise.all([
      getCategory(id, lang),
      getCategoryHadiths(id, lang, { perPage: PREVIEW_SIZE, translated: previewFiltered }),
    ]);
    let preview = firstPreview;
    if (previewFiltered && preview.pagination.total === 0) {
      preview = await getCategoryHadiths(id, lang, { perPage: PREVIEW_SIZE });
      previewFiltered = false;
    }
    return {
      props: {
        category,
        preview,
        previewFiltered,
        books: await booksForHadiths(preview.hadiths, lang),
        sidebarData: await sidebarCategoriesData(lang, category.id),
        backLink: category.breadcrumbs && category.breadcrumbs.length
          ? categoryPath(category.breadcrumbs[category.breadcrumbs.length - 1])
          : "/categories",
      },
    };
  });
}
