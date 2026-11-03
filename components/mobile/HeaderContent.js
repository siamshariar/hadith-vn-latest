import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Container from "../core/container";
import BackIcon from "../icons/NavigateBefore";
import SearchIcon from "../icons/Search";
import LanguageMenu from "../core/LanguageMenu";
import { useLocale } from "../../contexts/LocaleContext";
import styles from "./Header.module.scss";

// Header of the plain text pages (phones and tablets): back, the page
// title, the language menu (the globe) and search.
// `titleKey` is an interface string (lib/i18n).
export default function HeaderMobile({ title, titleKey }) {
  const router = useRouter();
  const { t } = useLocale();

  const [historyLength, setHistoryLength] = useState(0);

  useEffect(() => {
    setHistoryLength(window.history.length);
  }, []);

  return (
    <div className={styles.header}>
      <Container>
        <div className={styles.wrapper}>
          <div className={`${styles.left} ${styles.grow}`}>
            <button
              type="button"
              className={styles.icon}
              aria-label={t("goBack")}
              onClick={historyLength > 2 ? () => router.back() : () => router.push("/")}
            >
              <BackIcon />
            </button>
            <span className={styles.title}>{titleKey ? t(titleKey) : title}</span>
          </div>

          <div className={styles.right}>
            <LanguageMenu variant="phone" />
            <Link href="/search" className={styles.icon} aria-label={t("search")}>
              <SearchIcon />
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}
