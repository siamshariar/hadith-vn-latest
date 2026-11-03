import { useContext } from "react";
import { useRouter } from "next/router";
import { PinContext } from "../../contexts/PinContext";
import { useLocale } from "../../contexts/LocaleContext";
import useNames from "../../hooks/useNames";
import { storedRefHref, storedRefLabel, storedRefSource } from "../../lib/hadith";
import PinIcon from "../icons/Pin";
import AutoStoriesIcon from "../icons/AutoStories";
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
  const { pin, lastRead, archived } = useContext(PinContext);
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

  return (
    <div className={styles.content}>
      {archivedCount > 0 && <p className={styles.archived}>{t("legacyArchived", { count: archivedCount })}</p>}

      <div className={styles.lists}>
        {items.map((item) => {
          const href = storedRefHref(item, { preferContext: isPin });
          const label = storedRefLabel(item, names, t("topicCollection"));
          const source = storedRefSource(item, names, t("topicCollection"));
          return (
            <div key={item.id} className={styles.item}>
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
            </div>
          );
        })}
      </div>

      {items.length === 0 && <h2 className={styles.no_record}>{isPin ? t("noPins") : t("noLastRead")}</h2>}
    </div>
  );
}
