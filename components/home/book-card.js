import { useLocale } from "../../contexts/LocaleContext";
import { bookPath } from "../../lib/hadith";
import MenuBookIcon from "../icons/MenuBook";
import EntryCard from "./EntryCard";

// One collection: its name and how many hadiths it has (components/home/EntryCard).
export default function BookCard({ book }) {
  const { t } = useLocale();
  return (
    <EntryCard
      href={bookPath(book)}
      icon={<MenuBookIcon />}
      title={book.name}
      note={t("hadithCount", { count: book.totalHadith })}
    />
  );
}
