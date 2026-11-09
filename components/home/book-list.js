import BookCard from "./book-card";
import { useLocale } from "../../contexts/LocaleContext";
import styles from "./book-list.module.scss";

// The collections in groups, as on sunnah.com, by the API's book `code`.
// A code not listed here (a collection added later) goes under "other".
const GROUPS = [
  { key: "six", title: "bookGroupSix", codes: ["bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah"] },
  { key: "other", title: "bookGroupOther", codes: ["malik"] },
  { key: "forty", title: "bookGroupForty", codes: ["nawawi", "qudsi", "dehlawi"] },
  { key: "topics", title: "bookGroupTopics", codes: ["hadeethenc"] },
];

export function groupBooks(books) {
  const groups = GROUPS.map((group) => ({ ...group, books: [] }));
  const byKey = Object.fromEntries(groups.map((group) => [group.key, group]));
  (books || []).forEach((book) => {
    const group = groups.find((item) => item.codes.includes(book.code)) || byKey.other;
    group.books.push(book);
  });
  groups.forEach((group) => {
    const order = (book) => {
      const index = group.codes.indexOf(book.code);
      return index === -1 ? group.codes.length : index;
    };
    group.books.sort((a, b) => order(a) - order(b));
  });
  return groups.filter((group) => group.books.length);
}

// The collections as cards (components/home/EntryCard), in the groups' order.
export default function BookList({ books }) {
  if (!books || !books.length) return null;
  return (
    <ul className={styles.list}>
      {books.map((book) => (
        <li key={book.slug}>
          <BookCard book={book} />
        </li>
      ))}
    </ul>
  );
}

// The home page: one grid of cards, the groups' order kept.
export function BookGrid({ books }) {
  return <BookList books={groupBooks(books).flatMap((group) => group.books)} />;
}

// The collections page: each group under its heading. `level`: the headings' level.
export function BookGroups({ books, level = 3 }) {
  const { t } = useLocale();
  const Heading = `h${level}`;
  const groups = groupBooks(books);
  if (!groups.length) return null;
  return (
    <div className={styles.groups}>
      {groups.map((group) => (
        <section key={group.key} className={styles.group} aria-labelledby={`book-group-${group.key}`}>
          <Heading id={`book-group-${group.key}`} className={styles.groupTitle}>
            {t(group.title)}
          </Heading>
          <BookList books={group.books} />
        </section>
      ))}
    </div>
  );
}
