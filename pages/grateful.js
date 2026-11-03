import { server, shareImage } from "../lib/config";
import { loadPage } from "../lib/api";
import { useLocale } from "../contexts/LocaleContext";
import Meta from "../components/core/meta";
import Layout from "../components/layouts/LayoutTertiary";
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

// Server-rendered in the reader's language (lib/api loadPage); the phone header shows the
// page title (an interface string).
export async function getServerSideProps(context) {
  return loadPage(context, async () => ({ props: { contentTitleKey: "grateful" } }));
}
