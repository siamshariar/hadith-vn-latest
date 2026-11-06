import Link from "next/link";
import Grades from "../hadith/Grades";
import { ArabicText, HadithTranslations } from "../hadith/HadithText";
import { useLocale } from "../../contexts/LocaleContext";
import { cleanText, hadithPath, namedGrades } from "../../lib/hadith";
import { referenceText } from "../../lib/citation";
import styles from "./banner.module.scss";

// The top of the home page, as the Quran sites': on the web, a band in the site's colours behind
// two cards, the hadith of the day and the way in (search, go to a hadith, the figures); on phones
// and tablets the way in comes first, on the plain page, with no band. The site's heading is for
// screen readers and search engines: the logo and the two cards say what the page is.
export function Hero({ daily, children }) {
  const { t } = useLocale();
  return (
    <section className={styles.banner} aria-labelledby="site-heading">
      <h1 id="site-heading" className="visually_hidden">
        {t("siteHeading")}
      </h1>
      <p className="visually_hidden">{t("siteTagline")}</p>
      <div className={styles.cards}>
        {daily}
        <div className={styles.find}>{children}</div>
      </div>
    </section>
  );
}

// The hadith of the day from /hadith/home (changes at 00:00 UTC).
export default function DailyHadith({ hadith }) {
  const { t } = useLocale();
  if (!hadith) return null;

  const href = hadithPath(hadith);

  return (
    <article className={styles.daily} aria-labelledby="daily-hadith">
      <div className={styles.top}>
        <h2 id="daily-hadith" className={styles.sectionHeading}>
          {t("dailyHadith")}
        </h2>
        <Link href={href} className={styles.citation}>
          {referenceText(hadith, hadith.book, t)}
        </Link>
      </div>

      {hadith.title && (
        <p className={styles.title} dir="auto">
          {cleanText(hadith.title)}
        </p>
      )}

      <div className={styles.text}>
        <ArabicText text={hadith.arabic} clamped />
        <HadithTranslations hadith={hadith} clamped />
      </div>

      <div className={styles.footer}>
        <Grades grades={namedGrades(hadith)} gradeText={hadith.gradeText} />
        <Link href={href} className={styles.more}>
          {t("readMore")} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
