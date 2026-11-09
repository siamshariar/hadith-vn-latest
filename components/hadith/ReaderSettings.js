import { useContext } from "react";
import Link from "next/link";
import Drawer from "@mui/material/Drawer";
import useMediaQuery from "@mui/material/useMediaQuery";
import { SettingsContext } from "../../contexts/SettingsContext";
import { useLocale } from "../../contexts/LocaleContext";
import CloseIcon from "../icons/Close";
import MinusIcon from "../icons/Minus";
import PlusIcon from "../icons/Plus";
import styles from "./ReaderSettings.module.scss";

// Limits of SettingsContext changeFontSize*.
const ARABIC = { min: 16, max: 60, step: 2 };
const TRANSLATION = { min: 12, max: 40, step: 1 };

function SizeStepper({ id, label, value, limits, onChange, decreaseLabel, increaseLabel }) {
  return (
    <div className={styles.row}>
      <span className={styles.label} id={id}>
        {label}
      </span>
      <div className={styles.stepper} role="group" aria-labelledby={id}>
        <button
          type="button"
          className={styles.stepButton}
          onClick={() => onChange(Math.max(limits.min, value - limits.step))}
          disabled={value <= limits.min}
          aria-label={decreaseLabel}
          title={decreaseLabel}
        >
          <MinusIcon />
        </button>
        <output className={styles.stepValue} aria-live="polite">
          {value}
        </output>
        <button
          type="button"
          className={styles.stepButton}
          onClick={() => onChange(Math.min(limits.max, value + limits.step))}
          disabled={value >= limits.max}
          aria-label={increaseLabel}
          title={increaseLabel}
        >
          <PlusIcon />
        </button>
      </div>
    </div>
  );
}

// The reading settings, opened from the navigation's gear and the phone header: a bottom sheet
// on phones, a side panel on wider screens, so the text stays in view while it changes. Saved
// with the other settings (SettingsContext, localStorage); the language and the faces are on
// the settings page it links to.
export default function ReaderSettings({ open, onClose }) {
  const { t } = useLocale();
  const wide = useMediaQuery("(min-width:600px)", { noSsr: true });
  const {
    fontSizeArabic,
    changeFontSizeArabic,
    fontSizeTranslation,
    changeFontSizeTranslation,
    showArabic,
    changeShowArabic,
    resetReader,
    theme,
    changeTheme,
  } = useContext(SettingsContext);

  return (
    <Drawer
      anchor={wide ? "right" : "bottom"}
      open={open}
      onClose={onClose}
      classes={{ paper: `${styles.paper} ${wide ? styles.side : styles.sheet}` }}
      slotProps={{ paper: { role: "dialog", "aria-modal": true, "aria-labelledby": "reader-settings-title" } }}
    >
      <div className={styles.head}>
        <h2 id="reader-settings-title" className={styles.title}>
          {t("readerSettings")}
        </h2>
        <button type="button" className={styles.close} onClick={onClose} aria-label={t("close")} title={t("close")}>
          <CloseIcon />
        </button>
      </div>

      <div className={styles.body}>
        <SizeStepper
          id="reader-size-arabic"
          label={t("arabicFontSize")}
          value={fontSizeArabic}
          limits={ARABIC}
          onChange={changeFontSizeArabic}
          decreaseLabel={t("decreaseArabicSize")}
          increaseLabel={t("increaseArabicSize")}
        />
        <SizeStepper
          id="reader-size-translation"
          label={t("translationFontSize")}
          value={fontSizeTranslation}
          limits={TRANSLATION}
          onChange={changeFontSizeTranslation}
          decreaseLabel={t("decreaseTranslationSize")}
          increaseLabel={t("increaseTranslationSize")}
        />

        <label className={`${styles.row} ${styles.switchRow}`}>
          <span className={styles.label}>{t("showArabic")}</span>
          <input
            type="checkbox"
            role="switch"
            className={styles.switch}
            checked={showArabic}
            onChange={(event) => changeShowArabic(event.target.checked)}
          />
        </label>

        <fieldset className={styles.fieldset}>
          <legend className={styles.label}>{t("theme")}</legend>
          <div className={styles.segmented}>
            {[
              ["light", t("themeLight")],
              ["dark", t("themeDark")],
            ].map(([value, label]) => (
              <label key={value} className={styles.segment}>
                <input
                  type="radio"
                  name="reader-theme"
                  value={value}
                  checked={theme === value}
                  onChange={() => changeTheme(value)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className={styles.actions}>
          <button type="button" className={styles.reset} onClick={resetReader}>
            {t("resetReader")}
          </button>
          <Link href="/settings" className={styles.allSettings} onClick={onClose}>
            {t("settings")} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </Drawer>
  );
}
