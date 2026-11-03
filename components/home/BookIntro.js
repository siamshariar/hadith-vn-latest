import { useLocale } from "../../contexts/LocaleContext";
import styles from "./collection.module.scss";

// Language of an edition as the API names it: "বাংলা (Bengali)".
function editionLanguage(edition, nameOf) {
  const known = nameOf(edition.languageCode);
  if (known && known !== String(edition.languageCode).toUpperCase()) return known;
  const native = edition.languageNativeName || edition.languageName || edition.languageCode;
  return edition.languageName && edition.languageName !== native ? `${native} (${edition.languageName})` : native;
}

// The top of a collection page: name, Arabic name, the figures the API
// gives (hadiths, chapters, how many are readable in the reader's language)
// and its translations from /hadith/editions, by language, each with its
// translator when the source names one (pages/books/[bookId]). Nothing else:
// no biographies or dates the sources don't state.
export default function BookIntro({ book, chapterCount, counts, editions = [] }) {
  const { t, lang, formatNumber, languageName } = useLocale();
  const language = languageName(lang);
  const own = (counts && counts.own) || 0;
  const linked = (counts && counts.linked) || 0;
  const showReadable = lang !== "ar" && counts != null;

  // The reader's language first, then English, then the rest by name.
  const rank = (edition) => (edition.languageCode === lang ? 0 : edition.languageCode === "en" ? 1 : 2);
  const sorted = [...editions].sort(
    (a, b) => rank(a) - rank(b) || String(a.languageName).localeCompare(String(b.languageName))
  );
  const hasOwnEdition = editions.some((edition) => edition.languageCode === lang);

  return (
    <header className={styles.intro}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>{book.name}</h1>
        {book.nameArabic && (
          <p className={styles.titleArabic} dir="rtl" lang="ar">
            {book.nameArabic}
          </p>
        )}
      </div>

      <dl className={styles.facts}>
        <div className={styles.fact}>
          <dt>{t("totalHadiths")}</dt>
          <dd className={styles.factValue}>{formatNumber(book.totalHadith)}</dd>
        </div>
        {chapterCount > 1 && (
          <div className={styles.fact}>
            <dt>{t("totalChapters")}</dt>
            <dd className={styles.factValue}>{formatNumber(chapterCount)}</dd>
          </div>
        )}
        {showReadable && (
          <div className={`${styles.fact} ${own + linked > 0 ? styles.factReadable : ""}`}>
            <dt>{t("readableIn", { language })}</dt>
            <dd className={styles.factValue}>{formatNumber(own + linked)}</dd>
            {linked > 0 && (
              <dd className={styles.factNote}>
                {own > 0
                  ? t("readableOwnAndTopic", { own: formatNumber(own), linked: formatNumber(linked) })
                  : t("readableTopicOnly", { linked: formatNumber(linked) })}
              </dd>
            )}
          </div>
        )}
      </dl>

      {sorted.length > 0 && (
        <details className={styles.editions}>
          <summary>{t("translationLanguages", { count: formatNumber(sorted.length) })}</summary>
          {lang !== "ar" && !hasOwnEdition && (
            <p className={styles.editionsNote}>{t("noEditionInLanguage", { language })}</p>
          )}
          <ul className={styles.editionList}>
            {sorted.map((edition) => (
              <li
                key={edition.languageCode}
                className={`${styles.edition} ${edition.languageCode === lang ? styles.editionCurrent : ""}`}
              >
                <span className={styles.editionLanguage}>
                  {editionLanguage(edition, languageName)}
                  {edition.languageCode === lang && (
                    <span className={styles.editionTag}> · {t("selectedLanguage")}</span>
                  )}
                </span>
                {edition.translator && (
                  <span className={styles.editionTranslator}>
                    <span className="visually_hidden">{t("translator")}: </span>
                    <bdi>{edition.translator}</bdi>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </header>
  );
}
