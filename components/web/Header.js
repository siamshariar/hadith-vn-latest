"use client";

import styles from "./Header.module.scss";
import { useState, useContext } from "react";
import { SettingsContext } from "../../contexts/SettingsContext";
import { useRouter } from "next/router";
import Link from "next/link";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import MenuList from "@mui/material/MenuList";
import MenuItem from "@mui/material/MenuItem";
import Modal from "../utils/ModalPrimary";
import Settings from "../settings/index";
import Bookmarks from "../bookmark/list";
import Pin from "../pin/list";
import LastRead from "../last-read/list";
import Brightness4Icon from "../icons/Brightness4";
import Brightness7Icon from "../icons/Brightness7";
import MoreVertIcon from "../icons/MoreVert";
import BookmarkBorderIcon from "../icons/BookmarkBorder";
import InfoIcon from "../icons/Info";
import PinOutlineIcon from "../icons/PinOutline";
import AutoStoriesIcon from "../icons/AutoStories";
import SettingsIcon from "../icons/SettingsOutlined";
import SearchIcon from "../icons/Search";
import { useLocale } from "../../contexts/LocaleContext";
import HeaderLogo from "./HeaderLogo";

// Desktop header (1024px and up), a white bar on the page's frame: the colour logo (the
// dark one in the dark theme); on the right the search icon (the search page, the one place
// with a search field), the theme and the menu. Each site reads in its own language, so there
// is no language menu. `sections`: the two ways into the library as words, on the pages that
// have no navigation card to show them.
const SECTIONS = [
  { href: "/books", label: "books" },
  { href: "/categories", label: "categories" },
];
export default function HeaderWeb({ page, sections = false }) {
  const router = useRouter();

  const { theme, changeTheme } = useContext(SettingsContext);
  const { t } = useLocale();

  const modeSwitcher = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    changeTheme(newTheme);
  };

  const [anchorEl, setAnchorEl] = useState(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState(null);
  const [modalContent, setModalContent] = useState(null);

  const handleModalClose = (open) => (event) => {
    if (
      event.type === "keydown" &&
      (event.key === "Tab" || event.key === "Shift")
    ) {
      return;
    }
    setModalOpen(open);
  };

  const handleItem = (e, item, title) => {
    e.preventDefault();
    handleClose();

    if (item === "about") {
      router.push("/about");
    } else {
      setModalTitle(title);
      setModalContent(item);
      setModalOpen(true);
    }
  };

  return (
    <>
      <Modal
        open={modalOpen}
        closer={handleModalClose}
        title={modalTitle}
        content={modalContent}
      />
      <div className={styles.header}>
        <div className={styles.content}>
          <div className={styles.left}>
            <HeaderLogo size="desktop" />
            {sections && <nav className={styles.nav}>
              {SECTIONS.map((section) => (
                <Link key={section.href} href={section.href} className={styles.navLink}>
                  {t(section.label)}
                </Link>
              ))}
            </nav>}
          </div>

          <div className={styles.right}>
            <IconButton component={Link} href="/search" className={styles.btn} aria-label={t("search")} title={t("search")}>
              <SearchIcon />
            </IconButton>

            <IconButton
              className={styles.btn}
              onClick={() => modeSwitcher()}
              aria-label={theme === "light" ? t("darkMode") : t("lightMode")}
              title={theme === "light" ? t("darkMode") : t("lightMode")}
            >
              {theme === "light" && <Brightness4Icon />}
              {theme !== "light" && <Brightness7Icon />}
            </IconButton>

            <IconButton
              className={styles.btn}
              onClick={handleClick}
              aria-label={t("moreOptions")}
              title={t("moreOptions")}
              aria-haspopup="menu"
              aria-expanded={open ? "true" : undefined}
            >
              <MoreVertIcon />
            </IconButton>

            <Popover
              open={open}
              anchorEl={anchorEl}
              onClose={handleClose}
              anchorOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              disableScrollLock={true}
            >
              <MenuList className={styles.menu} autoFocusItem={open}>
                <MenuItem
                  onClick={(e) =>
                    handleItem(
                      e,
                      <Bookmarks controller={handleModalClose} />,
                      t("bookmarks")
                    )
                  }
                >
                  <span className={styles.icon}>
                    <BookmarkBorderIcon />
                  </span>
                  <span className={styles.text}>{t("bookmarks")}</span>
                </MenuItem>

                <MenuItem
                  onClick={(e) =>
                    handleItem(e, <Pin controller={handleModalClose} />, t("pins"))
                  }
                >
                  <span className={styles.icon}>
                    <PinOutlineIcon />
                  </span>
                  <span className={styles.text}>{t("pins")}</span>
                </MenuItem>

                <MenuItem
                  onClick={(e) =>
                    handleItem(
                      e,
                      <LastRead controller={handleModalClose} />,
                      t("lastRead")
                    )
                  }
                >
                  <span className={styles.icon}>
                    <AutoStoriesIcon />
                  </span>
                  <span className={styles.text}>{t("lastRead")}</span>
                </MenuItem>

                <MenuItem
                  onClick={(e) =>
                    handleItem(
                      e,
                      <Settings controller={handleModalClose} />,
                      t("settings")
                    )
                  }
                >
                  <span className={styles.icon}>
                    <SettingsIcon />
                  </span>
                  <span className={styles.text}>{t("settings")}</span>
                </MenuItem>

                <MenuItem onClick={(e) => handleItem(e, "about", null)}>
                  <span className={styles.icon}>
                    <InfoIcon />
                  </span>
                  <span className={styles.text}>{t("about")}</span>
                </MenuItem>
              </MenuList>
            </Popover>
          </div>
        </div>
      </div>
    </>
  );
}
