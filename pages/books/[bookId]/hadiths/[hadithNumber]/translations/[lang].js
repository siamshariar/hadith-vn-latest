import { bookHadithPath } from "../../../../../../lib/hadith";

// Old per-language URLs: the hadith page (each site reads in its own language).
export default function HadithTranslationRedirect() {
  return null;
}

export async function getServerSideProps(context) {
  const { bookId, hadithNumber } = context.params;
  const destination = bookHadithPath(bookId, hadithNumber);
  return {
    redirect: {
      destination,
      permanent: true,
    },
  };
}
