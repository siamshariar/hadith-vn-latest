import { server, shareImage } from "../lib/config";
import { loadStatic } from "../lib/api";
import { useLocale } from "../contexts/LocaleContext";
import Meta from "../components/core/meta";
import Layout from "../components/layouts/LayoutTertiary";
import { sidebarCategoriesData } from "../components/sidebar/data";
import AboutContent from "../components/pages/about";

export default function AboutPage() {
  const { t } = useLocale();
  return (
    <>
      <Meta
        title={t("about")}
        description={`${t("aboutApp")} ${t("siteTagline")}`}
        url={`${server}/about`}
        image={shareImage}
        type="website"
      />

      <AboutContent />
    </>
  );
}

AboutPage.getLayout = function getLayout(page) {
  return <Layout>{page}</Layout>;
};

// Built once in the site's language (lib/api loadStatic); the phone header shows the
// page title (an interface string).
export async function getStaticProps() {
  return loadStatic(async (lang) => ({ props: { contentTitleKey: "about", sidebarData: await sidebarCategoriesData(lang) } }));
}
