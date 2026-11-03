import { useContext, useRef } from "react";
import { BookmarkContext, folderLabel } from "../../contexts/BookmarkContext";
import { useLocale } from "../../contexts/LocaleContext";
import Modal from "@mui/material/Modal";
import Backdrop from "@mui/material/Backdrop";
import Fade from "@mui/material/Fade";
import CloseIcon from "../icons/Close";
import styles from "./modal.module.scss";

// Deletes a bookmark folder (not the default one) with its bookmarks.
export default function DeleteBookmark({ open, closer, bookmarkKey }) {
  const { bookmarks, changeBookmarks } = useContext(BookmarkContext);
  const { t } = useLocale();
  // Keeps the name while the dialog fades out after the folder is gone.
  const name = useRef("");
  if (bookmarkKey && bookmarks[bookmarkKey]) name.current = folderLabel(bookmarkKey, bookmarks[bookmarkKey], t);

  const handleDeleteBookmark = (e) => {
    if (Object.prototype.hasOwnProperty.call(bookmarks, bookmarkKey)) {
      const { [bookmarkKey]: _deleted, ...rest } = bookmarks;
      changeBookmarks(rest);
      closer(false)(e);
    }
  };

  return (
    <Modal
      //className={classes.modal}
      open={open}
      onClose={closer(false)}
      closeAfterTransition
      BackdropComponent={Backdrop}
      BackdropProps={{
        timeout: 500,
      }}
    >
      <Fade in={open} timeout={250}>
        <div className={styles.content} role="dialog" aria-modal="true" aria-labelledby="bookmark-delete-title">
          <button type="button" className={styles.close} onClick={closer(false)} aria-label={t("close")} title={t("close")}>
            <CloseIcon />
          </button>

          <h2 id="bookmark-delete-title" className={styles.title}>{t("deleteFolderTitle")}</h2>
          <div className={styles.title_desc}>{t("deleteFolderText", { name: name.current })}</div>

          <div className={styles.buttons}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btn_remove}`}
              onClick={handleDeleteBookmark}
            >
              {t("remove")}
            </button>
          </div>
        </div>
      </Fade>
    </Modal>
  );
}
