import { server, shareImage } from "../../lib/config";
import { buildCategoryTree, getCategories, loadPage, readableCategories } from "../../lib/api";
import { useLocale } from "../../contexts/LocaleContext";
import Meta from "../../components/core/meta";
import Breadcrumbs from "../../components/core/breadcrumbs";
import ErrorState from "../../components/core/error";
import Layout from "../../components/layouts/LayoutSecondary";
import { sidebarCategoriesData } from "../../components/sidebar/data";
import CategoryList from "../../components/home/category-list";
import styles from "../../components/content/Page.module.scss";

// The HadeethEnc category tree: top-level categories with their children, those with
// something to read in the language (lib/api readableCategories; their pages still open).
export default function Categories({ categories, total, error }) {
  const { t, formatNumber } = useLocale();

  return (
    <>
      <Meta
        title={t("categories")}
        description={t("categoriesDescription")}
        url={`${server}/categories`}
        image={shareImage}
        type="website"
      />

      <div className={styles.page}>
        <Breadcrumbs items={[{ href: "/", label: t("home") }, { label: t("categories") }]} />

        <header className={styles.header}>
          <h1 className={styles.title}>{t("categories")}</h1>
          {total > 0 && (
            <p className={styles.meta}>
              <span>
                {t("categoryCount", { count: total })}
              </span>
            </p>
          )}
        </header>

        {error ? <ErrorState error={error} /> : <CategoryList categories={categories} />}
      </div>
    </>
  );
}

Categories.getLayout = function getLayout(page) {
  return <Layout>{page}</Layout>;
};

export async function getServerSideProps(context) {
  return loadPage(context, async (lang) => {
    const all = readableCategories(await getCategories(lang), lang);
    // Two levels are enough here; deeper levels are on each category page.
    const categories = buildCategoryTree(all).map(({ children, ...category }) => ({
      ...category,
      children: children.map(({ children: _deeper, ...child }) => child),
    }));
    return {
      props: { categories, total: all.length, sidebarData: await sidebarCategoriesData(lang), backLink: "/" },
    };
  });
}
