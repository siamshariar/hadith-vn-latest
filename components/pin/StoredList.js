import { useContext, useRef } from "react";
import { useRouter } from "next/router";
import { PinContext } from "../../contexts/PinContext";
import { useLocale } from "../../contexts/LocaleContext";
import useNames from "../../hooks/useNames";
import { storedRefHref, storedRefLabel, storedRefSource } from "../../lib/hadith";
import PinIcon from "../icons/Pin";
import AutoStoriesIcon from "../icons/AutoStories";
import CloseIcon from "../icons/Close";
import styles from "./list.module.scss";

// `locale` is the interface locale from useLocale() (BCP 47, e.g. vi-VN, bn-BD).
const formatDate = (date, locale) => {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "";
  const today = new Date().toDateString() === value.toDateString();
  const options = today
    ? { hour: "numeric", minute: "numeric" }
    : { year: "numeric", month: "long", day: "numeric" };
  return value.toLocaleString(locale, options);
};

// Pinned hadiths (kind="pin") or the last-read history (kind="lastRead").
// Entries are references (id, book, number); they open the current pages.
// Books are named in the reader's language (lib/names).
export default function StoredList({ kind, controller }) {
  const { pin, lastRead, archived, removePin } = useContext(PinContext);
  const list = useRef(null);
  const router = useRouter();
  const { t, lang, locale } = useLocale();
  const names = useNames(lang);
  const isPin = kind === "pin";
  const items = (isPin ? pin : lastRead) || [];
  const archivedCount = (archived && archived[kind]) || 0;
  const Icon = isPin ? PinIcon : AutoStoriesIcon;

  const open = (event, href) => {
    // Cmd, Ctrl or Shift: a new tab or window, the browser's to open
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (controller) controller(false)(event);
    router.push(href);
  };

  // Unpinned from the list: the focus moves to the row that takes its place (or the one above),
  // not to the top of the page.
  const unpin = (item, index) => {
    removePin(item);
    requestAnimationFrame(() => {
      const links = list.current ? list.current.querySelectorAll("a") : [];
      const next = links[index] || links[index - 1];
      if (next) next.focus();
    });
  };

  return (
    <div className={styles.content}>
      {archivedCount > 0 && <p className={styles.archived}>{t("legacyArchived", { count: archivedCount })}</p>}

      <div className={styles.lists} ref={list}>
        {items.map((item, index) => {
          const href = storedRefHref(item, { preferContext: isPin });
          const label = storedRefLabel(item, names, t("topicCollection"));
          const source = storedRefSource(item, names, t("topicCollection"));
          return (
            <div key={item.id} className={`${styles.item} ${isPin ? styles.withAction : ""}`}>
              <a href={href} className={styles.link} onClick={(event) => open(event, href)}>
                <span className={styles.left}>
                  <span className={styles.icon}>
                    <Icon />
                  </span>
                  <span className={styles.desc}>
                    <span className={styles.hadith_title} dir="auto">
                      {label}
                    </span>
                    {source && source !== label && <span className={styles.source_info}>{source}</span>}
                    {!isPin && item.date && <span className={styles.time}>{formatDate(item.date, locale)}</span>}
                  </span>
                </span>
              </a>
              {isPin && (
                <button
                  type="button"
                  className={styles.delete_icon}
                  onClick={() => unpin(item, index)}
                  aria-label={`${t("unpin")}: ${label}`}
                  title={t("unpin")}
                >
                  <CloseIcon />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {items.length === 0 && <p className={styles.no_record}>{isPin ? t("noPins") : t("noLastRead")}</p>}
    </div>
  );
}
