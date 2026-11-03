"use client";

import { useContext } from "react";
import { BookmarkContext, folderLabel } from "../../contexts/BookmarkContext";
import { useLocale } from "../../contexts/LocaleContext";
import Modal from "@mui/material/Modal";
import Backdrop from "@mui/material/Backdrop";
import Fade from "@mui/material/Fade";
import CloseIcon from "../icons/Close";
import styles from "./modal.module.scss";

export default function RemoveBookmark({
  open,
  closer,
  hadith,
  updateBookmarksData,
  bookmarkKey,
  isBookmarkPage,
}) {
  const { bookmarks, changeBookmarks } = useContext(BookmarkContext);
  const { t } = useLocale();

  const handleRemoveBookmark = (e) => {
    const folder = bookmarks[bookmarkKey];
    if (!folder) return;

    const entry = folder.entry || [];
    if (entry.some((el) => el.id == hadith.id)) {
      changeBookmarks({
        ...bookmarks,
        [bookmarkKey]: { name: folder.name, entry: entry.filter((item) => !(item.id == hadith.id)) },
      });

      if (typeof isBookmarkPage !== "undefined" && isBookmarkPage === true) {
        updateBookmarksData(hadith.id);
      }

      closer(false)(e);
    }
  };

  return (
    <Modal
      open={open}
      onClose={closer(false)}
      closeAfterTransition
      BackdropComponent={Backdrop}
      BackdropProps={{
        timeout: 500,
      }}
    >
      <Fade in={open} timeout={250}>
        <div className={styles.content} role="dialog" aria-modal="true" aria-labelledby="bookmark-remove-title">
          <button type="button" className={styles.close} onClick={closer(false)} aria-label={t("close")} title={t("close")}>
            <CloseIcon />
          </button>

          <h2 id="bookmark-remove-title" className={styles.title}>{t("removeBookmarkTitle")}</h2>
          <div className={styles.title_desc}>
            {t("removeBookmarkText", { name: folderLabel(bookmarkKey, bookmarks[bookmarkKey], t) })}
          </div>

          <div className={styles.buttons}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btn_remove}`}
              onClick={handleRemoveBookmark}
            >
              {t("remove")}
            </button>
          </div>
        </div>
      </Fade>
    </Modal>
  );
}
