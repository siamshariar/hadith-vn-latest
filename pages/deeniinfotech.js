import { server, shareImage } from "../lib/config";
import { loadPage } from "../lib/api";
import { useLocale } from "../contexts/LocaleContext";
import Meta from "../components/core/meta";
import Layout from "../components/layouts/LayoutTertiary";
import DeeniinfotechContent from "../components/pages/deeniinfotech";

export default function DeeniInfoTech() {
  const { t } = useLocale();
  return (
    <>
      <Meta
        title="Deeni Info Tech"
        description={t("labelValue", { label: "Deeni Info Tech", value: t("deeniText") })}
        url={`${server}/deeniinfotech`}
        image={shareImage}
        type="website"
      />

      <DeeniinfotechContent />
    </>
  );
}

DeeniInfoTech.getLayout = function getLayout(page) {
  return <Layout>{page}</Layout>;
};

// Server-rendered in the reader's language (lib/api loadPage); the phone header shows the
// page title.
export async function getServerSideProps(context) {
  return loadPage(context, async () => ({ props: { contentTitle: "Deeni Info Tech" } }));
}
