import { useState } from "react";
import { useLocale } from "../../contexts/LocaleContext";
import HeaderLogo from "../web/HeaderLogo";
import LanguageMenu from "../core/LanguageMenu";
import NavDrawer from "./NavDrawer";
import ReaderSettings from "../hadith/ReaderSettings";
import MenuIcon from "../icons/Menu";
import TuneIcon from "../icons/Tune";
import styles from "./Header.module.scss";

// Home page header (phones and tablets): the navigation (the drawer also has Saved and the
// settings), the logo, the language and the reading settings. The page opens with its search field.
export default function HeaderMobile({ navMode = "books" }) {
  const { t } = useLocale();
  const [navOpen, setNavOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <div className={styles.header}>
        <div className={styles.wrapper}>
          <button
            type="button"
            className={styles.icon}
            onClick={() => setNavOpen(true)}
            aria-label={t("menu")}
            title={t("menu")}
            aria-haspopup="dialog"
            aria-expanded={navOpen ? "true" : "false"}
          >
            <MenuIcon />
          </button>
          <div className={styles.center}>
            <HeaderLogo size="mobile" />
          </div>
          <LanguageMenu variant="phone" />
          <button
            type="button"
            className={styles.icon}
            onClick={() => setSettingsOpen(true)}
            aria-label={t("readerSettings")}
            title={t("readerSettings")}
            aria-haspopup="dialog"
            aria-expanded={settingsOpen ? "true" : "false"}
          >
            <TuneIcon />
          </button>
        </div>
      </div>
      <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} where={{ mode: navMode }} onSettings={() => setSettingsOpen(true)} />
      <ReaderSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
