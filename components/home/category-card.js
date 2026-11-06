import Link from "next/link";
import { useLocale } from "../../contexts/LocaleContext";
import { categoryPath } from "../../lib/hadith";
import styles from "./category-card.module.scss";

// A top-level category with its children (from /hadith/home or the flat
// list). Counts show how many hadiths are translated into the reader's
// language next to the total. The lists leave out the categories with none
// (lib/api readableCategories); a child with none that is still given is muted.
// `compact` (home): the number and the category alone, the same card as a book's.
export default function CategoryCard({ category, number = null, compact = false }) {
  const { t, lang, formatNumber, languageName } = useLocale();
  const children = compact ? [] : category.children || [];
  const showTranslated = lang !== "ar" && category.totalTranslated != null;
  const language = languageName(lang);

  return (
    <div className={`${styles.item} ${compact ? styles.compact : ""}`}>
      <Link href={categoryPath(category)} className={styles.head}>
        {number != null && <span className={styles.number}>{formatNumber(number)}</span>}{" "}
        <span className={styles.left}>
          <bdi className={styles.name}>{category.title}</bdi>
          <span className={styles.count}>
            {t("hadithCount", { count: category.totalHadith })}
            {showTranslated && (
              <>
                {" · "}
                <span className={category.totalTranslated > 0 ? styles.translated : ""}>
                  {t("countTranslated", { count: formatNumber(category.totalTranslated), language })}
                </span>
              </>
            )}
          </span>
        </span>
        {category.titleArabic && (
          <span className={styles.right} dir="rtl" lang="ar">
            {category.titleArabic}
          </span>
        )}
      </Link>

      {children.length > 0 && (
        <ul className={styles.children} aria-label={t("labelValue", { label: t("subcategories"), value: category.title })}>
          {children.map((child) => {
            const childTranslated = showTranslated && child.totalTranslated != null;
            const muted = childTranslated && child.totalTranslated === 0;
            const countLabel = childTranslated
              ? t("countTranslatedOfTotal", {
                  count: formatNumber(child.totalTranslated),
                  total: formatNumber(child.totalHadith),
                  language,
                })
              : t("hadithCount", { count: child.totalHadith });
            return (
              <li key={child.id}>
                <Link href={categoryPath(child)} className={`${styles.child} ${muted ? styles.muted : ""}`} title={countLabel}>
                  <bdi>{child.title}</bdi>
                  {/* "12/40" on screen; in words for screen readers (a label on a span is not read) */}
                  <span className={styles.childCount} aria-hidden="true">
                    {childTranslated
                      ? `${formatNumber(child.totalTranslated)}/${formatNumber(child.totalHadith)}`
                      : formatNumber(child.totalHadith)}
                  </span>
                  <span className="visually_hidden">, {countLabel}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
