import { server, shareImage } from "../lib/config";
import { loadStatic } from "../lib/api";
import { useLocale } from "../contexts/LocaleContext";
import Meta from "../components/core/meta";
import Layout from "../components/layouts/LayoutTertiary";
import SettingsContent from "../components/settings";
import css from "../components/pages/style.module.scss";
import styles from "../components/pages/about.module.scss";

// The phone header and menu link here (on the page they open the same
// settings in a dialog), so the link also works in a new tab.
export default function SettingsPage() {
  const { t } = useLocale();
  return (
    <>
      <Meta
        title={t("settingsTitle")}
        description={t("settingsNote")}
        url={`${server}/settings`}
        image={shareImage}
        type="website"
        noindex
      />

      <div className={css.wrapper}>
        <div className={css.page_item}>
          <div className={styles.quran_content}>
            <h1 className={styles.title}>{t("settingsTitle")}</h1>
          </div>
          <SettingsContent />
        </div>
      </div>
    </>
  );
}

SettingsPage.getLayout = function getLayout(page) {
  return <Layout>{page}</Layout>;
};

// Built once in the site's language (lib/api loadStatic); the phone header shows the
// page title (an interface string).
export async function getStaticProps() {
  return loadStatic(async () => ({ props: { contentTitleKey: "settingsTitle" } }));
}
