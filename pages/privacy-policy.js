import { server, shareImage } from "../lib/config";
import { loadPage } from "../lib/api";
import { useLocale } from "../contexts/LocaleContext";
import Meta from "../components/core/meta";
import Layout from "../components/layouts/LayoutTertiary";
import PrivacyPolicyContent from "../components/pages/privacy-policy";

export default function PrivacyPolicyPage() {
  const { t } = useLocale();
  return (
    <>
      <Meta
        title={t("privacyPolicy")}
        description={t("privacyText")}
        url={`${server}/privacy-policy`}
        image={shareImage}
        type="website"
      />

      <PrivacyPolicyContent />
    </>
  );
}

PrivacyPolicyPage.getLayout = function getLayout(page) {
  return <Layout>{page}</Layout>;
};

// Server-rendered in the reader's language (lib/api loadPage); the phone header shows the
// page title (an interface string).
export async function getServerSideProps(context) {
  return loadPage(context, async () => ({ props: { contentTitleKey: "privacyPolicy" } }));
}
