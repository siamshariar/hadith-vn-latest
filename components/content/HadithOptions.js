"use client";

import { useEffect, useRef, useState, useContext } from "react";
import Link from "next/link";
import { PinContext } from "../../contexts/PinContext";
import { BookmarkContext } from "../../contexts/BookmarkContext";
import { useLocale } from "../../contexts/LocaleContext";
import { citablePath, isCurrentStoredRef, storedHadithRef } from "../../lib/hadith";
import {
  buildArabic,
  buildCitation,
  buildText,
  buildTranslations,
  hasTranslations,
  permalink,
  referenceText,
  reportErrorHref,
} from "../../lib/citation";
import { site } from "../../lib/sites";
import { TRANSLATIONS_PARAM, translationsParam } from "../../lib/translations";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import Snackbar from "@mui/material/Snackbar";
import AddBookmark from "../bookmark/add";
import RemoveBookmark from "../bookmark/remove";
import Share from "../core/share";
import BookmarkIcon from "../icons/Bookmark";
import BookmarkBorder from "../icons/BookmarkBorder";
import FileCopyIcon from "../icons/FileCopy";
import LinkIcon from "../icons/Link";
import ShareIcon from "../icons/ShareOutlined";
import MoreIcon from "../icons/MoreVert";
import UnpinIcon from "../icons/Pin";
import PinIcon from "../icons/PinOutline";
import FeedbackIcon from "../icons/Feedback";
import EastIcon from "../icons/East";

import styles from "./HadithOptions.module.scss";

// Copies through the page's selection (document.execCommand), as the copy-to-clipboard library
// does: a hidden span selected with a range. No focus moves, so it also works while a menu holds
// the focus (MUI's focus trap pulls it back from a text field, and the copy then fails in Safari).
// The reader's own selection is put back.
function copyBySelection(text) {
  if (typeof window === "undefined" || !window.getSelection || !document.createRange) return false;
  const selection = window.getSelection();
  const saved = [];
  for (let i = 0; i < selection.rangeCount; i += 1) saved.push(selection.getRangeAt(i));
  const mark = document.createElement("span");
  mark.textContent = text;
  mark.setAttribute("aria-hidden", "true");
  mark.style.cssText = "all:unset;position:fixed;top:0;left:0;clip:rect(0,0,0,0);white-space:pre;-webkit-user-select:text;user-select:text";
  document.body.appendChild(mark);
  let copied = false;
  try {
    const range = document.createRange();
    range.selectNodeContents(mark);
    selection.removeAllRanges();
    selection.addRange(range);
    copied = document.execCommand("copy");
  } catch (_) {
    copied = false;
  }
  selection.removeAllRanges();
  saved.forEach((range) => selection.addRange(range));
  mark.remove();
  return copied;
}

// A hadith's ⋮, as on the Quran sites (cards and the detail page), one 44px button and one menu:
// bookmark and pin; copy the Arabic, the translations, everything, the citation or the link;
// share, details and "report an error". A bookmark or a pin also shows beside it. `hadith` is an
// API hadith object, `book` its collection. `showDetails`: add "view details" (lists). The
// shared link keeps the reader's extra translations (?tr=), so the person it is sent to sees
// the same texts.
const HadithOptions = ({ hadith, book, updateBookmarksData, isBookmarkPage, showDetails = false }) => {
  const locale = useLocale();
  const { t } = locale;
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [message, setMessage] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const citation = referenceText(hadith, book, t);
  const extras = translationsParam((hadith.extraLanguages || []).map((language) => language.code));
  const url = `${permalink(hadith, book)}${extras ? `?${TRANSLATIONS_PARAM}=${extras}` : ""}`;
  const shareTitle = `${citation} | ${site.siteName}`;
  const menuId = `hadith-menu-${hadith.id}`;

  const copy = (text) => {
    setMenuAnchor(null);
    const done = () => setMessage(t("copied"));
    // Some browsers have no clipboard API or refuse it (in-app browsers, an http address): the
    // old way, through the selection, still works in most of them.
    const fallback = () => (copyBySelection(text) ? done() : setMessage(t("copyFailed")));
    if (typeof navigator === "undefined" || !navigator.clipboard || !navigator.clipboard.writeText) {
      fallback();
      return;
    }
    navigator.clipboard.writeText(text).then(done).catch(fallback);
  };

  const share = () => {
    const title = shareTitle;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title, url }).catch(() => {});
    } else {
      setShareOpen(true);
    }
  };

  const closeShare = (open) => (event) => {
    if (event && event.type === "keydown" && (event.key === "Tab" || event.key === "Shift")) return;
    setShareOpen(open);
  };

  // bookmarks (only entries saved against the current API ids count)
  const { bookmarks } = useContext(BookmarkContext);
  const bookmarkKey =
    Object.keys(bookmarks || {}).find((key) => {
      const entries = (bookmarks[key] && bookmarks[key].entry) || [];
      return entries.some((el) => isCurrentStoredRef(el) && el.id == hadith.id);
    }) || "";
  const isBookmarked = Boolean(bookmarkKey);
  const [addBookmarkOpen, setAddBookmarkOpen] = useState(false);
  const [removeBookmarkOpen, setRemoveBookmarkOpen] = useState(false);

  const handleBookmarkClose = (open) => (event) => {
    if (event && event.type === "keydown" && (event.key === "Tab" || event.key === "Shift")) return;
    setAddBookmarkOpen(open);
    setRemoveBookmarkOpen(open);
  };

  // pins
  const { pin, addPin, removePin } = useContext(PinContext);
  const isPinned = (pin || []).some((el) => isCurrentStoredRef(el) && el.id == hadith.id);
  const togglePin = () => {
    if (isPinned) removePin(hadith);
    else addPin(storedHadithRef(hadith, book));
    setMenuAnchor(null);
  };

  // The inline Unpin or Remove goes away with what it removes: focus moves to ⋮, not the page.
  // Only after the reader used one of them: the saved lists also load after the first render,
  // and that change must not pull the focus (and a focus ring) to a saved hadith's ⋮.
  const more = useRef(null);
  const acted = useRef(false);
  const marks = `${isBookmarked}|${isPinned}`;
  const lastMarks = useRef(marks);
  useEffect(() => {
    if (lastMarks.current === marks) return undefined;
    lastMarks.current = marks;
    if (!acted.current) return undefined;
    acted.current = false;
    const timer = window.setTimeout(() => {
      const el = document.activeElement;
      if ((!el || el === document.body) && more.current) more.current.focus({ preventScroll: true });
    }, 50);
    return () => window.clearTimeout(timer);
  }, [marks]);

  const bookmarkLabel = isBookmarked ? t("removeBookmark") : t("bookmark");
  const closeMenu = () => setMenuAnchor(null);
  const item = (icon, label) => (
    <>
      <span className={styles.icon}>{icon}</span>
      <span className={styles.text}>{label}</span>
    </>
  );

  return (
    <>
      <div className={styles.row} role="group" aria-label={t("hadithActions")}>
        {/* What the reader has marked stays in view, and can be taken back at once. */}
        {isBookmarked && (
          <button
            type="button"
            className={`${styles.button} ${styles.active}`}
            onClick={() => {
              acted.current = true;
              setRemoveBookmarkOpen(true);
            }}
            aria-label={bookmarkLabel}
            title={bookmarkLabel}
          >
            <BookmarkIcon />
          </button>
        )}
        {isPinned && (
          <button
            type="button"
            className={`${styles.button} ${styles.active}`}
            onClick={() => {
              acted.current = true;
              togglePin();
            }}
            aria-label={t("unpin")}
            title={t("unpin")}
          >
            <UnpinIcon />
          </button>
        )}
        <button
          ref={more}
          type="button"
          className={styles.button}
          onClick={(event) => setMenuAnchor(event.currentTarget)}
          aria-label={t("hadithOptions")}
          title={t("hadithOptions")}
          aria-haspopup="menu"
          aria-expanded={menuAnchor ? "true" : "false"}
          aria-controls={menuAnchor ? menuId : undefined}
        >
          <MoreIcon />
        </button>
      </div>

      <Menu
        id={menuId}
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        disableScrollLock
        classes={{ paper: styles.paper }}
      >
        <MenuItem
          onClick={() => {
            closeMenu();
            if (isBookmarked) setRemoveBookmarkOpen(true);
            else setAddBookmarkOpen(true);
          }}
        >
          {item(isBookmarked ? <BookmarkIcon /> : <BookmarkBorder />, bookmarkLabel)}
        </MenuItem>
        <MenuItem onClick={togglePin}>{item(isPinned ? <UnpinIcon /> : <PinIcon />, isPinned ? t("unpin") : t("pin"))}</MenuItem>
        <Divider className={styles.divider} />
        {hadith.arabic && <MenuItem onClick={() => copy(buildArabic(hadith, book, locale))}>{item(<FileCopyIcon />, t("copyArabic"))}</MenuItem>}
        {hasTranslations(hadith) && <MenuItem onClick={() => copy(buildTranslations(hadith, book, locale))}>{item(<FileCopyIcon />, t("copyTranslations"))}</MenuItem>}
        <MenuItem onClick={() => copy(buildText(hadith, book, locale))}>{item(<FileCopyIcon />, t("copyAll"))}</MenuItem>
        <MenuItem onClick={() => copy(buildCitation(hadith, book, locale))}>{item(<FileCopyIcon />, t("copyCitation"))}</MenuItem>
        <MenuItem onClick={() => copy(url)}>{item(<LinkIcon />, t("copyLink"))}</MenuItem>
        <Divider className={styles.divider} />
        <MenuItem
          onClick={() => {
            closeMenu();
            share();
          }}
        >
          {item(<ShareIcon />, t("share"))}
        </MenuItem>
        {showDetails && (
          <MenuItem component={Link} href={citablePath(hadith, book)} onClick={closeMenu}>
            {item(<EastIcon />, t("viewDetails"))}
          </MenuItem>
        )}
        <MenuItem component="a" href={reportErrorHref(hadith, book, t)} onClick={closeMenu}>
          {item(<FeedbackIcon />, t("reportError"))}
        </MenuItem>
      </Menu>

      <Snackbar
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        open={Boolean(message)}
        autoHideDuration={2500}
        onClose={() => setMessage(null)}
        message={message || ""}
      />

      {addBookmarkOpen && (
        <AddBookmark open={addBookmarkOpen} closer={handleBookmarkClose} entry={storedHadithRef(hadith, book)} />
      )}
      {removeBookmarkOpen && (
        <RemoveBookmark
          open={removeBookmarkOpen}
          closer={handleBookmarkClose}
          hadith={hadith}
          updateBookmarksData={updateBookmarksData}
          bookmarkKey={bookmarkKey}
          isBookmarkPage={isBookmarkPage}
        />
      )}
      {shareOpen && <Share open={shareOpen} closer={closeShare} url={url} title={shareTitle} />}
    </>
  );
};

export default HadithOptions;
