import { useContext, useEffect, useState } from "react";
import Skeleton from "react-loading-skeleton";
import { BookmarkContext, folderLabel } from "../../contexts/BookmarkContext";
import { useLocale } from "../../contexts/LocaleContext";
import { ApiError, getHadith } from "../../lib/api";
import HadithCard, { HadithCardSkeleton } from "../hadith/HadithCard";
import ErrorState, { EmptyState } from "../core/error";
import styles from "./page.module.scss";

// A bookmark folder. Entries only hold ids and numbers; every hadith is
// fetched from the API in the reader's language, so nothing stale is shown.
export default function BookmarkContent({ folderKey }) {
  const { bookmarks, changeBookmarks, archived, loaded } = useContext(BookmarkContext);
  const { t, lang } = useLocale();
  const folder = bookmarks && folderKey ? bookmarks[folderKey] : null;
  const entries = (folder && folder.entry) || [];
  const ids = entries.map((entry) => entry.id).join(",");

  // id -> { hadith } | { error }
  const [items, setItems] = useState({});
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setItems({});
  }, [lang]);

  useEffect(() => {
    let active = true;
    const missing = entries.filter((entry) => !items[entry.id]);
    if (!missing.length) return undefined;
    Promise.all(
      missing.map((entry) =>
        getHadith(entry.id, lang)
          .then((hadith) => [entry.id, { hadith }])
          .catch((error) => [entry.id, { error }])
      )
    ).then((results) => {
      if (!active) return;
      setItems((previous) => {
        const next = { ...previous };
        results.forEach(([id, value]) => {
          next[id] = value;
        });
        return next;
      });
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, lang, attempt]);

  const removeEntry = (id) => {
    if (!folder) return;
    changeBookmarks({
      ...bookmarks,
      [folderKey]: { name: folder.name, entry: entries.filter((entry) => entry.id != id) },
    });
  };

  const retry = (id) => {
    setItems((previous) => {
      const next = { ...previous };
      delete next[id];
      return next;
    });
    setAttempt((value) => value + 1);
  };

  if (!loaded) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.content}>
          <Skeleton height={29} width="100%" />
          <HadithCardSkeleton count={2} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.content}>
        <div className={styles.title}>
          <h1 className={styles.title_text}>{folder ? folderLabel(folderKey, folder, t) : folderKey}</h1>
        </div>

        {archived > 0 && <p className={styles.notice}>{t("legacyArchived", { count: archived })}</p>}

        {!folder ? (
          <EmptyState>{t("bookmarkFolderMissing")}</EmptyState>
        ) : entries.length === 0 ? (
          <EmptyState>{t("noBookmarks")}</EmptyState>
        ) : (
          <div className={styles.items}>
            {entries.map((entry) => {
              const item = items[entry.id];
              if (!item) {
                return (
                  <div className={styles.item} key={entry.id}>
                    <HadithCardSkeleton count={1} />
                  </div>
                );
              }
              if (item.error) {
                const missing = item.error instanceof ApiError && item.error.status === 404;
                return (
                  <div className={styles.item} key={entry.id}>
                    {missing ? (
                      <EmptyState icon={false}>
                        {t("notFoundHadith")}{" "}
                        <button type="button" className={styles.remove} onClick={() => removeEntry(entry.id)}>
                          {t("remove")}
                        </button>
                      </EmptyState>
                    ) : (
                      <ErrorState error={item.error} onRetry={() => retry(entry.id)} compact />
                    )}
                  </div>
                );
              }
              return (
                <div className={styles.item} key={entry.id}>
                  <HadithCard
                    hadith={item.hadith}
                    book={item.hadith.book}
                    headingLevel={2}
                    isBookmarkPage
                    updateBookmarksData={() => {}}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
