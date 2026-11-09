import Link from "next/link";
import { useLocale } from "../../contexts/LocaleContext";
import { cleanText, hadithPath } from "../../lib/hadith";
import { referenceText } from "../../lib/citation";
import { shownTranslation } from "../hadith/HadithText";
import styles from "./banner.module.scss";

// The top of the home page, as the Quran sites' (quran-apps components/layout2/home/banner): on
// the web a band in the site's colours with three equal cards over its lower edge, the hadith of
// the day and the two ways into the library (collections, categories), each a few lines and a
// link; the library follows at once. Phones and tablets have no band, as on the Quran sites:
// the hadith of the day alone, as a card, the library under it. The site's heading is for screen
// readers and search engines: the logo and the cards say what the page is.
// `lead`: "categories" when the categories come first on the page (pages/index.js).
export function Hero({ daily, lead = "books" }) {
  const { t } = useLocale();
  const ways = [
    { key: "books", title: t("books"), text: t("booksDescription"), href: "/books" },
    { key: "categories", title: t("categories"), text: t("categoriesDescription"), href: "/categories" },
  ];
  if (lead === "categories") ways.reverse();

  return (
    <section className={styles.banner} aria-labelledby="site-heading">
      <h1 id="site-heading" className="visually_hidden">
        {t("siteHeading")}
      </h1>
      <p className="visually_hidden">{t("siteTagline")}</p>
      <div className={styles.cards}>
        {daily && <DailyHadith hadith={daily} />}
        {ways.map((way) => (
          <div key={way.key} className={`${styles.card} ${styles.way}`}>
            <h2 className={styles.cardTitle}>{way.title}</h2>
            <p className={styles.cardText}>{way.text}</p>
            <Link href={way.href} className={styles.more}>
              {t("viewAll")} <span aria-hidden="true">→</span>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

// The hadith of the day from /hadith/home (changes at 00:00 UTC): its citation and its first
// lines (the title, else the translation), and the way to read it in full.
export default function DailyHadith({ hadith }) {
  const { t } = useLocale();
  if (!hadith) return null;
  const href = hadithPath(hadith);
  const { own, linked } = shownTranslation(hadith);
  const shown = own || linked;
  const lead = hadith.title ? cleanText(hadith.title) : shown ? cleanText(shown.text) : "";

  return (
    <article className={`${styles.card} ${styles.daily}`} aria-labelledby="daily-hadith">
      <h2 id="daily-hadith" className={styles.cardTitle}>
        {t("dailyHadith")}
      </h2>
      <p className={styles.citation}>{referenceText(hadith, hadith.book, t)}</p>
      {lead && (
        <p className={styles.cardText} dir="auto">
          {lead}
        </p>
      )}
      <Link href={href} className={styles.more}>
        {t("readMore")} <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}
