import { server, shareImage } from "../lib/config";
import { loadStatic } from "../lib/api";
import { useLocale } from "../contexts/LocaleContext";
import Meta from "../components/core/meta";
import Layout from "../components/layouts/LayoutTertiary";
import ContactContent from "../components/pages/contact";

export default function ContactPage() {
  const { t } = useLocale();
  return (
    <>
      <Meta
        title={t("contact")}
        description={t("contactText")}
        url={`${server}/contact`}
        image={shareImage}
        type="website"
      />

      <ContactContent />
    </>
  );
}

ContactPage.getLayout = function getLayout(page) {
  return <Layout>{page}</Layout>;
};

// Built once in the site's language (lib/api loadStatic); the phone header shows the
// page title (an interface string).
export async function getStaticProps() {
  return loadStatic(async () => ({ props: { contentTitleKey: "contact" } }));
}
