import Link from "next/link";
import { useLocale } from "../../contexts/LocaleContext";
import { server } from "../../lib/config";
import JsonLd from "./JsonLd";
import styles from "./breadcrumbs.module.scss";

// items: [{ href, label }]; the last item is the current page and is not a link. The trail is
// also given to search engines (schema.org BreadcrumbList), which show it under the result.
export default function Breadcrumbs({ items = [] }) {
  const { t } = useLocale();
  if (!items.length) return null;
  const trail = items
    .filter((item) => typeof item.label === "string" && item.label)
    .map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: item.href === "/" ? server : `${server}${item.href}` } : {}),
    }));

  return (
    <>
      {trail.length > 1 && <JsonLd id="breadcrumbs" data={{ "@type": "BreadcrumbList", itemListElement: trail }} />}
      <nav className={styles.breadcrumbs} aria-label={t("breadcrumb")}>
        <ol>
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <li key={`${item.href || "current"}-${index}`}>
                {isLast || !item.href ? (
                  <span aria-current={isLast ? "page" : undefined}>{item.label}</span>
                ) : (
                  <Link href={item.href}>{item.label}</Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
