import { server, shareImage } from "../lib/config";
import { loadPage } from "../lib/api";
import { useLocale } from "../contexts/LocaleContext";
import Meta from "../components/core/meta";
import Layout from "../components/layouts/LayoutTertiary";
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

// Server-rendered in the reader's language (lib/api loadPage); the phone header shows the
// page title (an interface string).
export async function getServerSideProps(context) {
  return loadPage(context, async () => ({ props: { contentTitleKey: "about" } }));
}
