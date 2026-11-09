import Link from "next/link";
import styles from "./EntryCard.module.scss";

// One way in, as one card: the "Continue reading" card's form (components/home/ContinueReading)
// for every card of the home page and the lists of collections and categories. An icon for
// what it opens, its name, one line under it, and an arrow. `label`: a small line above the
// name ("Continue reading").
export default function EntryCard({ href, icon, title, note, label, titleDir }) {
  return (
    <Link href={href} className={styles.card} prefetch={false}>
      <span className={styles.icon} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.body}>
        {label && <span className={styles.label}>{label}</span>}
        <span className={styles.title} dir={titleDir}>
          {title}
        </span>
        {note && <span className={styles.note}>{note}</span>}
      </span>
      <span className={styles.arrow} aria-hidden="true">
        →
      </span>
    </Link>
  );
}
