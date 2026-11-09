import { useLocale } from "../../contexts/LocaleContext";
import Breadcrumbs from "../core/breadcrumbs";
import page from "../content/Page.module.scss";
import styles from "./TextPage.module.scss";

// A text page's card (about, contact, settings…), as a reading page's: the trail, the title in
// the grey bar on the web, then the text. `narrow`: controls rather than prose (the settings), in a column.
export default function TextPage({ title, children, narrow = false }) {
  const { t } = useLocale();
  return (
    <div className={page.page}>
      <Breadcrumbs items={[{ href: "/", label: t("home") }, { label: title }]} />
      <header className={page.header}>
        <h1 className={page.title}>{title}</h1>
      </header>
      <div className={`${styles.body} ${narrow ? styles.narrow : ""}`}>{children}</div>
    </div>
  );
}
