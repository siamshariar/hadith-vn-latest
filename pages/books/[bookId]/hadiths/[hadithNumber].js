import { getBookHadith, staticPaths } from "../../../../lib/api";
import HadithPage, { hadithLayout, loadHadithPage } from "../../../../components/hadith/HadithPage";

// A hadith by the number people cite (`referenceNumber`), e.g.
// /books/sahih-muslim/hadiths/8 (the API also accepts 8a or 8.01).
export default function BookHadith(props) {
  return <HadithPage {...props} />;
}

BookHadith.getLayout = hadithLayout;

// Built on the first visit, then kept (lib/api loadStatic).
export async function getStaticPaths() {
  return staticPaths();
}

export async function getStaticProps({ params }) {
  const { bookId, hadithNumber } = params;
  return loadHadithPage((lang) => getBookHadith(bookId, hadithNumber, lang));
}
