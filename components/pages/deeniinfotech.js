import { useLocale } from "../../contexts/LocaleContext";
import { DEENI_URL, EmailLinks } from "./about";
import css from "./style.module.scss";
import styles from "./about.module.scss";

export default function DeeniinfotechContent() {
  const { t } = useLocale();
  return (
    <div className={css.wrapper}>
      <div className={css.page_item}>
        <div className={styles.quran_content}>
          <h1 className={styles.title}>Deeni Info Tech</h1>
          <p>
            <a href={DEENI_URL} target="_blank" rel="noopener noreferrer">
              Deeni Info Tech
            </a>
            {t("labelColon", { label: "" })} {t("deeniText")}
          </p>
          <p>
            {t("labelColon", { label: t("website") })}{" "}
            <a href={DEENI_URL} target="_blank" rel="noopener noreferrer">
              www.DeeniInfoTech.com
            </a>
          </p>
          <EmailLinks emails={["deeniinfotech@gmail.com"]} />
        </div>
      </div>
    </div>
  );
}
