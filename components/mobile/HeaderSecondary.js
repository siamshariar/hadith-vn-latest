import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Container from "../core/container";
import HeaderLogo from "../web/HeaderLogo";
import CategoryModal from "./CategoryModal";
import SettingsModal from "./settings-modal";
import MobileNav from "./MobileNav";
import LanguageMenu from "../core/LanguageMenu";
import BackIcon from "../icons/NavigateBefore";
import DropDownIcon from "../icons/ArrowDropDown";
import MenuIcon from "../icons/Menu";
import TuneIcon from "../icons/Tune";
import SearchIcon from "../icons/Search";
import { useLocale } from "../../contexts/LocaleContext";
import styles from "./Header.module.scss";

// Header of the content pages (phones and tablets): back, menu, then the
// category tree on category pages or the logo elsewhere; the language menu
// (from 360px; narrower, the menu drawer has it), search and the reader
// settings on the right.
export default function HeaderMobile({ selectedCategoryId, backLink }) {
  const router = useRouter();
  const { t } = useLocale();

  const ignoreTab = (event) =>
    event.type === "keydown" && (event.key === "Tab" || event.key === "Shift");

  const [categoryOpen, setCategoryOpen] = useState(false);
  const handleCategoryModal = (open) => (event) => {
    if (ignoreTab(event)) return;
    setCategoryOpen(open);
  };

  const [settingsOpen, setSettingsOpen] = useState(false);
  const handleSettingsModal = (open) => (event) => {
    event.preventDefault();
    if (ignoreTab(event)) return;
    setSettingsOpen(open);
  };

  const [navOpen, setNavOpen] = useState(false);
  const controlNav = (open) => (event) => {
    if (ignoreTab(event)) return;
    setNavOpen(open);
  };

  // Back goes back in history when there is some; else up to `backLink`.
  const [historyLength, setHistoryLength] = useState(0);
  useEffect(() => {
    setHistoryLength(window.history.length);
  }, []);

  const categoryNav = selectedCategoryId != null || router.pathname.startsWith("/categories");

  return (
    <>
      <div className={styles.header}>
        <Container>
          <div className={styles.wrapper}>
            <div className={styles.left}>
              {backLink && (
                <button
                  type="button"
                  className={styles.icon}
                  aria-label={t("goBack")}
                  onClick={historyLength > 2 ? () => router.back() : () => router.push(`${backLink}`)}
                >
                  <BackIcon />
                </button>
              )}
              <button
                type="button"
                className={styles.icon}
                aria-label={t("menu")}
                aria-haspopup="dialog"
                onClick={controlNav(true)}
              >
                <MenuIcon />
              </button>
            </div>

            <div className={styles.center}>
              {categoryNav ? (
                <button
                  type="button"
                  className={styles.categoryButton}
                  onClick={handleCategoryModal(true)}
                  aria-haspopup="dialog"
                >
                  <span>{t("categories")}</span>
                  <DropDownIcon />
                </button>
              ) : (
                <HeaderLogo size="mobile" />
              )}
            </div>

            <div className={styles.right}>
              <LanguageMenu variant="phone" className={styles.wideOnly} />
              <Link href="/search" className={styles.icon} aria-label={t("search")}>
                <SearchIcon />
              </Link>
              <Link
                href="/settings"
                className={styles.icon}
                aria-label={t("settings")}
                onClick={handleSettingsModal(true)}
              >
                <TuneIcon />
              </Link>
            </div>
          </div>
        </Container>
      </div>
      <MobileNav navOpen={navOpen} navControl={controlNav} selectedCategoryId={selectedCategoryId} />
      <CategoryModal
        open={categoryOpen}
        controller={handleCategoryModal}
        selectedCategoryId={selectedCategoryId}
      />
      <SettingsModal open={settingsOpen} controller={handleSettingsModal} />
    </>
  );
}
