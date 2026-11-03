import Link from "next/link";
import FeedbackIcon from "../icons/Feedback";
import { useLocale } from "../../contexts/LocaleContext";
import {
  inBookText,
  referenceText,
  reportErrorHref,
  shownTranslations,
  translationItemLabel,
  translatorName,
} from "../../lib/citation";
import { hadithPath, isCategoryBook, namedGrades } from "../../lib/hadith";
import styles from "./HadithReference.module.scss";

// Grades exactly as the API gives them: one row per named grader (lib/hadith
// namedGrades), plus the topic collection's own gradeText. Nothing when the
// source gives none (Bukhari, Muslim, the forty-hadith books).
export function GradesTable({ grades, gradeText }) {
  const { t } = useLocale();
  const list = Array.isArray(grades) ? grades.filter((grade) => grade && grade.grade) : [];
  if (!list.length && !gradeText) return null;

  return (
    <div className={styles.grades}>
      {gradeText && (
        <p className={styles.gradeText}>
          <span className={styles.term}>{t("labelColon", { label: t("grades") })}</span> <strong>{gradeText}</strong>
        </p>
      )}
      {list.length > 0 && (
        <table className={styles.gradeTable}>
          <caption className="visually_hidden">{t("grades")}</caption>
          <thead>
            <tr>
              <th scope="col">{t("grader")}</th>
              <th scope="col">{t("grade")}</th>
            </tr>
          </thead>
          <tbody>
            {list.map((grade, index) => (
              <tr key={`${grade.graderName}-${index}`}>
                <td>{grade.graderName}</td>
                <td>
                  <bdi>{grade.grade}</bdi>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// The reference block under the hadith on its page, as sunnah.com has it:
// citation, in-book reference, the translator of each translation shown when
// the source names one (and, for one from the topic collection, its hadith),
// the grades, and "report an error" (an e-mail with the citation and
// permalink filled in). Copy and share are in the icon row at the top.
export default function HadithReference({ hadith, book }) {
  const { t, languageName } = useLocale();
  const translations = shownTranslations(hadith);
  // HadeethEnc has one technical chapter ("All hadiths"): no meaningful in-book reference.
  const inBook = isCategoryBook(book) ? null : inBookText(hadith.inBookReference, t);

  return (
    <section className={styles.reference} aria-label={t("refLabel")}>
      <dl className={styles.rows}>
        <div className={styles.row}>
          <dt className={styles.term}>{t("refLabel")}</dt>
          <dd>{referenceText(hadith, book, t)}</dd>
        </div>
        {inBook && (
          <div className={styles.row}>
            <dt className={styles.term}>{t("inBookReference")}</dt>
            <dd>{inBook}</dd>
          </div>
        )}
        {translations.map((item) => {
          const translator = translatorName(item.entry.author, item.entry.edition);
          const linkedId = item.linked ? (item.entry.linked ? item.entry.linked.hadithId : item.entry.hadithId) : null;
          if (!translator && !linkedId) return null;
          return (
            <div className={styles.row} key={`${item.code}-${item.linked ? "linked" : item.fallback ? "fallback" : "own"}`}>
              <dt className={styles.term}>{translationItemLabel(item, t, languageName)}</dt>
              <dd className={styles.credit}>
                {translator && <bdi>{translator}</bdi>}
                {linkedId && (
                  <Link href={hadithPath({ id: linkedId })}>
                    {t("linkedTranslationLink")} <span aria-hidden="true">→</span>
                  </Link>
                )}
              </dd>
            </div>
          );
        })}
      </dl>

      <GradesTable grades={namedGrades(hadith, book)} gradeText={hadith.gradeText} />

      <p className={styles.report}>
        <a href={reportErrorHref(hadith, book, t)} className={styles.reportLink}>
          <FeedbackIcon />
          {t("reportError")}
        </a>
      </p>
    </section>
  );
}
