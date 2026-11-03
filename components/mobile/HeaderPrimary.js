import { useState, useContext } from "react";
import { SettingsContext } from "../../contexts/SettingsContext";
import { useLocale } from "../../contexts/LocaleContext";
import Link from "next/link";
import Container from "../core/container";
import IconButton from "@mui/material/IconButton";
import HeaderLogo from "../web/HeaderLogo";
import LanguageMenu from "../core/LanguageMenu";
import MobileNav from "./MobileNav";
import MenuIcon from "../icons/Menu";
import SearchIcon from "../icons/Search";
import Brightness4Icon from "../icons/Brightness4";
import Brightness7Icon from "../icons/Brightness7";
import styles from "./Header.module.scss";

// Home page header (phones and tablets): menu, logo, the language menu (the
// globe), search, theme.
export default function HeaderMobile({ selectedCategoryId }) {
  const { theme, changeTheme } = useContext(SettingsContext);
  const { t } = useLocale();

  const modeSwitcher = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    changeTheme(newTheme);
  };

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const controlMobileNav = (open) => (event) => {
    if (
      event.type === "keydown" &&
      (event.key === "Tab" || event.key === "Shift")
    ) {
      return;
    }
    setMobileNavOpen(open);
  };

  return (
    <>
      <div className={styles.header}>
        <Container>
          <div className={styles.wrapper}>
            <div className={styles.left}>
              <IconButton
                className={styles.icon}
                onClick={controlMobileNav(true)}
                focusRipple={false}
                aria-label={t("menu")}
                aria-haspopup="dialog"
              >
                <MenuIcon />
              </IconButton>
            </div>

            <div className={styles.center}>
              <HeaderLogo size="mobile" />
            </div>

            <div className={styles.right}>
              <LanguageMenu variant="phone" />
              <Link href="/search" className={styles.icon} aria-label={t("search")}>
                <SearchIcon />
              </Link>

              <IconButton
                className={styles.icon}
                onClick={() => modeSwitcher()}
                focusRipple={false}
                aria-label={theme === "light" ? t("darkMode") : t("lightMode")}
              >
                {theme === "light" && <Brightness4Icon />}
                {theme !== "light" && <Brightness7Icon />}
              </IconButton>
            </div>
          </div>
        </Container>
      </div>
      <MobileNav
        navOpen={mobileNavOpen}
        navControl={controlMobileNav}
        selectedCategoryId={selectedCategoryId}
      />
    </>
  );
}
