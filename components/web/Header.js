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
import Dialog, { dialogButtonClass } from "../core/Dialog";
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
// is no language menu. The menu's Bookmarks, Pins, Last read and Settings open in the site's
// dialog (components/core/Dialog); About opens its page.
export default function HeaderWeb({ page }) {
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

  // The menu's dialogs: "bookmarks", "pins", "lastRead" or "settings". The kind stays while the
  // dialog fades out.
  const [modalOpen, setModalOpen] = useState(false);
  const [modalKind, setModalKind] = useState(null);

  const handleModalClose = (open) => (event) => {
    if (event && event.type === "keydown" && (event.key === "Tab" || event.key === "Shift")) {
      return;
    }
    setModalOpen(open);
  };

  const handleItem = (e, item) => {
    e.preventDefault();
    handleClose();

    if (item === "about") {
      router.push("/about");
    } else {
      setModalKind(item);
      setModalOpen(true);
    }
  };

  const MODALS = {
    bookmarks: { title: t("bookmarks"), content: <Bookmarks controller={handleModalClose} single /> },
    pins: { title: t("pins"), content: <Pin controller={handleModalClose} /> },
    lastRead: { title: t("lastRead"), content: <LastRead controller={handleModalClose} /> },
    settings: { title: t("settings"), content: <Settings /> },
  };
  const modal = MODALS[modalKind];

  return (
    <>
      {modal && (
        <Dialog
          open={modalOpen}
          onClose={handleModalClose(false)}
          title={modal.title}
          flush={modalKind !== "settings"}
          actions={
            modalKind !== "settings" && (
              <Link href="/bookmarks" className={dialogButtonClass("secondary")} onClick={handleModalClose(false)}>
                {t("viewAll")}
              </Link>
            )
          }
        >
          {modal.content}
        </Dialog>
      )}
      <div className={styles.header}>
        <div className={styles.content}>
          <div className={styles.left}>
            <HeaderLogo size="desktop" />
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
                  onClick={(e) => handleItem(e, "bookmarks")}
                >
                  <span className={styles.icon}>
                    <BookmarkBorderIcon />
                  </span>
                  <span className={styles.text}>{t("bookmarks")}</span>
                </MenuItem>

                <MenuItem
                  onClick={(e) => handleItem(e, "pins")}
                >
                  <span className={styles.icon}>
                    <PinOutlineIcon />
                  </span>
                  <span className={styles.text}>{t("pins")}</span>
                </MenuItem>

                <MenuItem
                  onClick={(e) => handleItem(e, "lastRead")}
                >
                  <span className={styles.icon}>
                    <AutoStoriesIcon />
                  </span>
                  <span className={styles.text}>{t("lastRead")}</span>
                </MenuItem>

                <MenuItem
                  onClick={(e) => handleItem(e, "settings")}
                >
                  <span className={styles.icon}>
                    <SettingsIcon />
                  </span>
                  <span className={styles.text}>{t("settings")}</span>
                </MenuItem>

                <MenuItem onClick={(e) => handleItem(e, "about")}>
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
