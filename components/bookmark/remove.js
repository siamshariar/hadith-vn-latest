"use client";

import { useContext } from "react";
import { BookmarkContext, folderLabel } from "../../contexts/BookmarkContext";
import { useLocale } from "../../contexts/LocaleContext";
import Dialog, { DialogButton } from "../core/Dialog";

// "Remove the bookmark?": the question, Cancel, then Remove in the error colour.
export default function RemoveBookmark({ open, closer, hadith, updateBookmarksData, bookmarkKey, isBookmarkPage }) {
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
    <Dialog
      open={open}
      onClose={closer(false)}
      size="sm"
      title={t("removeBookmarkTitle")}
      description={t("removeBookmarkText", { name: folderLabel(bookmarkKey, bookmarks[bookmarkKey], t) })}
      actions={
        <>
          <DialogButton onClick={closer(false)}>{t("cancel")}</DialogButton>
          <DialogButton variant="danger" onClick={handleRemoveBookmark}>
            {t("remove")}
          </DialogButton>
        </>
      }
    />
  );
}
