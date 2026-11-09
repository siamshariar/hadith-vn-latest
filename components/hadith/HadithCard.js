import Link from "next/link";
import Skeleton from "react-loading-skeleton";
import { useLocale } from "../../contexts/LocaleContext";
import { useWithExtras } from "../../contexts/ExtraTranslationsContext";
import { INTERNATIONAL } from "../../lib/language";
import {
  UNASSIGNED_CHAPTER,
  bookPath,
  chapterPath,
  citablePath,
  cleanText,
  isCategoryBook,
  namedGrades,
  shortBookName,
} from "../../lib/hadith";
import { inBookText, referenceText } from "../../lib/citation";
import { extraTranslations } from "../../lib/translations";
import HadithOptions from "../content/HadithOptions";
import { GradeBadge } from "./Grades";
import { Highlighted } from "./Highlight";
import { ArabicFold, ArabicText, HadithTranslations, LinkedTranslationNote, shownTranslation } from "./HadithText";
import TranslationPicker from "./TranslationPicker";
import styles from "./HadithCard.module.scss";

// Book › chapter, for lists that mix chapters (search results). Nothing for
// HadeethEnc: its one chapter is technical and the citation names the book.
function CardContext({ hadith, book }) {
  const { t } = useLocale();
  const chapterNo = hadith.chapterNo;
  if (!book || isCategoryBook(book) || chapterNo == null) return null;
  return (
    <p className={styles.context}>
      <Link href={bookPath(book)}>{shortBookName(book)}</Link>
      <span className={styles.contextSep} aria-hidden="true">
        ›
      </span>
      <Link href={chapterPath(book.slug, chapterNo)}>
        {chapterNo === UNASSIGNED_CHAPTER ? t("unassignedChapter") : t("chapterNumber", { number: chapterNo })}
      </Link>
    </p>
  );
}

// One hadith in a list (chapter, category, search, bookmarks), in full, as a verse on the Quran
// sites. The header is the compact reference: the citation (book plus `referenceNumber`, the
// number people cite) as a tag, the in-book reference when the list knows it, the first
// grade, and ⋮; the full grade table is on the detail page.
// - showContext: book › chapter above the citation (search results);
// - inBookReference: { chapterNo, position } when the API item has none
//   (the chapter page knows each hadith's position).
// `headingLevel`: 2 where the cards sit right under the page's h1 (a chapter, a
// category's list, a bookmark folder); 3 under a section heading (search results).
export default function HadithCard({ hadith, book, showContext = false, inBookReference, isBookmarkPage, updateBookmarksData, headingLevel = 3 }) {
  const Title = headingLevel === 2 ? "h2" : "h3";
  const { t } = useLocale();
  const href = citablePath(hadith, book);
  const inBook = isCategoryBook(book) ? null : inBookText(hadith.inBookReference || inBookReference, t);
  // The copied citation carries the in-book reference the card shows.
  const withInBook = !hadith.inBookReference && inBookReference ? { ...hadith, inBookReference } : hadith;
  const { linked, own } = shownTranslation(hadith);
  // Without any translation the Arabic stays, even when the reader hides it.
  const arabicOnly = !linked && !own && !extraTranslations(hadith).some((slot) => slot.entry);

  return (
    <article className={styles.card} id={`hadith-${hadith.id}`}>
      <header className={styles.head}>
        {showContext && <CardContext hadith={hadith} book={book} />}
        <div className={styles.refLine}>
          <Link href={href} className={styles.citation}>
            {referenceText(hadith, book, t)}
          </Link>
          {inBook && <span className={styles.inBook}>{inBook}</span>}
          <GradeBadge grades={namedGrades(hadith, book)} gradeText={hadith.gradeText} />
          <span className={styles.options}>
            <HadithOptions
              hadith={withInBook}
              book={book}
              isBookmarkPage={isBookmarkPage}
              updateBookmarksData={updateBookmarksData}
              showDetails
            />
          </span>
        </div>
      </header>

      {hadith.title && (
        <Title className={styles.title} dir="auto">
          {/* HadeethEnc titles are in the language of its translation */}
          <Link href={href}>
            <Highlighted text={cleanText(hadith.title)} field={hadith.translation && hadith.translation.languageCode} />
          </Link>
        </Title>
      )}

      {/* The translation, then the Arabic folded under it as a footnote is on the Quran sites
          (open on a tap). With no translation at all, the Arabic is the text, open. The reader
          settings can hide the Arabic. */}
      {arabicOnly ? (
        <div className={`${styles.arabicCol} ${styles.arabicOnly}`}>
          <ArabicText text={hadith.arabic} />
        </div>
      ) : (
        <>
          <div className={styles.translationCol}>
            <HadithTranslations hadith={hadith} book={book} compact collapsible />
          </div>
          <div className={styles.arabicCol}>
            <ArabicFold text={hadith.arabic} />
          </div>
        </>
      )}

      <footer className={styles.foot}>
        <Link href={href} className={styles.details}>
          {t("viewDetails")}
          <span className={styles.detailsArrow} aria-hidden="true">
            {" "}
            →
          </span>
        </Link>
      </footer>
    </article>
  );
}

export function HadithCardSkeleton({ count = 3 }) {
  return Array.from({ length: count }, (_, index) => (
    <div className={styles.card} key={index} aria-hidden="true">
      <div className={styles.head}>
        <Skeleton width={160} height={18} />
      </div>
      <div className={styles.translationCol}>
        <Skeleton width={140} height={12} />
        <Skeleton count={2} height={16} />
        <Skeleton width="75%" height={16} />
      </div>
      <div className={styles.skeletonFold}>
        <Skeleton width={180} height={16} />
      </div>
    </div>
  ));
}

// A list of cards that switches to skeletons while the next page loads.
// When cards show the topic collection's linked translations, what that label
// means is said once, above the list (LinkedTranslationNote). On the international site:
// `picker`, the translations chip above the list ({ book }) for lists without one of their
// own (the collection is the cards' own when they share one), and `extras`, how to load the
// same list with the reader's extra translations ({ key, fetch(codes) }:
// contexts/ExtraTranslationsContext).
export function HadithList({ hadiths: given, loading, renderCard, skeletonCount = 4, picker, extras }) {
  const hadiths = useWithExtras(extras ? extras.key : null, given, extras ? extras.fetch : null);
  const books = new Set((hadiths || []).map((hadith) => hadith.bookSlug));
  const chip =
    picker && INTERNATIONAL ? (
      <div className={styles.listTools}>
        <TranslationPicker book={picker.book || (books.size === 1 ? [...books][0] : null)} />
      </div>
    ) : null;

  if (loading) {
    return (
      <>
        {chip}
        <div className={styles.list} aria-busy="true">
          <HadithCardSkeleton count={skeletonCount} />
        </div>
      </>
    );
  }
  return (
    <>
      {chip}
      <LinkedTranslationNote hadiths={hadiths} />
      <div className={styles.list}>{hadiths.map((hadith, index) => renderCard(hadith, index))}</div>
    </>
  );
}
