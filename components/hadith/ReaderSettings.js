import { useContext } from "react";
import Link from "next/link";
import Drawer from "@mui/material/Drawer";
import useMediaQuery from "@mui/material/useMediaQuery";
import { SettingsContext } from "../../contexts/SettingsContext";
import { useLocale } from "../../contexts/LocaleContext";
import CloseIcon from "../icons/Close";
import Brightness7Icon from "../icons/Brightness7";
import Brightness4Icon from "../icons/Brightness4";
import { ARABIC_SIZE, TRANSLATION_SIZE, Segmented, SizeStepper, SwitchRow } from "../settings/controls";
import styles from "./ReaderSettings.module.scss";

// The reading settings, opened from the navigation's gear and the phone header: a bottom sheet
// on phones, a side panel on wider screens, so the text stays in view while it changes. Saved
// with the other settings (SettingsContext, localStorage); the faces are on the settings page
// it links to. The controls and the head are the settings dialog's (components/settings/controls,
// components/core/Dialog).
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
          limits={ARABIC_SIZE}
          onChange={changeFontSizeArabic}
          decreaseLabel={t("decreaseArabicSize")}
          increaseLabel={t("increaseArabicSize")}
        />
        <SizeStepper
          id="reader-size-translation"
          label={t("translationFontSize")}
          value={fontSizeTranslation}
          limits={TRANSLATION_SIZE}
          onChange={changeFontSizeTranslation}
          decreaseLabel={t("decreaseTranslationSize")}
          increaseLabel={t("increaseTranslationSize")}
        />
        <SwitchRow label={t("showArabic")} checked={showArabic} onChange={changeShowArabic} />

        <div className={styles.theme}>
          <Segmented
            name="reader-theme"
            legend={t("theme")}
            value={theme}
            onChange={changeTheme}
            options={[
              { value: "light", label: t("themeLight"), icon: <Brightness7Icon /> },
              { value: "dark", label: t("themeDark"), icon: <Brightness4Icon /> },
            ]}
          />
        </div>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.reset} onClick={resetReader}>
          {t("resetReader")}
        </button>
        <Link href="/settings" className={styles.allSettings} onClick={onClose}>
          {t("settings")} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </Drawer>
  );
}
