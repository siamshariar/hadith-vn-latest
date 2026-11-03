import { useLocale } from "../../contexts/LocaleContext";
import styles from "./hadith.module.scss";

// Grades exactly as the API gives them: one entry per grader the source names
// (lib/hadith namedGrades), plus the topic collection's own `gradeText`.
// Nothing is inferred: Bukhari, Muslim and the forty-hadith books have no
// per-hadith grades, so nothing is rendered.
export default function Grades({ grades, gradeText, variant = "compact" }) {
  const { t } = useLocale();
  const list = Array.isArray(grades) ? grades.filter((grade) => grade && grade.grade) : [];
  if (!list.length && !gradeText) return null;

  if (variant === "full") {
    return (
      <section className={styles.gradesFull} aria-labelledby="hadith-grades">
        <h2 id="hadith-grades" className={styles.sectionTitle}>
          {t("grades")}
        </h2>
        {gradeText && <p className={styles.gradeText}>{gradeText}</p>}
        {list.length > 0 && (
          <ul className={styles.graderList}>
            {list.map((grade, index) => (
              <li key={`${grade.graderName}-${index}`}>
                <span className={styles.graderName}>{grade.graderName}</span>
                <bdi className={styles.graderGrade}>{grade.grade}</bdi>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }

  return (
    <ul className={styles.gradeChips} aria-label={t("grades")}>
      {gradeText && <li className={`${styles.chip} ${styles.chipPrimary}`}>{gradeText}</li>}
      {list.map((grade, index) => (
        <li key={`${grade.graderName}-${index}`} className={styles.chip}>
          <span className={styles.chipGrader}>{grade.graderName}:</span> <bdi>{grade.grade}</bdi>
        </li>
      ))}
    </ul>
  );
}

// The first grade the source gives, with its grader ("Sahih · Al-Albani"),
// or the topic collection's gradeText; "+2" when more graders follow (detail page).
export function GradeBadge({ grades, gradeText }) {
  const { t } = useLocale();
  const list = Array.isArray(grades) ? grades.filter((grade) => grade && grade.grade) : [];
  const first = list[0];
  if (!gradeText && !first) return null;
  const more = gradeText ? 0 : list.length - 1;
  const all = list.map((grade) => `${grade.graderName}: ${grade.grade}`).join("; ");

  return (
    <span className={styles.gradeBadge} title={all ? t("labelValue", { label: t("grades"), value: all }) : t("grades")}>
      <span className="visually_hidden">{t("labelColon", { label: t("grades") })} </span>
      <bdi className={styles.gradeBadgeGrade}>{gradeText || first.grade}</bdi>
      {first && first.graderName && <span className={styles.gradeBadgeGrader}>· {first.graderName}</span>}
      {more > 0 && (
        <span className={styles.gradeBadgeMore}>
          <span aria-hidden="true">+{more}</span>
          <span className="visually_hidden"> ({t("moreGrades", { count: more })})</span>
        </span>
      )}
    </span>
  );
}
