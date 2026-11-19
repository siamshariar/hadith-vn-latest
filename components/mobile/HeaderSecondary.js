import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import NavDrawer from "./NavDrawer";
import SettingsPanel from "../settings/Panel";
import BackIcon from "../icons/NavigateBefore";
import ChevronDownIcon from "../icons/ChevronDown";
import MenuIcon from "../icons/Menu";
import TuneIcon from "../icons/Tune";
import SearchIcon from "../icons/Search";
import { useLocale } from "../../contexts/LocaleContext";
import styles from "./Header.module.scss";

// Header of the reading pages (phones and tablets): back, where the reader is, which opens the
// navigation (`where`: NavDrawer), search and the settings. `title`: ({ t, formatNumber }) =>
// the page's name, or { context, label }: the book or section above, smaller ("Sahih Muslim"),
// the page under it ("0. Introduction"); without one, the tab the page belongs to.
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
  const { context, label } = typeof heading === "object" ? heading : { context: null, label: heading };

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
          <div className={styles.center}>
            <button
              type="button"
              className={styles.titleButton}
              onClick={() => setNavOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={navOpen ? "true" : "false"}
            >
              <span className={styles.titleText}>
                {context && <span className={styles.titleContext}>{context}</span>}
                <span className={styles.titleLabel}>{label}</span>
              </span>
              <ChevronDownIcon />
            </button>
          </div>
          <Link href="/search" className={styles.icon} aria-label={t("search")} title={t("search")}>
            <SearchIcon />
          </Link>
          <button
            type="button"
            className={styles.icon}
            onClick={() => setSettingsOpen(true)}
            aria-label={t("settings")}
            title={t("settings")}
            aria-haspopup="dialog"
            aria-expanded={settingsOpen ? "true" : "false"}
          >
            <TuneIcon />
          </button>
        </div>
      </div>
      <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} where={where} onSettings={() => setSettingsOpen(true)} />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
