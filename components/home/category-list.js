import Link from "next/link";
import { useLocale } from "../../contexts/LocaleContext";
import { categoryPath } from "../../lib/hadith";
import CategoryCard from "./category-card";
import styles from "./category-list.module.scss";

// The categories as cards. `grouped` (the categories page): each top-level category is a
// heading over its subcategories' cards; else the top level alone (the home page).
export default function CategoryList({ categories, grouped = false }) {
  const { t } = useLocale();
  if (!categories || !categories.length) return null;
  if (!grouped) {
    return (
      <ul className={styles.grid}>
        {categories.map((category) => (
          <li key={category.id}>
            <CategoryCard category={category} />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className={styles.groups}>
      {categories.map((category) => {
        const children = category.children || [];
        return (
          <section key={category.id} className={styles.group} aria-labelledby={`category-${category.id}`}>
            <h2 id={`category-${category.id}`} className={styles.groupTitle}>
              <Link href={categoryPath(category)} prefetch={false}>
                <bdi>{category.title}</bdi>
              </Link>
              <span className={styles.groupCount}>{t("hadithCount", { count: category.totalHadith })}</span>
            </h2>
            {children.length > 0 ? (
              <ul className={styles.grid}>
                {children.map((child) => (
                  <li key={child.id}>
                    <CategoryCard category={child} />
                  </li>
                ))}
              </ul>
            ) : (
              <ul className={styles.grid}>
                <li>
                  <CategoryCard category={category} />
                </li>
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
