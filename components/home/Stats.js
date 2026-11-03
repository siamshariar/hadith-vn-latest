import Container from "../core/container";
import { useLocale } from "../../contexts/LocaleContext";
import styles from "./Stats.module.scss";

// Figures come straight from /hadith/home `totals`; nothing is hardcoded.
// "Readable" = own translations + the topic collection's linked translations
// in the reader's language (Arabic is the original, so it has no such figure).
export default function Stats({ totals }) {
  const { t, lang, formatNumber, languageName } = useLocale();
  if (!totals) return null;

  const own = totals.translated || 0;
  const linked = totals.linkedTranslated || 0;
  const items = [];

  if (lang !== "ar" && totals.translated != null) {
    items.push({
      key: "readable",
      value: own + linked,
      label: t("readableIn", { language: languageName(lang) }),
      note: linked > 0 ? t("readableOwnAndTopic", { own: formatNumber(own), linked: formatNumber(linked) }) : null,
      wide: true,
    });
  }
  [
    { key: "hadith", label: t("totalHadiths") },
    { key: "book", label: t("totalBooks") },
    { key: "category", label: t("totalCategories") },
    { key: "language", label: t("totalLanguages") },
  ].forEach((item) => {
    if (totals[item.key] != null) items.push({ ...item, value: totals[item.key] });
  });

  if (!items.length) return null;

  return (
    <Container>
      <dl className={styles.stats}>
        {items.map((item) => (
          <div key={item.key} className={`${styles.item} ${item.wide ? styles.wide : ""}`}>
            <dt className={styles.label}>{item.label}</dt>
            <dd className={styles.number}>{formatNumber(item.value)}</dd>
            {item.note && <dd className={styles.note}>{item.note}</dd>}
          </div>
        ))}
      </dl>
    </Container>
  );
}
