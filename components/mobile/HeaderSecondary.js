import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import NavDrawer from "./NavDrawer";
import ReaderSettings from "../hadith/ReaderSettings";
import BackIcon from "../icons/NavigateBefore";
import DropDownIcon from "../icons/ArrowDropDown";
import MenuIcon from "../icons/Menu";
import TuneIcon from "../icons/Tune";
import SearchIcon from "../icons/Search";
import { useLocale } from "../../contexts/LocaleContext";
import styles from "./Header.module.scss";

// Header of the reading pages (phones and tablets): back, where the reader is, which opens the
// navigation (`where`: NavDrawer), search and the reading settings. `title`: ({ t, formatNumber })
// => the text; without one, the tab the page belongs to.
export default function HeaderMobile({ where = {}, backLink, title }) {
  const router = useRouter();
  const locale = useLocale();
  const { t } = locale;
  const [navOpen, setNavOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Back goes back in history when there is some; else up to `backLink`.
  const [historyLength, setHistoryLength] = useState(0);
  useEffect(() => {
    setHistoryLength(window.history.length);
  }, []);

  const heading = (title && title(locale)) || (where.mode === "books" ? t("books") : t("categories"));

  return (
    <>
      <div className={styles.header}>
        <div className={styles.wrapper}>
          {backLink ? (
            <button
              type="button"
              className={styles.icon}
              aria-label={t("goBack")}
              title={t("goBack")}
              onClick={historyLength > 2 ? () => router.back() : () => router.push(`${backLink}`)}
            >
              <BackIcon />
            </button>
          ) : (
            <button
              type="button"
              className={styles.icon}
              aria-label={t("menu")}
              title={t("menu")}
              aria-haspopup="dialog"
              onClick={() => setNavOpen(true)}
            >
              <MenuIcon />
            </button>
          )}
          <button
            type="button"
            className={styles.titleButton}
            onClick={() => setNavOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={navOpen ? "true" : "false"}
          >
            <span>{heading}</span>
            <DropDownIcon />
          </button>
          <Link href="/search" className={styles.icon} aria-label={t("search")} title={t("search")}>
            <SearchIcon />
          </Link>
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
      <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} where={where} onSettings={() => setSettingsOpen(true)} />
      <ReaderSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
