import { useRouter } from "next/router";
import { useLocale } from "../../contexts/LocaleContext";
import styles from "./error.module.scss";

const DEVELOPMENT = process.env.NODE_ENV !== "production";

// Shown when the hadith API fails. There is deliberately no local fallback
// content: the reader gets a clear message and a way to retry.
export default function ErrorState({ error, onRetry, compact = false }) {
  const router = useRouter();
  const { t } = useLocale();

  const retry = onRetry || (() => router.replace(router.asPath, undefined, { scroll: false }));

  return (
    <div className={`${styles.error} ${compact ? styles.compact : ""}`} role="alert">
      <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-2h2v2Zm0-4h-2V7h2v6Z" />
      </svg>
      <h2 className={styles.title}>{t("errorTitle")}</h2>
      {!compact && <p className={styles.message}>{t("errorMessage")}</p>}
      {/* the API's own words are English and technical: for the developer, not the reader */}
      {DEVELOPMENT && error && error.message && <p className={styles.detail}>{error.message}</p>}
      <button type="button" className={styles.retry} onClick={retry}>
        {t("retry")}
      </button>
    </div>
  );
}

export function EmptyState({ children, icon = true }) {
  return (
    <div className={styles.empty}>
      {icon && (
        <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 5c-1.1-.35-2.3-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1Zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5Z" />
        </svg>
      )}
      <div className={styles.emptyText}>{children}</div>
    </div>
  );
}
