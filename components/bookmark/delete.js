import { useContext, useRef } from "react";
import { BookmarkContext, folderLabel } from "../../contexts/BookmarkContext";
import { useLocale } from "../../contexts/LocaleContext";
import Dialog, { DialogButton } from "../core/Dialog";

// Deletes a bookmark folder (not the default one) with its bookmarks: the question, Cancel,
// then Delete in the error colour.
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
    <Dialog
      open={open}
      onClose={closer(false)}
      size="sm"
      title={t("deleteFolderTitle")}
      description={t("deleteFolderText", { name: name.current })}
      actions={
        <>
          <DialogButton onClick={closer(false)}>{t("cancel")}</DialogButton>
          <DialogButton variant="danger" onClick={handleDeleteBookmark}>
            {t("remove")}
          </DialogButton>
        </>
      }
    />
  );
}
