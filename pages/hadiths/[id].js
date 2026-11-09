import { getHadith, staticPaths } from "../../lib/api";
import HadithPage, { hadithLayout, loadHadithPage } from "../../components/hadith/HadithPage";

export default function Hadith(props) {
  return <HadithPage {...props} />;
}

Hadith.getLayout = hadithLayout;

// Built on the first visit, then kept (lib/api loadStatic).
export async function getStaticPaths() {
  return staticPaths();
}

export async function getStaticProps({ params }) {
  const { id } = params;
  if (!/^\d+$/.test(String(id))) return { notFound: true };
  return loadHadithPage((lang) => getHadith(id, lang));
}
