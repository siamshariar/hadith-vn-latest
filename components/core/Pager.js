import Link from "next/link";
import { useLocale } from "../../contexts/LocaleContext";
import NavigateBefore from "../icons/NavigateBefore";
import NavigateNext from "../icons/NavigateNext";
import styles from "./Pager.module.scss";

// A list's one pagination, as on the Quran sites (quran-apps components/surah/pagination): under
// the content, the way back on the left and the way on on the right. Within a list they are its
// pages ("‹ Trước", "Sau ›", "Trang 2/6" between); at either end of a chapter, the chapter
// before or after it by name (`before`, `after`: { href, label }). Every step is a link (a
// static page, prefetched), so it is shared and reached with the back button like any page.
export default function Pager({ pagination, hrefFor, before = null, after = null, label }) {
  const { t, formatNumber } = useLocale();
  const page = (pagination && pagination.page) || 1;
  const last = (pagination && pagination.lastPage) || 1;
  const previous = page > 1 && hrefFor ? { href: hrefFor(page - 1), label: t("previous"), rel: "prev" } : before && { rel: "prev", ...before };
  const next = page < last && hrefFor ? { href: hrefFor(page + 1), label: t("next"), rel: "next" } : after && { rel: "next", ...after };
  if (!previous && !next) return null;

  return (
    <nav className={styles.pager} aria-label={label || t("page")}>
      <div className={styles.side}>
        {previous && (
          <Link href={previous.href} rel={previous.rel} className={styles.link}>
            <span className={styles.icon} aria-hidden="true">
              <NavigateBefore />
            </span>
            <span className={styles.text}>{previous.label}</span>
          </Link>
        )}
      </div>
      {last > 1 && (
        <span className={styles.count}>
          {t("page")} {formatNumber(page)}/{formatNumber(last)}
        </span>
      )}
      <div className={`${styles.side} ${styles.end}`}>
        {next && (
          <Link href={next.href} rel={next.rel} className={styles.link}>
            <span className={styles.text}>{next.label}</span>
            <span className={styles.icon} aria-hidden="true">
              <NavigateNext />
            </span>
          </Link>
        )}
      </div>
    </nav>
  );
}
