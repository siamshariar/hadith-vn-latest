import BookCard from "./book-card";
import { useLocale } from "../../contexts/LocaleContext";
import styles from "./book-list.module.scss";

// The collections in groups, as on sunnah.com, by the API's book `code`.
// A code not listed here (a collection added later) goes under "other".
const GROUPS = [
  {
    key: "six",
    title: "bookGroupSix",
    arabic: "الكتب الستة",
    codes: ["bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah"],
  },
  { key: "other", title: "bookGroupOther", arabic: "المصادر الأصلية الأخرى", codes: ["malik"] },
  { key: "forty", title: "bookGroupForty", arabic: "الأربعينات", codes: ["nawawi", "qudsi", "dehlawi"] },
  { key: "topics", title: "bookGroupTopics", arabic: null, codes: ["hadeethenc"] },
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

// `first`: the number of the first card (the numbers run on from group to group).
export default function BookList({ books, showTranslation = false, first = null }) {
  if (!books || !books.length) return null;
  return (
    <ul className={styles.list}>
      {books.map((book, index) => (
        <li key={book.slug}>
          <BookCard book={book} number={first == null ? null : first + index} showTranslation={showTranslation} />
        </li>
      ))}
    </ul>
  );
}

// `level`: heading level of the group titles (3 under the home section's h2).
export function BookGroups({ books, showTranslation = false, level = 3 }) {
  const { t } = useLocale();
  const Heading = `h${level}`;
  const groups = groupBooks(books);
  if (!groups.length) return null;
  let shown = 0;

  return (
    <div className={styles.groups}>
      {groups.map((group) => {
        const first = shown + 1;
        shown += group.books.length;
        return (
        <section key={group.key} className={styles.group} aria-labelledby={`book-group-${group.key}`}>
          <Heading id={`book-group-${group.key}`} className={styles.groupTitle}>
            <span>{t(group.title)}</span>
            {group.arabic && (
              <span className={styles.groupArabic} dir="rtl" lang="ar">
                {group.arabic}
              </span>
            )}
          </Heading>
          <BookList books={group.books} showTranslation={showTranslation} first={first} />
        </section>
        );
      })}
    </div>
  );
}
