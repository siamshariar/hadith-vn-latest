import Link from "next/link";
import { useRouter } from "next/router";
import { server, config, shareImage } from "../../../lib/config";
import { booksForHadiths, getCategoryHadiths, loadPage, parsePage } from "../../../lib/api";
import { categoryCrumbs, categoryHadithsPath, categoryPath } from "../../../lib/hadith";
import { useLocale } from "../../../contexts/LocaleContext";
import useRouteLoading from "../../../hooks/useRouteLoading";
import Meta from "../../../components/core/meta";
import Breadcrumbs from "../../../components/core/breadcrumbs";
import ErrorState, { EmptyState } from "../../../components/core/error";
import Pagination, { pageHref } from "../../../components/core/pagination";
import Layout from "../../../components/layouts/LayoutSecondary";
import { sidebarCategoriesData } from "../../../components/sidebar/data";
import HadithCard, { HadithList } from "../../../components/hadith/HadithCard";
import styles from "../../../components/content/Page.module.scss";

export default function CategoryHadiths({ data, books, direct, filtered, counts, translations, error }) {
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

  const { category, hadiths, pagination } = data;
  const basePath = categoryHadithsPath(category);
  // Kept by pagination and every toggle: ?lang=, ?direct=1 and ?all=1
  // (all hadiths; the default is those translated into the reader's language).
  const query = {
    lang: router.query.lang || undefined,
    tr: router.query.tr,
    direct: direct ? 1 : undefined,
    all: router.query.all === "1" ? 1 : undefined,
  };
  const language = languageName(lang);
  const translatedCount = counts ? counts.translated : null;
  const allCount = counts ? counts.all : pagination.total;
  const showLanguageToggle =
    lang !== "ar" && translatedCount != null && translatedCount > 0 && translatedCount < allCount;
  const noneTranslated = lang !== "ar" && translatedCount === 0 && router.query.all !== "1";
  const crumbs = categoryCrumbs(category, t, { linkCurrent: true });
  crumbs.push({ label: t("hadith") });
  const pastLastPage = hadiths.length === 0 && pagination.total > 0;

  return (
    <>
      <Meta
        title={t("labelValue", { label: t("hadithsInCategory"), value: category.title })}
        description={`${category.title}: ${t("hadithCount", { count: pagination.total })}.`}
        url={`${server}${pageHref(basePath, query, pagination.page)}`}
        image={shareImage}
        type="website"
      />

      <div className={styles.page}>
        <Breadcrumbs items={crumbs} />

        <header className={styles.header}>
          <h1 className={styles.title}>{category.title}</h1>
          {category.titleArabic && (
            <p className={styles.titleArabic} dir="rtl" lang="ar">
              {category.titleArabic}
            </p>
          )}
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
                href={pageHref(basePath, { ...query, all: undefined }, 1)}
                className={`${styles.chip} ${filtered ? styles.chipActive : ""}`}
                aria-current={filtered ? "true" : undefined}
                scroll={false}
              >
                {t("onlyLanguage", { language, count: formatNumber(translatedCount) })}
              </Link>
              <Link
                href={pageHref(basePath, { ...query, all: 1 }, 1)}
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
                href={pageHref(basePath, { ...query, direct: undefined }, 1)}
                scroll={false}
                className={`${styles.chip} ${!direct ? styles.chipActive : ""}`}
                aria-current={!direct ? "true" : undefined}
              >
                {t("includeSub")}
              </Link>
              <Link
                href={pageHref(basePath, { ...query, direct: 1 }, 1)}
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
            {t("pageEmpty")} <Link href={pageHref(basePath, query, 1)}>{t("goToFirstPage")}</Link>
          </EmptyState>
        ) : hadiths.length === 0 ? (
          <EmptyState>{t("noHadiths")}</EmptyState>
        ) : (
          <HadithList
            hadiths={hadiths}
            loading={loading}
            picker={{ translations }}
            renderCard={(hadith) => <HadithCard key={hadith.id} hadith={hadith} book={books[hadith.bookSlug]} headingLevel={2} />}
          />
        )}

        <Pagination pagination={pagination} hrefFor={(page) => pageHref(basePath, query, page)} />
      </div>
    </>
  );
}

CategoryHadiths.getLayout = function getLayout(page) {
  const { data } = page.props;
  return <Layout selectedCategoryId={data ? data.category.id : null}>{page}</Layout>;
};

export async function getServerSideProps(context) {
  const { id } = context.params;
  const direct = context.query.direct === "1";
  const all = context.query.all === "1";

  return loadPage(context, async (lang, { translations }) => {
    const page = parsePage(context.query.page);
    const perPage = config.perPage;
    const count = (translated) =>
      getCategoryHadiths(id, lang, { perPage: 1, direct, translated })
        .then((result) => result.pagination.total)
        .catch(() => null);

    // Default: only hadiths translated into the reader's language (Arabic is
    // the original, so it is never filtered). ?all=1 shows every hadith.
    let filtered = !all && lang !== "ar";
    let data = await getCategoryHadiths(id, lang, { page, perPage, direct, translated: filtered, translations });
    let translatedCount = filtered ? data.pagination.total : null;
    let allCount = filtered ? null : data.pagination.total;

    if (filtered && translatedCount === 0) {
      // Nothing translated here: show all of them rather than an empty list.
      data = await getCategoryHadiths(id, lang, { page, perPage, direct, translations });
      filtered = false;
      allCount = data.pagination.total;
    }

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
        filtered,
        counts: { translated: translatedCount, all: allCount },
        books: await booksForHadiths(data.hadiths, lang),
        sidebarData: await sidebarCategoriesData(lang, data.category.id),
        backLink: categoryPath(data.category),
      },
    };
  });
}
