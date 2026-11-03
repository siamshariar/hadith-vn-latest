import { Fragment, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { PinContext } from "../../contexts/PinContext";
import { useLocale } from "../../contexts/LocaleContext";
import {
  UNASSIGNED_CHAPTER,
  bookHadithPath,
  bookPath,
  categoryPath,
  chapterPath,
  citablePath,
  cleanText,
  hadithPath,
  isCategoryBook,
  lettered,
  namedGrades,
  shortBookName,
  storedHadithRef,
} from "../../lib/hadith";
import { referenceText } from "../../lib/citation";
import { TRANSLATIONS_PARAM, extraTranslations } from "../../lib/translations";
import HadithOptions from "../content/HadithOptions";
import { GradeBadge } from "./Grades";
import HadithReference from "./HadithReference";
import { ArabicText, HadithTranslations, shownTranslation } from "./HadithText";
import ReaderBar, { barStyles } from "./ReaderBar";
import TranslationPicker from "./TranslationPicker";
import styles from "./HadithDetail.module.scss";

// A related hadith (API `related`: same wording in another collection) by its citation.
const relatedLabel = (item) => `${item.bookName} ${lettered(item.referenceNumber)}`.trim();
const relatedPath = (item) =>
  item.referenceNumber && item.bookSlug
    ? bookHadithPath(item.bookSlug, lettered(item.referenceNumber))
    : hadithPath(item);

// "Cũng có trong: Sahih Muslim 1907a", near the top as dorar.net does. The
// API only relates hadiths whose Arabic wording matches exactly.
function AlsoIn({ related, keepLang }) {
  const { t } = useLocale();
  if (!related || !related.length) return null;
  return (
    <p className={styles.alsoIn}>
      <span className={styles.alsoInLabel}>{t("labelColon", { label: t("alsoIn") })}</span>{" "}
      {related.map((item, index) => (
        <Fragment key={item.id}>
          {index > 0 && ", "}
          <Link href={`${relatedPath(item)}${keepLang}`}>{relatedLabel(item)}</Link>
        </Fragment>
      ))}
    </p>
  );
}

// True once `ref`'s element has scrolled up under the header and reader bar.
const COVERED = 100;
function useScrolledPast(ref) {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => setPast(!entry.isIntersecting && entry.boundingClientRect.top < COVERED),
      { rootMargin: `-${COVERED}px 0px 0px 0px` }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return past;
}

// One-off view settings a link keeps from page to page: ?lang= and ?tr=.
function keptQuery(query) {
  const params = new URLSearchParams();
  if (query.lang) params.set("lang", String(query.lang));
  if (query[TRANSLATIONS_PARAM] !== undefined) params.set(TRANSLATIONS_PARAM, String(query[TRANSLATIONS_PARAM]));
  const text = params.toString();
  return text ? `?${text.replace(/%2C/gi, ",")}` : "";
}

// HadeethEnc explanation, benefits (`hints`), word meanings and sources.
function Details({ details }) {
  const { t, lang, languageName, directionOf } = useLocale();
  if (!details) return null;

  const code = details.languageCode;
  const dir = directionOf(code);
  const hints = (details.hints || []).map(cleanText).filter(Boolean);
  const words = (details.wordsMeanings || []).filter((item) => item && (item.word || item.meaning));

  return (
    <div className={styles.details}>
      {details.isFallback && (
        <p className={styles.fallbackNote}>{t("detailsFallback", { language: languageName(lang) })}</p>
      )}

      {details.attribution && (
        <p className={styles.attribution} lang={code} dir={dir}>
          <span className={styles.attributionLabel}>{t("labelColon", { label: t("attribution") })}</span> {cleanText(details.attribution)}
        </p>
      )}

      {details.explanation && (
        <section className={styles.section} aria-labelledby="hadith-explanation">
          <h2 id="hadith-explanation" className={styles.sectionTitle}>
            {t("explanation")}
          </h2>
          <div className={styles.prose} lang={code} dir={dir}>
            {cleanText(details.explanation)}
          </div>
        </section>
      )}

      {hints.length > 0 && (
        <section className={styles.section} aria-labelledby="hadith-benefits">
          <h2 id="hadith-benefits" className={styles.sectionTitle}>
            {t("benefits")}
          </h2>
          <ul className={styles.hints} lang={code} dir={dir}>
            {hints.map((hint, index) => (
              <li key={index}>{hint}</li>
            ))}
          </ul>
        </section>
      )}

      {words.length > 0 && (
        <section className={styles.section} aria-labelledby="hadith-words">
          <h2 id="hadith-words" className={styles.sectionTitle}>
            {t("wordMeanings")}
          </h2>
          <dl className={styles.words} lang={code}>
            {words.map((item, index) => (
              <div key={index}>
                <dt dir="auto">{cleanText(item.word)}</dt>
                <dd dir="auto">{cleanText(item.meaning)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {details.reference && (
        <section className={styles.section} aria-labelledby="hadith-sources">
          <h2 id="hadith-sources" className={styles.sectionTitle}>
            {t("sources")}
          </h2>
          <div className={styles.reference} dir="rtl" lang="ar" translate="no">
            {cleanText(details.reference)}
          </div>
        </section>
      )}
    </div>
  );
}

// Previous / next hadith in the same collection (API `navigation`, linked by
// id; some records have no referenceNumber). Renders nothing without it.
function HadithNavigation({ navigation, book, keepLang }) {
  const { t } = useLocale();
  if (!navigation || (!navigation.previous && !navigation.next)) return null;
  const label = (item) => (item.referenceNumber ? `${shortBookName(book)} ${lettered(item.referenceNumber)}` : null);

  return (
    <nav className={styles.navigation} aria-label={`${t("previousHadith")} / ${t("nextHadith")}`}>
      {navigation.previous ? (
        <Link href={`${citablePath(navigation.previous, book)}${keepLang}`} className={styles.navLink} rel="prev">
          <span className={styles.navDirection}>
            <span aria-hidden="true">‹ </span>
            {t("previousHadith")}
          </span>
          {label(navigation.previous) && <span className={styles.navRef}>{label(navigation.previous)}</span>}
        </Link>
      ) : (
        <span />
      )}
      {navigation.next && (
        <Link href={`${citablePath(navigation.next, book)}${keepLang}`} className={`${styles.navLink} ${styles.navNext}`} rel="next">
          <span className={styles.navDirection}>
            {t("nextHadith")}
            <span aria-hidden="true"> ›</span>
          </span>
          {label(navigation.next) && <span className={styles.navRef}>{label(navigation.next)}</span>}
        </Link>
      )}
    </nav>
  );
}

// `translations`: the extra languages the page shows (lib/translations).
export default function HadithDetail({ hadith, translations }) {
  const { t } = useLocale();
  const router = useRouter();
  const { addLastRead } = useContext(PinContext);
  const { book, chapter } = hadith;
  const titleRef = useRef(null);
  const titleScrolledAway = useScrolledPast(titleRef);

  useEffect(() => {
    addLastRead(storedHadithRef(hadith, book));
    // Record once per hadith.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hadith.id]);

  // Links to other hadiths keep a one-off ?lang= and ?tr=.
  const keepLang = keptQuery(router.query);
  const extras = translations || (hadith.extraLanguages || []).map((language) => language.code);
  const categoryBook = isCategoryBook(book);
  const showChapter = chapter && !categoryBook;
  const chapterText = showChapter
    ? chapter.chapterNo === UNASSIGNED_CHAPTER
      ? t("unassignedChapter")
      : t("chapterNumberName", { number: chapter.chapterNo, name: chapter.name })
    : null;
  // HadeethEnc is browsed by category: its first one stands for the chapter.
  const category = categoryBook && hadith.categories && hadith.categories[0];
  const reference = referenceText(hadith, book, t);
  const { linked, own } = shownTranslation(hadith);
  const arabicOnly = !linked && !own && !extraTranslations(hadith).some((slot) => slot.entry);

  // The translations chip is in the header; the reader bar shows it too once
  // the header has scrolled away.
  return (
    <article className={styles.detail}>
      <ReaderBar
        picker={{ translations: extras, book: book.slug, hidden: !titleScrolledAway }}
        trailing={
          <span className={`${barStyles.trailing} ${titleScrolledAway ? barStyles.trailingShown : ""}`} aria-hidden={!titleScrolledAway}>
            {reference}
          </span>
        }
      >
        <Link href={bookPath(book)} className={`${barStyles.book} ${showChapter || category ? barStyles.bookOptional : ""}`}>
          {shortBookName(book)}
        </Link>
        {(showChapter || category) && (
          <>
            <span className={`${barStyles.separator} ${barStyles.bookOptional}`} aria-hidden="true">
              ›
            </span>
            <Link
              href={showChapter ? chapterPath(book.slug, chapter.chapterNo) : categoryPath(category)}
              className={barStyles.shrink}
            >
              {showChapter ? chapterText : category.title}
            </Link>
          </>
        )}
      </ReaderBar>

      <header className={styles.header}>
        <h1 className={styles.title} dir="auto" ref={titleRef}>
          {hadith.title ? cleanText(hadith.title) : reference}
        </h1>

        <div className={styles.facts}>
          {hadith.referenceNumber && (
            <span className={styles.fact}>
              {t("labelColon", { label: t("hadithNumber") })} <strong>{lettered(hadith.referenceNumber)}</strong>
            </span>
          )}
          <GradeBadge grades={namedGrades(hadith, book)} gradeText={hadith.gradeText} />
          {hadith.title && <span className={styles.fact}>{reference}</span>}
          <span className={styles.picker}>
            <TranslationPicker translations={extras} book={book.slug} />
          </span>
        </div>

        <AlsoIn related={hadith.related} keepLang={keepLang} />

        <HadithOptions hadith={hadith} book={book} />
      </header>

      {/* Side by side on wide screens (translation left, Arabic right),
          stacked on phones; the reader settings choose which comes first
          and can hide the Arabic. */}
      <div className={styles.texts}>
        <section className={`${styles.arabicBlock} ${arabicOnly ? styles.arabicOnly : ""}`} aria-label={t("arabicText")}>
          <ArabicText text={hadith.arabic} />
        </section>

        <section className={styles.translationBlock}>
          <HadithTranslations hadith={hadith} book={book} showNote />
        </section>
      </div>

      <HadithReference hadith={hadith} book={book} />

      <Details details={hadith.details} />

      {hadith.categories && hadith.categories.length > 0 && (
        <section className={styles.section} aria-labelledby="hadith-categories">
          <h2 id="hadith-categories" className={styles.sectionTitle}>
            {t("hadithCategories")}
          </h2>
          <ul className={styles.chips}>
            {hadith.categories.map((item) => (
              <li key={item.id}>
                <Link href={categoryPath(item)} className={styles.chip}>
                  <bdi>{item.title}</bdi>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {hadith.related && hadith.related.length > 0 && (
        <section className={styles.section} aria-labelledby="hadith-related">
          <h2 id="hadith-related" className={styles.sectionTitle}>
            {t("relatedHadiths")}
          </h2>
          <ul className={styles.chips}>
            {hadith.related.map((item) => (
              <li key={item.id}>
                <Link href={`${relatedPath(item)}${keepLang}`} className={styles.chip}>
                  {relatedLabel(item)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Last on every page, whatever sections the hadith has. */}
      <HadithNavigation navigation={hadith.navigation} book={book} keepLang={keepLang} />
    </article>
  );
}
