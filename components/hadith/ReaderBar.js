import { useState } from "react";
import { useLocale } from "../../contexts/LocaleContext";
import SettingsIcon from "../icons/SettingsOutlined";
import ReaderSettings from "./ReaderSettings";
import TranslationPicker from "./TranslationPicker";
import styles from "./ReaderBar.module.scss";

// The slim bar of the chapter and hadith pages, as quran.com has above a
// surah: where the reader is (`children`: book › chapter or a chapter
// switcher), an optional `trailing` item (the citation), the translations
// chip (`picker`: { translations, book, hidden }) and the gear of the
// reading settings. It sticks below the site header; --header-offset is 0
// while the header is hidden on scroll.
export default function ReaderBar({ children, trailing, picker }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className={styles.bar} data-reader-bar="">
        <div className={styles.where}>{children}</div>
        {trailing}
        {picker && (
          <span className={`${styles.picker} ${picker.hidden ? styles.pickerHidden : ""}`}>
            <TranslationPicker translations={picker.translations} book={picker.book} variant="bar" />
          </span>
        )}
        <button
          type="button"
          className={styles.gear}
          onClick={() => setOpen(true)}
          aria-label={t("readerSettings")}
          title={t("readerSettings")}
          aria-haspopup="dialog"
          aria-expanded={open ? "true" : "false"}
        >
          <SettingsIcon />
        </button>
      </div>
      <ReaderSettings open={open} onClose={() => setOpen(false)} />
    </>
  );
}

// Classes for what goes inside the bar.
export const barStyles = styles;
