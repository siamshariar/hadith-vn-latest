import Link from "next/link";
import { useLocale } from "../../contexts/LocaleContext";
import { site } from "../../lib/sites";
import styles from "./Footer.module.scss";

// Site footer on every layout and screen size: the site links, copyright
// and credit. Compact on phones, one row on desktop.
export default function FooterWeb() {
  const { t } = useLocale();
  const links = [
    { href: "/sources", label: t("dataAndMethod") },
    { href: "/about", label: t("about") },
    { href: "/support", label: t("support") },
    { href: "/grateful", label: t("grateful") },
    { href: "/contact", label: t("contact") },
    { href: "/privacy-policy", label: t("privacyPolicy") },
  ];

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.bottom}>
          <nav className={styles.nav} aria-label={t("footerLinks")}>
            <ul className={styles.menu}>
              {links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <p className={styles.copyright}>
            {/* the server (UTC) and the reader's clock can be in different years */}
            <span suppressHydrationWarning>&copy; {new Date().getFullYear()} </span>
            <Link href="/about">{site.siteName}</Link>
            <span>. {t("allRightsReserved")}</span>
          </p>

          <p className={styles.credit}>
            {t("poweredBy")}{" "}
            <a href="http://deeniinfotech.com/" target="_blank" rel="noopener noreferrer">
              Deeni Info Tech
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
