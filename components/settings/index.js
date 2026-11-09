"use client";

import { fonts, fontStacks } from "../../lib/settings";
import { useEffect, useRef, useState, useContext } from "react";
import { SettingsContext } from "../../contexts/SettingsContext";
import { useLocale } from "../../contexts/LocaleContext";
import Brightness7Icon from "../icons/Brightness7";
import Brightness4Icon from "../icons/Brightness4";
import { ARABIC_SIZE, TRANSLATION_SIZE, FontChoices, Segmented, SizeStepper, SwitchRow } from "./controls";
import styles from "./index.module.scss";

// The settings (the header's settings dialog and the /settings page): three sections, each
// with its title (text size, faces, appearance), then the note on where they are kept and
// Reset. Everything applies at once and is saved in this browser (SettingsContext).
// The face samples are the word "hadith" in Arabic, and each translation face's own name.
// `headingLevel`: the sections' headings, 3 under the dialog's title, 2 under the page's.
const ARABIC_SAMPLE = "الحديث";

export default function SettingsContent({ headingLevel = 3 }) {
  const { t } = useLocale();
  const Heading = `h${headingLevel}`;
  const {
    fontSizeArabic,
    changeFontSizeArabic,
    fontSizeTranslation,
    changeFontSizeTranslation,
    fontFamilyArabic,
    changeFontFamilyArabic,
    fontFamilyTranslation,
    changeFontFamilyTranslation,
    showArabic,
    changeShowArabic,
    theme,
    changeTheme,
  } = useContext(SettingsContext);

  return (
    <div className={styles.wrapper}>
      <section className={styles.section} aria-labelledby="settings-size">
        <Heading id="settings-size" className={styles.title}>
          {t("fontSize")}
        </Heading>
        <SizeStepper
          id="settings-size-arabic"
          label={t("arabicLabel")}
          value={fontSizeArabic}
          limits={ARABIC_SIZE}
          onChange={changeFontSizeArabic}
          decreaseLabel={t("decreaseArabicSize")}
          increaseLabel={t("increaseArabicSize")}
        />
        <SizeStepper
          id="settings-size-translation"
          label={t("translationLabel")}
          value={fontSizeTranslation}
          limits={TRANSLATION_SIZE}
          onChange={changeFontSizeTranslation}
          decreaseLabel={t("decreaseTranslationSize")}
          increaseLabel={t("increaseTranslationSize")}
        />
      </section>

      <section className={styles.section} aria-labelledby="settings-font">
        <Heading id="settings-font" className={styles.title}>
          {t("fontFamily")}
        </Heading>
        <div className={styles.stack}>
          <FontChoices
            name="settings-font-arabic"
            legend={t("arabicLabel")}
            fonts={fonts.arabic}
            stacks={fontStacks}
            value={fontFamilyArabic}
            onChange={changeFontFamilyArabic}
            sample={ARABIC_SAMPLE}
            rtl
          />
          <FontChoices
            name="settings-font-translation"
            legend={t("translationLabel")}
            fonts={fonts.translation}
            stacks={fontStacks}
            value={fontFamilyTranslation}
            onChange={changeFontFamilyTranslation}
          />
        </div>
      </section>

      <section className={styles.section} aria-labelledby="settings-theme">
        <Heading id="settings-theme" className={styles.title}>
          {t("theme")}
        </Heading>
        <div className={styles.stack}>
          <Segmented
            name="settings-theme"
            legend={t("theme")}
            hideLegend
            value={theme}
            onChange={changeTheme}
            options={[
              { value: "light", label: t("themeLight"), icon: <Brightness7Icon /> },
              { value: "dark", label: t("themeDark"), icon: <Brightness4Icon /> },
            ]}
          />
        </div>
        <SwitchRow label={t("showArabic")} checked={showArabic} onChange={changeShowArabic} />
      </section>

      <div className={styles.foot}>
        <p className={styles.note}>
          <span>{t("labelColon", { label: t("settingsNoteLabel") })} </span>
          {t("settingsNote")}
        </p>
        <Reset />
      </div>
    </div>
  );
}

// Reset, then ten seconds to take it back. Reset stays put and does nothing while the
// offer lasts (a double click can't undo itself); the status line says what happened,
// with Undo beside it. Focus never drops to the page when Undo goes.
const UNDO_MS = 10000;

const Reset = () => {
  const { t } = useLocale();
  const { resetSettings, restoreSettings } = useContext(SettingsContext);
  const [previous, setPrevious] = useState(null);
  const resetButton = useRef(null);
  const undoButton = useRef(null);

  useEffect(() => {
    if (!previous) return undefined;
    const timer = window.setTimeout(() => {
      if (document.activeElement === undoButton.current && resetButton.current) resetButton.current.focus();
      setPrevious(null);
    }, UNDO_MS);
    return () => window.clearTimeout(timer);
  }, [previous]);

  const reset = () => {
    if (!previous) setPrevious(resetSettings());
  };
  const undo = () => {
    restoreSettings(previous);
    if (resetButton.current) resetButton.current.focus();
    setPrevious(null);
  };

  return (
    <div className={styles.reset}>
      <button ref={resetButton} type="button" className={styles.btn_reset} onClick={reset}>
        {t("resetSettings")}
      </button>
      <span className={styles.reset_status} role="status">
        {previous && (
          <>
            {t("settingsResetDone")}{" "}
            <button ref={undoButton} type="button" className={styles.btn_undo} onClick={undo}>
              {t("undo")}
            </button>
          </>
        )}
      </span>
    </div>
  );
};
