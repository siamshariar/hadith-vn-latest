import { server, shareImage } from "../lib/config";
import { loadPage } from "../lib/api";
import { useLocale } from "../contexts/LocaleContext";
import Meta from "../components/core/meta";
import Layout from "../components/layouts/LayoutTertiary";
import SupportContent from "../components/pages/support";

export default function SupportPage() {
  const { t } = useLocale();
  return (
    <>
      <Meta
        title={t("support")}
        description={t("supportText")}
        url={`${server}/support`}
        image={shareImage}
        type="website"
      />

      <SupportContent />
    </>
  );
}

SupportPage.getLayout = function getLayout(page) {
  return <Layout>{page}</Layout>;
};

// Server-rendered in the reader's language (lib/api loadPage); the phone header shows the
// page title (an interface string).
export async function getServerSideProps(context) {
  return loadPage(context, async () => ({ props: { contentTitleKey: "support" } }));
}
