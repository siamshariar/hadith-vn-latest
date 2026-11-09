import { useState, useContext } from "react";
import Link from "next/link";
import { BookmarkContext, folderLabel } from "../../contexts/BookmarkContext";
import { useLocale } from "../../contexts/LocaleContext";
import FolderIcon from "../icons/Folder";
import DeleteIcon from "../icons/DeleteOutline";
import DeleteBookmark from "./delete";
import styles from "./list.module.scss";

// The bookmark folders: in the header's dialog (`controller` closes it when a folder opens; one
// column) and on the saved page (components/mobile/StorageBookmark; two columns from 600px).
// A folder opens its page; each but the default one can be deleted, after a question.
export default function BookmarkList({ controller, single = false }) {
  const { bookmarks } = useContext(BookmarkContext);
  const { t, formatNumber } = useLocale();
  const [deleteBookmarkOpen, setDeleteBookmarkOpen] = useState(false);
  const [bookmarkKey, setBookmarkKey] = useState("");

  const handleDeleteBookmark = (event, key) => {
    event.preventDefault();
    event.stopPropagation();
    setBookmarkKey(key);
    setDeleteBookmarkOpen(true);
  };

  const handleBookmarkClose = (open) => (event) => {
    if (event && event.type === "keydown" && (event.key === "Tab" || event.key === "Shift")) return;
    setDeleteBookmarkOpen(open);
  };

  const keys = bookmarks ? Object.keys(bookmarks) : [];

  return (
    <>
      <div className={styles.content}>
        {keys.length > 0 ? (
          <ul className={`${styles.lists} ${single ? styles.single : ""}`}>
            {keys.map((key) => {
              const name = folderLabel(key, bookmarks[key], t);
              return (
                <li key={key} className={`${styles.item} ${key !== "favorites" ? styles.withAction : ""}`}>
                  <Link
                    href={`/bookmarks?key=${encodeURIComponent(key)}`}
                    className={styles.link}
                    onClick={(event) => controller && controller(false)(event)}
                  >
                    <span className={styles.icon}>
                      <FolderIcon />
                    </span>
                    <span className={styles.desc}>
                      <span className={styles.name}>{name}</span>
                      <span className={styles.meta}>{t("folderCount", { count: formatNumber((bookmarks[key].entry || []).length) })}</span>
                    </span>
                  </Link>

                  {key !== "favorites" && (
                    <button
                      type="button"
                      className={styles.delete_icon}
                      onClick={(event) => handleDeleteBookmark(event, key)}
                      aria-label={t("deleteFolder", { name })}
                      title={t("deleteFolder", { name })}
                    >
                      <DeleteIcon />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className={styles.no_record}>
            <span className={styles.emptyIcon}>
              <FolderIcon />
            </span>
            <p>{t("noFolders")}</p>
          </div>
        )}
      </div>

      <DeleteBookmark open={deleteBookmarkOpen} closer={handleBookmarkClose} bookmarkKey={bookmarkKey} />
    </>
  );
}
