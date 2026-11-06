import Link from "next/link";
import { useLocale } from "../../contexts/LocaleContext";
import { bookPath } from "../../lib/hadith";
import styles from "./book-card.module.scss";

// One collection: name and Arabic name, counts and, with `showTranslation`,
// how much of it can be read in the reader's language (most collections
// only have English).
export default function BookCard({ book, number, showTranslation = false }) {
  const { t, lang, formatNumber, languageName } = useLocale();

  const counts = [t("hadithCount", { count: book.totalHadith })];
  if (book.totalChapter > 1) counts.push(t("chapterCount", { count: book.totalChapter }));

  // How much of it reads in the reader's language, in one line. Own translations and the topic
  // collection's linked ones are not the same thing: a book with only linked ones is not
  // "translated". (Its page gives both figures.)
  const notes = [];
  if (showTranslation && lang !== "ar" && book.totalTranslated != null) {
    const language = languageName(lang);
    if (book.totalTranslated > 0) {
      notes.push({
        key: "own",
        text: t("translationAvailability", { count: formatNumber(book.totalTranslated), language }),
        strong: true,
      });
    } else if (book.totalLinkedTranslated > 0) {
      notes.push({
        key: "linked",
        text: t("bookTopicTranslations", { count: formatNumber(book.totalLinkedTranslated), language }),
      });
    } else {
      notes.push({ key: "none", text: t("noTranslationInBook", { language }) });
    }
  }

  return (
    <Link href={bookPath(book)} className={styles.item}>
      {number != null && <span className={styles.number}>{formatNumber(number)}</span>}{" "}
      <span className={styles.body}>
        <span className={styles.name}>{book.name}</span>{" "}
        <span className={styles.bottom}>{counts.join(" · ")}</span>
        {notes.map((note) => (
          <span key={note.key} className={`${styles.translation} ${note.strong ? styles.hasTranslation : ""}`}>
            {note.text}
          </span>
        ))}
      </span>
      {book.nameArabic && (
        <span className={styles.arabic} dir="rtl" lang="ar">
          {book.nameArabic}
        </span>
      )}
    </Link>
  );
}
