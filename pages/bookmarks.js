import { useRouter } from "next/router";
import { server, shareImage } from "../lib/config";
import { loadStatic } from "../lib/api";
import { useLocale } from "../contexts/LocaleContext";
import Meta from "../components/core/meta";
import Breadcrumbs from "../components/core/breadcrumbs";
import Layout from "../components/layouts/LayoutSecondary";
import { sidebarCategoriesData } from "../components/sidebar/data";
import BookmarkContent from "../components/bookmark/page";
import BookmarkMobile from "../components/mobile/Storage";
import styles from "../components/content/Page.module.scss";

// /bookmarks?key={folder}: one bookmark folder (its own heading). Without a
// key: the saved lists (bookmarks, pins, last read) as tabs.
export default function Bookmark() {
  const router = useRouter();
  const { t } = useLocale();
  const key = typeof router.query.key === "string" ? router.query.key : null;

  return (
    <>
      <Meta
        title={t("savedLists")}
        description={t("savedListsDescription")}
        url={`${server}/bookmarks`}
        image={shareImage}
        type="website"
        noindex
      />
      {key ? (
        <BookmarkContent folderKey={key} />
      ) : (
        <div className={styles.page}>
          <Breadcrumbs items={[{ href: "/", label: t("home") }, { label: t("savedLists") }]} />
          <header className={styles.header}>
            <h1 className={styles.title}>{t("savedLists")}</h1>
          </header>
          <BookmarkMobile />
        </div>
      )}
    </>
  );
}

Bookmark.getLayout = function getLayout(page) {
  return <Layout title={({ t }) => t("savedLists")}>{page}</Layout>;
};

// Server-rendered only to know the reader's language; the bookmarks
// themselves live in this browser's localStorage.
export async function getStaticProps() {
  return loadStatic(async (lang) => ({
    props: { sidebarData: await sidebarCategoriesData(lang), backLink: "/" },
  }));
}
