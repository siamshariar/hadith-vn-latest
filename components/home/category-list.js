import CategoryCard from "./category-card";
import styles from "./category-list.module.scss";

export default function CategoryList({ categories, columns = 1 }) {
  if (!categories || !categories.length) return null;
  return (
    <ol className={`${styles.list} ${columns === 2 ? styles.twoColumns : ""}`}>
      {categories.map((category) => (
        <li key={category.id}>
          <CategoryCard category={category} />
        </li>
      ))}
    </ol>
  );
}
