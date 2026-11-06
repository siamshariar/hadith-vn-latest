import CategoryCard from "./category-card";
import styles from "./category-list.module.scss";

// `compact` (home): the top level only, as cards of three columns; else with their children.
export default function CategoryList({ categories, columns = 1, compact = false }) {
  if (!categories || !categories.length) return null;
  return (
    <ol className={`${styles.list} ${columns === 2 ? styles.twoColumns : ""} ${compact ? styles.compact : ""}`}>
      {categories.map((category, index) => (
        <li key={category.id}>
          <CategoryCard category={category} number={compact ? index + 1 : null} compact={compact} />
        </li>
      ))}
    </ol>
  );
}
