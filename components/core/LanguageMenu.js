import { useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import Drawer from "@mui/material/Drawer";
import Popover from "@mui/material/Popover";
import MenuList from "@mui/material/MenuList";
import MenuItem from "@mui/material/MenuItem";
import Skeleton from "react-loading-skeleton";
import { useLocale } from "../../contexts/LocaleContext";
import useApi from "../../hooks/useApi";
import { getLanguages } from "../../lib/api";
import { catalogName, loadedCatalog } from "../../lib/i18n";
import { compareLanguages } from "../../lib/language";
import ErrorState from "./error";
import LanguageIcon from "../icons/Language";
import CheckIcon from "../icons/Check";
import CloseIcon from "../icons/Close";
import SearchIcon from "../icons/Search";
import styles from "./LanguageMenu.module.scss";

// Names in the Arabic script (Urdu, Persian, Uyghur ...) get the Arabic face and size.
const ARABIC_SCRIPT = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

// For the filter: case and diacritics ignored ("viet" finds "Tiếng Việt").
const fold = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();

const capitalize = (text) => (text ? text.charAt(0).toLocaleUpperCase() + text.slice(1) : text);

// The language menu in the header of every site: "Tiếng Việt ▾" with a globe in the desktop
// header (variant "desktop"), the globe alone in the phone headers ("phone"), a place in the
// foot of the navigation drawer ("foot", NavDrawer styles it), a row of a menu ("menu"). It lists every language of the API (/hadith/languages, loaded when it
// opens): its own name, then its name in the interface (the catalog's, else the API's English
// one) and how many hadiths are translated, with a filter. Choosing one saves it (hadith_lang)
// and shows the page in it: the translation, the book names, and the interface
// when there is a catalog for it (lib/language.js interfaceFor); when there is none, the
// current row says which interface stays. Desktop: a panel under the button; phones: a
// full-height sheet.
export default function LanguageMenu({ variant = "desktop", className = "" }) {
  const router = useRouter();
  const { t, ui, lang, languageInfo, languageName, setLanguage } = useLocale();
  const [anchor, setAnchor] = useState(null);
  const [query, setQuery] = useState("");
  // Phones: the current language gets the focus, and stays in view, until the reader types
  // (no keyboard over the list); desktop: the filter does.
  const [focusCurrent, setFocusCurrent] = useState(true);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const panelId = `language-menu-${useId().replace(/:/g, "")}`;
  const sheet = variant !== "desktop";
  const open = Boolean(anchor);
  const { data, error, loading, retry } = useApi("languages", () => getLanguages(), { enabled: open });

  // The site's language, English, then by name (lib/language.js compareLanguages).
  const languages = useMemo(() => (Array.isArray(data) ? [...data].sort(compareLanguages) : []), [data]);
  const name = (languageInfo && (languageInfo.nativeName || languageInfo.name)) || (loadedCatalog(lang) || {}).nativeName || languageName(lang);
  const label = t("labelValue", { label: t("language"), value: name });
  // Its name in the interface: "Tiếng Anh", "Bengali".
  const interfaceName = (language) => capitalize(languageName(language.code, language.name));

  const needle = fold(query.trim());
  const shown = needle
    ? languages.filter((language) =>
        [language.code, language.name, language.nativeName, interfaceName(language)].some((value) => fold(value).includes(needle))
      )
    : languages;

  const openMenu = (event) => {
    setQuery("");
    setFocusCurrent(true);
    setAnchor(event.currentTarget);
  };
  const close = () => setAnchor(null);
  const choose = (code) => {
    close();
    if (code === lang && router.query.lang === undefined) return;
    setLanguage(code);
  };

  const filter = (
    <div className={styles.searchRow}>
      <span className={styles.searchIcon} aria-hidden="true">
        <SearchIcon />
      </span>
      <input
        ref={inputRef}
        type="search"
        className={styles.search}
        value={query}
        onChange={(event) => {
          setFocusCurrent(false);
          setQuery(event.target.value);
        }}
        onKeyDown={(event) => {
          // Down to the list; Enter takes the only match.
          if (event.key === "ArrowDown" && listRef.current) {
            const first = listRef.current.querySelector('[role="menuitemradio"]');
            if (first) {
              event.preventDefault();
              first.focus();
            }
          } else if (event.key === "Enter" && needle && shown.length === 1) {
            event.preventDefault();
            choose(shown[0].code);
          }
        }}
        placeholder={t("translationsSearch")}
        aria-label={t("translationsSearch")}
        aria-controls={`${panelId}-list`}
        autoComplete="off"
        enterKeyHint="search"
      />
    </div>
  );

  const body = (
    <div className={styles.body}>
      {error && !languages.length ? (
        <ErrorState error={error} onRetry={retry} compact />
      ) : loading && !languages.length ? (
        <div className={styles.loading} aria-busy="true">
          <Skeleton count={6} height={44} />
        </div>
      ) : (
        <>
          <MenuList
            ref={listRef}
            id={`${panelId}-list`}
            aria-label={t("language")}
            className={styles.list}
            variant="selectedMenu"
            autoFocusItem={sheet && focusCurrent}
            disablePadding
          >
            {shown.map((language) => {
              const current = language.code === lang;
              const native = language.nativeName || language.name;
              const named = interfaceName(language);
              const count = language.totalTranslated || 0;
              return (
                <MenuItem
                  key={language.code}
                  role="menuitemradio"
                  aria-checked={current ? "true" : "false"}
                  selected={current}
                  onClick={() => choose(language.code)}
                  className={styles.item}
                  data-language={language.code}
                >
                  <span className={styles.names}>
                    <bdi className={`${styles.native} ${ARABIC_SCRIPT.test(native) ? styles.arabic : ""}`} lang={language.code} dir="auto">
                      {native}
                    </bdi>
                    <span className={styles.sub}>
                      {fold(named) !== fold(native) && (
                        <>
                          <bdi>{named}</bdi>
                          {" · "}
                        </>
                      )}
                      {language.code === "ar" ? t("languageOriginal", { count }) : t("translatedCount", { count })}
                    </span>
                    {/* No catalog for it: the interface stays the site's, on purpose. */}
                    {current && ui !== lang && (
                      <span className={styles.note} data-interface-note={ui}>
                        {t("interfaceIn", { language: catalogName(ui) })}
                      </span>
                    )}
                  </span>
                  <span className={styles.check} aria-hidden="true">
                    {current && <CheckIcon />}
                  </span>
                </MenuItem>
              );
            })}
          </MenuList>
          {needle && !shown.length && (
            <p className={styles.empty} role="status">
              {t("translationsNoMatch", { query: query.trim() })}
            </p>
          )}
        </>
      )}
    </div>
  );

  return (
    <>
      <button
        type="button"
        className={`${styles.button} ${styles[variant] || ""} ${className}`}
        onClick={openMenu}
        aria-label={label}
        title={variant === "menu" ? undefined : t("language")}
        aria-haspopup="dialog"
        aria-expanded={open ? "true" : "false"}
        aria-controls={open ? panelId : undefined}
        data-language-menu={lang}
      >
        <LanguageIcon />
        {variant === "desktop" && (
          <>
            <span className={styles.name} lang={lang}>
              {name}
            </span>
            <span className={styles.caret} aria-hidden="true" />
          </>
        )}
        {variant === "foot" && <span lang={lang}>{name}</span>}
        {variant === "menu" && (
          <span className={styles.text}>
            {t("labelColon", { label: t("language") })} <span lang={lang}>{name}</span>
          </span>
        )}
      </button>

      {sheet ? (
        <Drawer
          anchor="bottom"
          open={open}
          onClose={close}
          classes={{ paper: `${styles.paper} ${styles.sheet}` }}
          slotProps={{ paper: { id: panelId, role: "dialog", "aria-modal": true, "aria-labelledby": `${panelId}-title` } }}
        >
          <div className={styles.head}>
            <h2 id={`${panelId}-title`} className={styles.title}>
              {t("language")}
            </h2>
            <button type="button" className={styles.close} onClick={close} aria-label={t("close")} title={t("close")}>
              <CloseIcon />
            </button>
          </div>
          {filter}
          {body}
        </Drawer>
      ) : (
        <Popover
          open={open}
          anchorEl={anchor}
          onClose={close}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          disableScrollLock
          slotProps={{
            paper: { id: panelId, role: "dialog", "aria-label": t("language"), className: `${styles.paper} ${styles.popover}` },
            // Desktop: straight to the filter.
            transition: { onEntering: () => inputRef.current && inputRef.current.focus() },
          }}
        >
          {filter}
          {body}
        </Popover>
      )}
    </>
  );
}
