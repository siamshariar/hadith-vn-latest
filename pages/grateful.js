import { server, shareImage } from "../lib/config";
import { loadStatic } from "../lib/api";
import { useLocale } from "../contexts/LocaleContext";
import Meta from "../components/core/meta";
import Layout from "../components/layouts/LayoutTertiary";
import { sidebarCategoriesData } from "../components/sidebar/data";
import GratefulContent from "../components/pages/grateful";

export default function GratefulPage() {
  const { t } = useLocale();
  return (
    <>
      <Meta
        title={t("grateful")}
        description={t("gratefulText")}
        url={`${server}/grateful`}
        image={shareImage}
        type="website"
      />

      <GratefulContent />
    </>
  );
}

GratefulPage.getLayout = function getLayout(page) {
  return <Layout>{page}</Layout>;
};

// Built once in the site's language (lib/api loadStatic); the phone header shows the
// page title (an interface string).
export async function getStaticProps() {
  return loadStatic(async (lang) => ({ props: { contentTitleKey: "grateful", sidebarData: await sidebarCategoriesData(lang) } }));
}
