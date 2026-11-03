import { useState } from "react";
import { useRouter } from "next/router";
import SearchIcon from "../icons/Search";
import { useLocale } from "../../contexts/LocaleContext";
import useSubmitBusy from "../../hooks/useSubmitBusy";
import { MIN_SEARCH_LENGTH } from "../../lib/api";
import styles from "./search.module.scss";

// "Go to hadith": "Bukhari 1", "Muslim 8a" ... resolved by /search (?go=),
// which opens the hadith or explains what was not found. With `book`, only
// a number is needed ("8a"). Works as a plain GET form without JS too.
export function GoToHadith({ book = "", compact = false }) {
  const router = useRouter();
  const { t } = useLocale();
  const [value, setValue] = useState("");
  // Pressing "Đi" with nothing typed says what to type.
  const [hint, setHint] = useState(false);
  const [busy, startBusy] = useSubmitBusy();
  const id = book ? `go-${book}` : "go-hadith";

  const submit = (event) => {
    event.preventDefault();
    const go = value.trim();
    if (!go) {
      setHint(true);
      return;
    }
    startBusy();
    router.push({ pathname: "/search", query: book ? { go, book } : { go } });
  };

  return (
    <form action="/search" method="get" className={`${styles.goTo} ${compact ? styles.goCompact : ""}`} onSubmit={submit}>
      <label className={styles.goLabel} htmlFor={id}>
        {book ? t("goToNumber") : t("goToHadith")}
      </label>
      <div className={styles.goField}>
        <input
          id={id}
          type="text"
          name="go"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setHint(false);
          }}
          placeholder={book ? t("numberPlaceholder") : t("goToPlaceholder")}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          inputMode={book ? "text" : undefined}
          enterKeyHint="go"
          aria-describedby={hint ? `${id}-hint` : undefined}
        />
        {book && <input type="hidden" name="book" value={book} />}
        <button type="submit" aria-busy={busy || undefined}>
          {t("goButton")}
        </button>
      </div>
      {hint && (
        <p id={`${id}-hint`} className={styles.goHint} role="alert">
          {book ? t("numberHelp") : t("referenceHelp")}
        </p>
      )}
    </form>
  );
}

// The main search box (home). A reference typed here ("Bukhari 1") also opens
// the hadith directly.
export default function HomeSearch() {
  const router = useRouter();
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const [busy, startBusy] = useSubmitBusy();

  const submit = (event) => {
    event.preventDefault();
    const q = query.trim();
    if (q.length < MIN_SEARCH_LENGTH) return;
    startBusy();
    router.push({ pathname: "/search", query: { q } });
  };

  return (
    <div className={styles.parent}>
      <form action="/search" method="get" role="search" className={styles.search} onSubmit={submit}>
        <span className={styles.icon} aria-hidden="true">
          <SearchIcon />
        </span>
        <input
          type="search"
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("search")}
          minLength={MIN_SEARCH_LENGTH}
          autoComplete="off"
          enterKeyHint="search"
        />
        <button type="submit" aria-busy={busy || undefined}>
          {t("searchButton")}
        </button>
      </form>
      <GoToHadith />
    </div>
  );
}
