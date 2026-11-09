import Link from "next/link";
import { loadStaticPage } from "../lib/api";
import { useLocale } from "../contexts/LocaleContext";
import Meta from "../components/core/meta";
import Layout from "../components/layouts/LayoutTertiary";
import page from "../components/content/Page.module.scss";
import styles from "../components/content/NotFound.module.scss";

// Inside the site's header and footer, so the reader can carry on from here.
export default function NotFoundPage() {
  const { t } = useLocale();

  return (
    <>
      <Meta title={t("notFoundTitle")} description={t("notFoundMessage")} noindex />
      <div className={page.page}>
        <div className={styles.notFound}>
          <p className={styles.code} aria-hidden="true">
            404
          </p>
          <h1 className={styles.title}>{t("notFoundTitle")}</h1>
          <p className={styles.message}>{t("notFoundMessage")}</p>
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

NotFoundPage.getLayout = function getLayout(page) {
  return <Layout>{page}</Layout>;
};

// Built once, in the site's interface; the browser switches it to the reader's language
// (contexts/LocaleContext.js), loading that catalog.
export async function getStaticProps() {
  return loadStaticPage({ contentTitle: "404" });
}
