import { server, shareImage } from "../../lib/config";
import { loadPage } from "../../lib/api";
import {
  UNASSIGNED_CHAPTER,
  bookPath,
  chapterPath,
  citablePath,
  cleanText,
  excerpt,
  isCategoryBook,
  lettered,
  shortBookName,
} from "../../lib/hadith";
import { referenceText } from "../../lib/citation";
import { useLocale } from "../../contexts/LocaleContext";
import Meta from "../core/meta";
import Breadcrumbs from "../core/breadcrumbs";
import ErrorState from "../core/error";
import Layout from "../layouts/LayoutSecondary";
import { sidebarBooksData, sidebarCategoriesData } from "../sidebar/data";
import HadithDetail, { HadithNavigation } from "./HadithDetail";
import styles from "../content/Page.module.scss";

// Shared by /hadiths/{id} and /books/{book}/hadiths/{number}. `translations`:
// the extra languages shown under the primary translation (lib/api loadPage).
export default function HadithPage({ hadith, translations, error }) {
  const { t, languageName } = useLocale();

  if (error || !hadith) {
    return (
      <div className={styles.page}>
        <ErrorState error={error} />
      </div>
    );
  }

  const { book, chapter } = hadith;
  // "Sahih Muslim 8a"; records the source does not number say so, so their
  // title is not just the collection's name.
  const reference = referenceText(hadith, book, t);
  const crumbs = [
    { href: "/", label: t("home") },
    { href: "/books", label: t("books") },
    { href: bookPath(book), label: shortBookName(book) },
  ];
  if (chapter && !isCategoryBook(book)) {
    crumbs.push({
      href: chapterPath(book.slug, chapter.chapterNo),
      label: chapter.chapterNo === UNASSIGNED_CHAPTER ? t("unassignedChapter") : t("chapterNumber", { number: chapter.chapterNo }),
    });
  }
  crumbs.push({ label: hadith.referenceNumber ? t("hadithNumbered", { number: lettered(hadith.referenceNumber) }) : t("hadith") });

  // Described by its own translation (the page language, else English). The
  // topic collection's linked translation is another text, so it is only
  // used, labelled, when the hadith has no translation at all.
  const own = hadith.translation && hadith.translation.text ? hadith.translation : null;
  const linked = hadith.linkedTranslation && hadith.linkedTranslation.text ? hadith.linkedTranslation : null;
  const linkedLabel = linked ? t("topicTranslation", { language: languageName(linked.languageCode) }) : "";
  const snippet = own ? excerpt(own.text) : linked ? `${linkedLabel}: ${excerpt(linked.text, 110)}` : "";
  // The citable URL (/books/{book}/hadiths/8a), whichever URL was opened.
  const url = `${server}${citablePath(hadith, book)}`;

  return (
    <>
      <Meta
        title={hadith.title ? `${cleanText(hadith.title).slice(0, 70)} - ${reference}` : reference}
        description={snippet || `${reference} - ${book.name}`}
        url={url}
        canonical={url}
        image={shareImage}
        type="article"
      />

      <div className={styles.page}>
        <Breadcrumbs items={crumbs} />
        <HadithDetail hadith={hadith} translations={translations} />
      </div>

      <HadithNavigation hadith={hadith} />
    </>
  );
}

// HadeethEnc hadiths are browsed by category; the other books by chapter.
export function hadithLayout(page) {
  const { hadith } = page.props;
  const title = hadith ? ({ t }) => referenceText(hadith, hadith.book, t) : undefined;
  if (hadith && isCategoryBook(hadith.book)) {
    const first = hadith.categories && hadith.categories[0];
    return (
      <Layout selectedCategoryId={first ? first.id : null} title={title}>
        {page}
      </Layout>
    );
  }
  return (
    <Layout
      sidebar="books"
      selectedBookSlug={hadith ? hadith.book.slug : null}
      selectedChapterNo={hadith && hadith.chapter ? hadith.chapter.chapterNo : null}
      title={title}
    >
      {page}
    </Layout>
  );
}

// `fetchHadith(lang, { translations })` loads the hadith in the content
// language with the reader's extra translations.
export function loadHadithPage(context, fetchHadith) {
  return loadPage(context, async (lang, { translations }) => {
    const hadith = await fetchHadith(lang, { translations });
    const topic = isCategoryBook(hadith.book);
    const first = hadith.categories && hadith.categories[0];
    return {
      props: {
        hadith,
        sidebarData: topic
          ? await sidebarCategoriesData(lang, first ? first.id : null)
          : await sidebarBooksData(lang, { book: hadith.book.slug }),
        backLink:
          hadith.chapter && !isCategoryBook(hadith.book)
            ? chapterPath(hadith.book.slug, hadith.chapter.chapterNo)
            : bookPath(hadith.book),
      },
    };
  });
}
