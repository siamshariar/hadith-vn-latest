import { useContext } from "react";
import Link from "next/link";
import { PinContext } from "../../contexts/PinContext";
import { useLocale } from "../../contexts/LocaleContext";
import useNames from "../../hooks/useNames";
import { isCurrentStoredRef, storedRefHref, storedRefLabel, storedRefSource } from "../../lib/hadith";
import AutoStoriesIcon from "../icons/AutoStories";
import styles from "./ContinueReading.module.scss";

// "Continue reading": the last hadith read in this browser (PinContext,
// localStorage). The context fills it after mounting, so the card never
// shows in the server HTML and appears only when there is an entry. The
// book is named in the reader's language (lib/names).
export default function ContinueReading() {
  const { t, lang } = useLocale();
  const pins = useContext(PinContext);
  const names = useNames(lang);
  const entry = pins && pins.lastRead ? pins.lastRead.find(isCurrentStoredRef) : null;
  if (!entry) return null;

  const label = storedRefLabel(entry, names, t("topicCollection"));
  const source = storedRefSource(entry, names, t("topicCollection"));

  return (
    <Link href={storedRefHref(entry)} className={styles.card}>
      <span className={styles.icon} aria-hidden="true">
        <AutoStoriesIcon />
      </span>
      <span className={styles.body}>
        <span className={styles.label}>{t("continueReading")}</span>
        <span className={styles.title} dir="auto">
          {label}
        </span>
        {source && source !== label && <span className={styles.source}>{source}</span>}
      </span>
      <span className={styles.arrow} aria-hidden="true">
        →
      </span>
    </Link>
  );
}
