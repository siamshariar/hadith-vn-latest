import Link from "next/link";
import { useLocale } from "../../contexts/LocaleContext";
import { UNASSIGNED_CHAPTER, chapterPath, chapterRange } from "../../lib/hadith";
import styles from "./collection.module.scss";

// A collection's books/chapters, sunnah.com style: number | name | the
// citable hadith numbers, with the hadith count. One dense line per chapter
// on desktop, two comfortable lines on phones. The spaces between the cells
// keep the link's text readable ("1 Revelation 1–7 7 hadith"), not "1Revelation".
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
                {unassigned ? "–" : chapter.chapterNo}
              </span>{" "}
              <span className={styles.chapterName}>{unassigned ? t("unassignedChapter") : chapter.name}</span>{" "}
              {withArabic && (
                <span className={styles.chapterArabic} dir="rtl" lang="ar">
                  {chapter.nameArabic || ""}
                </span>
              )}{" "}
              <span className={styles.chapterRange}>{range || ""}</span>{" "}
              <span className={styles.chapterCount}>
                {t("hadithCount", { count: chapter.totalHadith })}
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
