"use client";

import { useId, useState, useContext } from "react";
import { BookmarkContext, folderLabel } from "../../contexts/BookmarkContext";
import { useLocale } from "../../contexts/LocaleContext";
import useNames from "../../hooks/useNames";
import { storedRefLabel, storedRefSource } from "../../lib/hadith";
import Dialog, { DialogButton } from "../core/Dialog";
import FolderIcon from "../icons/Folder";
import PlusIcon from "../icons/Plus";
import CheckIcon from "../icons/Check";
import styles from "./modal.module.scss";

// Saving a hadith: which one (the line under the title), the folders to choose from (radio
// buttons, with how many each holds) and a new one, named in the field that opens under it.
// `entry` is a stored reference (lib/hadith storedHadithRef): ids and numbers only.
export default function AddBookmark({ open, closer, entry }) {
  const { bookmarks, changeBookmarks } = useContext(BookmarkContext);
  const { t, lang, formatNumber } = useLocale();
  const names = useNames(lang);
  const formId = useId();
  const errorId = useId();

  const [folderKey, setFolderKey] = useState("favorites");
  const [newFolderName, setNewFolderName] = useState("");
  const [error, setError] = useState("");

  const reset = () => {
    setFolderKey("favorites");
    setNewFolderName("");
    setError("");
  };

  const handleClose = (event) => {
    closer(false)(event);
    reset();
  };

  const save = (event) => {
    event.preventDefault();
    const item = { ...entry, date: new Date().toISOString() };

    if (folderKey === "create") {
      const name = newFolderName.trim();
      const key = name.replace(/\s+/g, "").toLowerCase();
      const label = name.charAt(0).toUpperCase() + name.slice(1);
      if (key === "") {
        setError(t("folderNameEmpty"));
      } else if (Object.prototype.hasOwnProperty.call(bookmarks, key)) {
        setError(t("folderExists", { name: label }));
      } else {
        changeBookmarks({ ...bookmarks, [key]: { name: label, entry: [item] } });
        handleClose(event);
      }
    } else if (Object.prototype.hasOwnProperty.call(bookmarks, folderKey)) {
      const folder = bookmarks[folderKey];
      const entries = (folder.entry || []).filter((el) => el.id != item.id);
      changeBookmarks({ ...bookmarks, [folderKey]: { name: folder.name, entry: [...entries, item] } });
      handleClose(event);
    }
  };

  const which = entry ? storedRefSource(entry, names, t("topicCollection")) || storedRefLabel(entry, names, t("topicCollection")) : "";
  const choose = (key) => {
    setFolderKey(key);
    setError("");
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={t("bookmark")}
      description={which}
      size="sm"
      actions={
        <>
          <DialogButton onClick={handleClose}>{t("cancel")}</DialogButton>
          <DialogButton variant="primary" type="submit" form={formId}>
            {t("add")}
          </DialogButton>
        </>
      }
    >
      <form id={formId} onSubmit={save} noValidate>
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>{t("chooseFolder")}</legend>
          <div className={styles.options}>
            {Object.keys(bookmarks).map((key) => {
              const checked = folderKey === key;
              return (
                <label key={key} className={`${styles.option} ${checked ? styles.checked : ""}`}>
                  <input type="radio" name="bookmark-folder" value={key} checked={checked} onChange={() => choose(key)} />
                  <span className={styles.icon}>
                    <FolderIcon />
                  </span>
                  <span className={styles.text}>
                    <span className={styles.name}>{folderLabel(key, bookmarks[key], t)}</span>
                    <span className={styles.meta}>{t("folderCount", { count: formatNumber((bookmarks[key].entry || []).length) })}</span>
                  </span>
                  <span className={styles.mark} aria-hidden="true">
                    {checked && <CheckIcon />}
                  </span>
                </label>
              );
            })}
            <label className={`${styles.option} ${folderKey === "create" ? styles.checked : ""}`}>
              <input type="radio" name="bookmark-folder" value="create" checked={folderKey === "create"} onChange={() => choose("create")} />
              <span className={`${styles.icon} ${styles.iconNew}`}>
                <PlusIcon />
              </span>
              <span className={styles.text}>
                <span className={styles.name}>{t("createFolder")}</span>
              </span>
              <span className={styles.mark} aria-hidden="true">
                {folderKey === "create" && <CheckIcon />}
              </span>
            </label>
          </div>
        </fieldset>

        {folderKey === "create" && (
          <input
            type="text"
            name="create"
            className={styles.input}
            autoComplete="off"
            autoFocus
            maxLength={60}
            value={newFolderName}
            placeholder={t("folderName")}
            aria-label={t("folderName")}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? errorId : undefined}
            onChange={(event) => {
              setNewFolderName(event.target.value);
              setError("");
            }}
          />
        )}
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      </form>
    </Dialog>
  );
}
