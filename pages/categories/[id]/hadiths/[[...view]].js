import Link from "next/link";
import { server, config, shareImage } from "../../../../lib/config";
import { booksForHadiths, getCategoryHadiths, loadStatic, staticPaths } from "../../../../lib/api";
import { INTERNATIONAL } from "../../../../lib/language";
import { categoryCrumbs, categoryHadithsPath, categoryPath, listPath, parseListView } from "../../../../lib/hadith";
import { useLocale } from "../../../../contexts/LocaleContext";
import useRouteLoading from "../../../../hooks/useRouteLoading";
import Meta from "../../../../components/core/meta";
import Breadcrumbs from "../../../../components/core/breadcrumbs";
import ErrorState, { EmptyState } from "../../../../components/core/error";
import Pager from "../../../../components/core/Pager";
import Layout from "../../../../components/layouts/LayoutSecondary";
import { sidebarCategoriesData } from "../../../../components/sidebar/data";
import HadithCard, { HadithList } from "../../../../components/hadith/HadithCard";
import styles from "../../../../components/content/Page.module.scss";

export default function CategoryHadiths({ data, books, direct, all, filtered, counts, error }) {
  const { t, lang, formatNumber, languageName } = useLocale();
  const loading = useRouteLoading();

  if (error || !data) {
    return (
      <div className={styles.page}>
        <ErrorState error={error} />
      </div>
    );
  }

  const { category, hadiths, pagination } = data;
  const basePath = categoryHadithsPath(category);
  // The address keeps both views from page to page: all (every hadith; the default is those
  // translated into the reader's language) and direct (only this category's own hadiths).
  const view = { all, direct };
  const at = (change, page = 1) => listPath(basePath, { ...view, ...change, page });
  const language = languageName(lang);
  const translatedCount = counts ? counts.translated : null;
  const allCount = counts ? counts.all : pagination.total;
  const showLanguageToggle =
    lang !== "ar" && translatedCount != null && translatedCount > 0 && translatedCount < allCount;
  const noneTranslated = lang !== "ar" && translatedCount === 0 && !all;
  const crumbs = categoryCrumbs(category, t, { linkCurrent: true });
  crumbs.push({ label: t("hadith") });
  const pastLastPage = hadiths.length === 0 && pagination.total > 0;

  return (
    <>
      <Meta
        title={t("labelValue", { label: t("hadithsInCategory"), value: category.title })}
        description={`${category.title}: ${t("hadithCount", { count: pagination.total })}.`}
        url={`${server}${at({}, pagination.page)}`}
        image={shareImage}
        type="website"
      />

      <div className={styles.page}>
        <Breadcrumbs items={crumbs} />

        <header className={styles.header}>
          <h1 className={styles.title}>{category.title}</h1>
          <p className={styles.subtitle}>{t("hadithsInCategory")}</p>
          <p className={styles.meta}>
            <span>
              {t("hadithCount", { count: allCount })}
            </span>
            {lang !== "ar" && translatedCount != null && (
              <span>{t("countTranslated", { count: formatNumber(translatedCount), language })}</span>
            )}
            {pagination.lastPage > 1 && (
              <span>
                {t("page")} {pagination.page}/{pagination.lastPage}
              </span>
            )}
          </p>
        </header>

        {showLanguageToggle && (
          <div className={styles.toolbar}>
            <div className={styles.chips} role="group" aria-label={t("contentLanguage")}>
              <Link
                href={at({ all: false })}
                className={`${styles.chip} ${filtered ? styles.chipActive : ""}`}
                aria-current={filtered ? "true" : undefined}
                scroll={false}
              >
                {t("onlyLanguage", { language, count: formatNumber(translatedCount) })}
              </Link>
              <Link
                href={at({ all: true })}
                className={`${styles.chip} ${!filtered ? styles.chipActive : ""}`}
                aria-current={!filtered ? "true" : undefined}
                scroll={false}
              >
                {t("allHadiths", { count: formatNumber(allCount) })}
              </Link>
            </div>
          </div>
        )}

        {noneTranslated && <p className={styles.notice}>{t("noneTranslatedHere", { language })}</p>}

        {category.totalChildren > 0 && (
          <div className={styles.toolbar}>
            <div className={styles.chips} role="group" aria-label={t("subcategories")}>
              <Link
                href={at({ direct: false })}
                scroll={false}
                className={`${styles.chip} ${!direct ? styles.chipActive : ""}`}
                aria-current={!direct ? "true" : undefined}
              >
                {t("includeSub")}
              </Link>
              <Link
                href={at({ direct: true })}
                scroll={false}
                className={`${styles.chip} ${direct ? styles.chipActive : ""}`}
                aria-current={direct ? "true" : undefined}
              >
                {t("onlyDirect")}
              </Link>
            </div>
            <Link href={categoryPath(category)} className={styles.sectionLink}>
              {t("subcategories")} <span aria-hidden="true">→</span>
            </Link>
          </div>
        )}

        {pastLastPage ? (
          <EmptyState>
            {t("pageEmpty")} <Link href={at({})}>{t("goToFirstPage")}</Link>
          </EmptyState>
        ) : hadiths.length === 0 ? (
          <EmptyState>{t("noHadiths")}</EmptyState>
        ) : (
          <HadithList
            hadiths={hadiths}
            loading={loading}
            picker={INTERNATIONAL ? {} : null}
            extras={{
              key: at({}, pagination.page),
              fetch: (codes) =>
                getCategoryHadiths(category.id, lang, {
                  page: pagination.page,
                  perPage: pagination.perPage,
                  direct,
                  translated: filtered,
                  translations: codes,
                }).then((result) => result.hadiths),
            }}
            renderCard={(hadith) => <HadithCard key={hadith.id} hadith={hadith} book={books[hadith.bookSlug]} headingLevel={2} />}
          />
        )}

      </div>

      <Pager pagination={pagination} hrefFor={(page) => at({}, page)} />
    </>
  );
}

CategoryHadiths.getLayout = function getLayout(page) {
  const { data } = page.props;
  return (
    <Layout selectedCategoryId={data ? data.category.id : null} title={data ? () => data.category.title : undefined}>
      {page}
    </Layout>
  );
};

// /categories/{id}/hadiths[/all][/direct][/page/{p}]: built on the first visit, then kept
// (lib/api loadStatic).
export async function getStaticPaths() {
  return staticPaths();
}

export async function getStaticProps({ params }) {
  const { id } = params;
  const view = parseListView(params.view, ["all", "direct"]);
  if (!view) return { notFound: true };
  if (!view.canonical) {
    return { redirect: { destination: listPath(`/categories/${encodeURIComponent(id)}/hadiths`, view), permanent: true } };
  }
  const { direct, all, page } = view;

  return loadStatic(async (lang) => {
    const perPage = config.perPage;
    const count = (translated) =>
      getCategoryHadiths(id, lang, { perPage: 1, direct, translated })
        .then((result) => result.pagination.total)
        .catch(() => null);

    // Default: only hadiths translated into the reader's language (Arabic is
    // the original, so it is never filtered). /all shows every hadith.
    let filtered = !all && lang !== "ar";
    let data = await getCategoryHadiths(id, lang, { page, perPage, direct, translated: filtered });
    let translatedCount = filtered ? data.pagination.total : null;
    let allCount = filtered ? null : data.pagination.total;

    if (filtered && translatedCount === 0) {
      // Nothing translated here: show all of them rather than an empty list.
      data = await getCategoryHadiths(id, lang, { page, perPage, direct });
      filtered = false;
      allCount = data.pagination.total;
    }
    // a page past the end is not a page
    if (data.hadiths.length === 0 && page > 1) return { notFound: true };

    // The other figure for the toggle; the category itself carries both
    // counts unless only its direct hadiths are listed.
    if (allCount == null) allCount = direct ? await count(false) : data.category.totalHadith;
    if (translatedCount == null && lang !== "ar") {
      translatedCount = direct ? await count(true) : data.category.totalTranslated ?? null;
    }

    return {
      props: {
        data,
        direct,
        all,
        filtered,
        counts: { translated: translatedCount, all: allCount },
        books: await booksForHadiths(data.hadiths, lang),
        sidebarData: await sidebarCategoriesData(lang, data.category.id),
        backLink: categoryPath(data.category),
      },
    };
  });
}
