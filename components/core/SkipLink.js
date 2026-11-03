import { useLocale } from "../../contexts/LocaleContext";
import styles from "./SkipLink.module.scss";

// "Skip to main content": the first stop for the keyboard on every page, so a reader
// does not tab through the header and the whole sidebar tree before the text. It
// targets the layouts' <main id="viewport" tabIndex={-1}>.
export default function SkipLink() {
  const { t } = useLocale();
  return (
    <a href="#viewport" className={styles.skip}>
      {t("skipToContent")}
    </a>
  );
}
