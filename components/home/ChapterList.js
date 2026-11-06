import Link from "next/link";
import { useLocale } from "../../contexts/LocaleContext";
import { UNASSIGNED_CHAPTER, chapterPath, chapterRange } from "../../lib/hadith";
import styles from "./collection.module.scss";

// A collection's chapters: the number, the name, then how many hadiths and their citable numbers
// ("7 hadiths · 1–7"). The spaces between the cells keep the link's text readable, not "1Revelation".
export default function ChapterList({ book, chapters }) {
  const { t, formatNumber } = useLocale();
  // The source has no Arabic chapter names yet; the column appears with them.
  const withArabic = chapters.some((chapter) => chapter.nameArabic);

  return (
    <ol className={`${styles.chapterList} ${withArabic ? styles.withArabic : ""}`}>
      {chapters.map((chapter) => {
        const unassigned = chapter.chapterNo === UNASSIGNED_CHAPTER;
        const range = chapterRange(chapter, book);
        return (
          <li key={chapter.chapterNo}>
            <Link href={chapterPath(book.slug, chapter.chapterNo)} className={styles.chapterRow}>
              <span className={styles.chapterNo} aria-hidden={unassigned ? "true" : undefined}>
                {unassigned ? "–" : formatNumber(chapter.chapterNo)}
              </span>{" "}
              <span className={styles.chapterName}>{unassigned ? t("unassignedChapter") : chapter.name}</span>{" "}
              {withArabic && (
                <span className={styles.chapterArabic} dir="rtl" lang="ar">
                  {chapter.nameArabic || ""}
                </span>
              )}{" "}
              <span className={styles.chapterRange}>
                {t("hadithCount", { count: chapter.totalHadith })}
                {range ? ` · ${range}` : ""}
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
