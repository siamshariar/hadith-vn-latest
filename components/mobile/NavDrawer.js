import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Drawer from "@mui/material/Drawer";
import BookmarkIcon from "../icons/BookmarkBorder";
import CloseIcon from "../icons/Close";
import SettingsIcon from "../icons/SettingsOutlined";
import { Nav } from "../sidebar";
import { useLocale } from "../../contexts/LocaleContext";
import styles from "./NavDrawer.module.scss";

// The navigation on phones and tablets: a drawer from the left, the same contents as the web's
// side card, at most 380px wide, and always leaving 44px of the page to tap. Esc, ✕ or a tap on
// the page closes it, and a link followed (the layout, and this drawer, stay mounted). Under
// the list, the site's other pages; at its foot Saved and the settings, so each is
// within reach from any page.
export default function NavDrawer({ open, onClose, where = {}, onSettings }) {
  const router = useRouter();
  const { t, lang } = useLocale();
  const latest = useRef({ open, onClose });
  latest.current = { open, onClose };
  useEffect(() => {
    const close = () => {
      if (latest.current.open) latest.current.onClose();
    };
    router.events.on("routeChangeStart", close);
    router.events.on("hashChangeStart", close);
    return () => {
      router.events.off("routeChangeStart", close);
      router.events.off("hashChangeStart", close);
    };
  }, [router]);

  const links = [
    { href: "/sources", label: t("dataAndMethod") },
    { href: "/about", label: t("about") },
    { href: "/support", label: t("support") },
    { href: "/grateful", label: t("grateful") },
    { href: "/contact", label: t("contact") },
    { href: "/privacy-policy", label: t("privacyPolicy") },
  ];

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      classes={{ root: styles.root, paper: styles.paper }}
      slotProps={{ paper: { role: "dialog", "aria-modal": true, "aria-label": `${t("books")} / ${t("categories")}` } }}
    >
      <button type="button" className={styles.close} onClick={onClose} aria-label={t("close")} title={t("close")}>
        <CloseIcon />
      </button>
      <div className={styles.body}>
        <Nav
          key={lang}
          {...where}
          after={
            <ul className={styles.links} aria-label={t("footerLinks")}>
              {links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          }
        />
      </div>
      <div className={styles.foot}>
        <Link href="/bookmarks">
          <BookmarkIcon />
          <span>{t("savedLists")}</span>
        </Link>
        <button
          type="button"
          onClick={() => {
            onClose();
            if (onSettings) onSettings();
          }}
          aria-haspopup="dialog"
        >
          <SettingsIcon />
          <span>{t("settings")}</span>
        </button>
      </div>
    </Drawer>
  );
}
