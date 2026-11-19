import { useId } from "react";
import Drawer from "@mui/material/Drawer";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useLocale } from "../../contexts/LocaleContext";
import CloseIcon from "../icons/Close";
import SettingsContent from "./index";
import styles from "./Panel.module.scss";

// The settings, all of them (components/settings: sizes, faces, theme, the Arabic, reset), from
// every settings button: the web header's menu, the navigation's gear and the phone header.
// A panel on the right from 600px, over a light veil, so the text stays in view while it
// changes; a bottom sheet on phones. Everything applies at once and is saved in this browser (SettingsContext). The
// /settings page shows the same for a link or a new tab.
// MUI's Drawer keeps the focus inside, closes on Esc and on the backdrop, and gives it back.
export default function SettingsPanel({ open, onClose }) {
  const { t } = useLocale();
  const titleId = useId();
  const wide = useMediaQuery("(min-width:600px)", { noSsr: true });

  return (
    <Drawer
      anchor={wide ? "right" : "bottom"}
      open={open}
      onClose={onClose}
      classes={{ paper: `${styles.paper} ${wide ? styles.side : styles.sheet}` }}
      slotProps={{
        paper: { role: "dialog", "aria-modal": true, "aria-labelledby": titleId },
        backdrop: { className: styles.backdrop },
      }}
    >
      <div className={styles.head}>
        <h2 id={titleId} className={styles.title}>
          {t("settings")}
        </h2>
        <button type="button" className={styles.close} onClick={onClose} aria-label={t("close")} title={t("close")}>
          <CloseIcon />
        </button>
      </div>
      <div className={styles.body}>
        <SettingsContent headingLevel={3} />
      </div>
    </Drawer>
  );
}
