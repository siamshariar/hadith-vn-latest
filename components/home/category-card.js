import { useLocale } from "../../contexts/LocaleContext";
import { categoryHadithsPath, categoryPath } from "../../lib/hadith";
import ListIcon from "../icons/FormatListBulleted";
import EntryCard from "./EntryCard";

// One category: its name and how many hadiths it has (components/home/EntryCard). A category
// with subcategories opens its page (them); one without, its hadiths.
export default function CategoryCard({ category }) {
  const { t } = useLocale();
  return (
    <EntryCard
      href={category.totalChildren > 0 ? categoryPath(category) : categoryHadithsPath(category)}
      icon={<ListIcon />}
      title={<bdi>{category.title}</bdi>}
      note={t("hadithCount", { count: category.totalHadith })}
    />
  );
}
