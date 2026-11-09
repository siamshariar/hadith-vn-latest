import Link from "next/link";
import { loadStaticPage } from "../lib/api";
import { useLocale } from "../contexts/LocaleContext";
import Meta from "../components/core/meta";
import Layout from "../components/layouts/LayoutTertiary";
import page from "../components/content/Page.module.scss";
import styles from "../components/content/NotFound.module.scss";

// A server error (an exception while a page was rendered), inside the site's header and
// footer like the not-found page, so the reader can carry on. Next.js pre-renders it at
// build time, in the site's interface language, and the browser switches it to the
// reader's; it calls no API. API failures do not come here: those pages show their own
// error state with a retry button.
export default function ServerErrorPage() {
  const { t } = useLocale();

  return (
    <>
      <Meta title={t("serverErrorTitle")} description={t("serverErrorMessage")} noindex />
      <div className={page.page}>
        <div className={styles.notFound}>
          <p className={styles.code} aria-hidden="true">
            500
          </p>
          <h1 className={styles.title}>{t("serverErrorTitle")}</h1>
          <p className={styles.message}>{t("serverErrorMessage")}</p>
          <ul className={styles.links}>
            <li>
              <Link href="/" className={styles.primary}>
                {t("home")}
              </Link>
            </li>
            <li>
              <Link href="/books">{t("books")}</Link>
            </li>
            <li>
              <Link href="/categories">{t("categories")}</Link>
            </li>
            <li>
              <Link href="/search">{t("search")}</Link>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}

ServerErrorPage.getLayout = function getLayout(page) {
  return <Layout>{page}</Layout>;
};

// The site's interface and its catalog (lib/api loadStaticPage).
export async function getStaticProps() {
  return loadStaticPage({ contentTitle: "500" });
}
