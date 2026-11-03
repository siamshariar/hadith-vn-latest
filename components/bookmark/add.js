"use client";

import { useState, useContext } from "react";
import { BookmarkContext, folderLabel } from "../../contexts/BookmarkContext";
import { useLocale } from "../../contexts/LocaleContext";
import Modal from "@mui/material/Modal";
import Backdrop from "@mui/material/Backdrop";
import Fade from "@mui/material/Fade";
import CloseIcon from "../icons/Close";
import styles from "./modal.module.scss";

// `entry` is a stored reference (lib/hadith storedHadithRef): ids and numbers only.
export default function AddBookmark({ open, closer, entry }) {
  const { bookmarks, changeBookmarks } = useContext(BookmarkContext);
  const { t } = useLocale();

  const [folderKey, setFolderKey] = useState("favorites");
  const [newFolderKey, setNewFolderKey] = useState("");
  const [newFolderName, setNewFolderName] = useState("");

  const [message, setMessage] = useState({
    open: false,
    text: "",
  });

  const handleShowMessage = (msg) => {
    setMessage({ ...message, ["open"]: true, ["text"]: msg });
    setTimeout(() => {
      setMessage({ ...message, ["open"]: false, ["text"]: msg });
    }, 2000);
    return;
  };

  const handleClose = (e) => {
    closer(false)(e);
    setNewFolderKey("");
    setNewFolderName("");
  };

  const changeFolder = (folder) => {
    setFolderKey(folder);
  };

  const handleCreateNewFolder = (folder) => {
    setNewFolderKey(folder.replace(/\s+/g, "").trim().toLowerCase());
    setNewFolderName(folder.charAt(0).toUpperCase() + folder.slice(1));
  };

  const handleAddBookmark = (e) => {
    const item = { ...entry, date: new Date().toISOString() };

    if (folderKey === "create") {
      if (newFolderKey === "") {
        handleShowMessage(t("folderNameEmpty"));
      } else if (bookmarks.hasOwnProperty(newFolderKey)) {
        handleShowMessage(t("folderExists", { name: newFolderName }));
      } else {
        changeBookmarks({
          ...bookmarks,
          [newFolderKey]: { name: newFolderName, entry: [item] },
        });
        closer(false)(e);
        setFolderKey("favorites");
      }
    } else if (bookmarks.hasOwnProperty(folderKey)) {
      const folder = bookmarks[folderKey];
      const entries = (folder.entry || []).filter((el) => el.id != item.id);
      changeBookmarks({
        ...bookmarks,
        [folderKey]: { name: folder.name, entry: [...entries, item] },
      });
      closer(false)(e);
    }
  };

  return (
    <Modal
      //className={classes.modal}
      open={open}
      onClose={handleClose}
      closeAfterTransition
      BackdropComponent={Backdrop}
      BackdropProps={{
        timeout: 500,
      }}
    >
      <Fade in={open} timeout={250}>
        <div className={styles.content} role="dialog" aria-modal="true" aria-labelledby="bookmark-add-title">
          <button type="button" className={styles.close} onClick={handleClose} aria-label={t("close")} title={t("close")}>
            <CloseIcon />
          </button>
          <h2 id="bookmark-add-title" className={styles.title}>{t("bookmark")}</h2>
          <div className={styles.input_area}>
            <label className={styles.sub_title} htmlFor="bookmark-folder">
              {t("chooseFolder")}
            </label>
            <select
              id="bookmark-folder"
              value={folderKey}
              onChange={(e) => changeFolder(e.target.value)}
            >
              {Object.keys(bookmarks).map((key) => (
                <option value={key} key={key}>
                  {folderLabel(key, bookmarks[key], t)}
                </option>
              ))}
              <option value="create">{t("createFolder")}</option>
            </select>
            <input
              type="text"
              name="create"
              autoComplete="off"
              placeholder={t("folderName")}
              aria-label={t("folderName")}
              onChange={(e) => handleCreateNewFolder(e.target.value)}
              className={folderKey === "create" ? styles.open : ""}
            />

            <div
              className={
                message.open
                  ? `${styles.message} ${styles.open}`
                  : styles.message
              }
              role="alert"
            >
              {message.text}
            </div>

            <div className={styles.buttons}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btn_add}`}
                onClick={handleAddBookmark}
              >
                {t("add")}
              </button>
            </div>
          </div>
        </div>
      </Fade>
    </Modal>
  );
}
