import { useState, useContext } from "react";
import { BookmarkContext, folderLabel } from "../../contexts/BookmarkContext";
import { useLocale } from "../../contexts/LocaleContext";
import { useRouter } from "next/router";
import FolderIcon from "../icons/Folder";
import CloseIcon from "../icons/Close";
import DeleteBookmark from "./delete";
import styles from "./list.module.scss";

// The bookmark folders in the desktop header's dialog; a folder opens its page.
export default function BookmarkList({ controller }) {
  const { bookmarks } = useContext(BookmarkContext);
  const { t } = useLocale();
  const router = useRouter();

  const handleClick = (e, href) => {
    e.preventDefault();
    controller(false)(e);
    router.push(href);
  };

  const [deleteBookmarkOpen, setDeleteBookmarkOpen] = useState(false);
  const [bookmarkKey, setBookmarkKey] = useState("");

  const handleDeleteBookmark = (e, key) => {
    setBookmarkKey(key);
    setDeleteBookmarkOpen(true);
  };

  const handleBookmarkClose = (open) => (event) => {
    if (
      event.type === "keydown" &&
      (event.key === "Tab" || event.key === "Shift")
    ) {
      return;
    }
    setDeleteBookmarkOpen(open);
  };

  return (
    <>
      <div className={styles.content}>
        <div className={styles.lists}>
          {Object.keys(bookmarks).map((key) => {
            const name = folderLabel(key, bookmarks[key], t);
            const href = `/bookmarks?key=${encodeURIComponent(key)}`;
            return (
              <div key={key} className={styles.item}>
                <a href={href} className={styles.link} onClick={(e) => handleClick(e, href)}>
                  <div className={styles.left}>
                    <span className={styles.icon}>
                      <FolderIcon />
                    </span>
                    <span className={styles.desc}>
                      <span>{name}</span>
                      <span>{t("folderCount", { count: (bookmarks[key].entry || []).length })}</span>
                    </span>
                  </div>
                </a>

                {key !== "favorites" && (
                  <button
                    type="button"
                    className={styles.delete_icon}
                    onClick={(e) => handleDeleteBookmark(e, key)}
                    aria-label={t("deleteFolder", { name })}
                    title={t("deleteFolder", { name })}
                  >
                    <CloseIcon />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <DeleteBookmark
        open={deleteBookmarkOpen}
        closer={handleBookmarkClose}
        bookmarkKey={bookmarkKey}
      />
    </>
  );
}
