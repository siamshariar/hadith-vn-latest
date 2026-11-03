import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import Drawer from "@mui/material/Drawer";
import useMediaQuery from "@mui/material/useMediaQuery";
import Skeleton from "react-loading-skeleton";
import { useLocale } from "../../contexts/LocaleContext";
import useApi from "../../hooks/useApi";
import { getEditions, getLanguages } from "../../lib/api";
import { translatorName } from "../../lib/citation";
import { DEFAULT_LANGUAGE, compareLanguages, writeLanguageCookie } from "../../lib/language";
import {
  MAX_EXTRA_TRANSLATIONS,
  TRANSLATIONS_PARAM,
  parseTranslations,
  writeTranslationsCookie,
} from "../../lib/translations";
import ErrorState from "../core/error";
import ChevronDownIcon from "../icons/ChevronDown";
import ChevronUpIcon from "../icons/ChevronUp";
import CloseIcon from "../icons/Close";
import SearchIcon from "../icons/Search";
import SubtitlesIcon from "../icons/SubtitlesOutlined";
import styles from "./TranslationPicker.module.scss";

const capitalize = (text) => (text ? text.charAt(0).toLocaleUpperCase() + text.slice(1) : text);
// For search: case and diacritics ignored ("viet" finds "Tiếng Việt").
const fold = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();

// The language names the interface uses (Intl, in the browser only: the
// panel is never rendered on the server), else the API's English name.
function interfaceNames(ui, languages) {
  let display = null;
  try {
    display = ui === "en" ? null : new Intl.DisplayNames([ui], { type: "language" });
  } catch (_) {
    display = null;
  }
  const names = new Map();
  languages.forEach((language) => {
    let name = null;
    try {
      name = display ? display.of(language.code) : null;
    } catch (_) {
      name = null;
    }
    if (!name || name.toLowerCase() === language.code) name = language.name;
    names.set(language.code, capitalize(name));
  });
  // Two languages with one name (Kurdish and Kurmanji): add the API's name.
  const seen = new Map();
  names.forEach((name) => seen.set(name, (seen.get(name) || 0) + 1));
  languages.forEach((language) => {
    const name = names.get(language.code);
    if (seen.get(name) > 1 && name !== language.name) names.set(language.code, `${name} (${language.name})`);
  });
  return names;
}

// The translations chip ("Bản dịch: Tiếng Việt +1 ▾") and the panel it opens:
// the primary language plus up to two more, in the reader's order; a right
// drawer from 1024px, a full-height sheet below. Saving writes the
// hadith_lang and hadith_tr cookies and reloads the page's data, so the
// server renders the new translations; a one-off ?tr= is dropped.
// - translations: the extra languages the page shows;
// - book: the collection whose editions each row describes (null: mixed);
// - variant "bar": the compact chip of the reader bar.
export default function TranslationPicker({ translations, book = null, variant = "inline" }) {
  const router = useRouter();
  const { t, ui, lang, languageName, setLanguage, formatNumber } = useLocale();
  const extras = useMemo(() => parseTranslations(translations, lang), [translations, lang]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState([lang, ...extras]);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const wide = useMediaQuery("(min-width:1024px)", { noSsr: true });
  // A language moves between the lists when it is (un)ticked: its checkbox
  // keeps the keyboard focus in its new place.
  const refocus = useRef(null);
  useEffect(() => {
    if (!refocus.current || typeof document === "undefined") return;
    const box = document.getElementById(`tr-${variant}-${refocus.current}`);
    refocus.current = null;
    if (box) box.focus();
  }, [draft, variant]);

  const languagesState = useApi("languages", () => getLanguages(), { enabled: open });
  const editionsState = useApi("editions", () => getEditions(), { enabled: open });

  const primaryName = capitalize(languageName(lang));
  // The extra languages in the chip's accessible name ("+2 (Tiếng Bangla,
  // Tiếng Urdu)"): codes on the server, names once in the browser.
  const [extraNames, setExtraNames] = useState(null);
  const extrasKey = extras.join(",");
  useEffect(() => {
    const list = extrasKey ? extrasKey.split(",") : [];
    const named = interfaceNames(
      ui,
      list.map((code) => ({ code, name: languageName(code) }))
    );
    setExtraNames(list.map((code) => named.get(code)));
    // languageName is stable for a given code and interface
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extrasKey, ui]);

  const openPanel = () => {
    setDraft([lang, ...extras]);
    setQuery("");
    setShowAll(false);
    setOpen(true);
  };

  // Every way of closing keeps the choice (there is nothing to undo).
  const close = () => {
    setOpen(false);
    const [primary, ...rest] = draft;
    const nextExtras = parseTranslations(rest, primary);
    const changed = primary !== lang || nextExtras.join(",") !== extras.join(",");
    if (!changed) return;
    writeTranslationsCookie(nextExtras);
    const shared = router.query[TRANSLATIONS_PARAM] !== undefined;
    if (primary !== lang && !shared) {
      // Saves hadith_lang and reloads the page without a one-off ?lang=.
      setLanguage(primary);
      return;
    }
    const { [TRANSLATIONS_PARAM]: _shared, ...query } = router.query;
    if (primary !== lang) {
      writeLanguageCookie(primary);
      delete query.lang;
    }
    router.replace({ pathname: router.pathname, query }, undefined, { scroll: false });
  };

  const languages = useMemo(
    () => (Array.isArray(languagesState.data) ? languagesState.data.filter((item) => item.code !== "ar") : []),
    [languagesState.data]
  );
  const editions = Array.isArray(editionsState.data) ? editionsState.data : [];
  const names = useMemo(() => interfaceNames(ui, languages), [ui, languages]);
  const byCode = useMemo(() => new Map(languages.map((item) => [item.code, item])), [languages]);

  const editionOf = (code) => (book ? editions.find((edition) => edition.bookSlug === book && edition.languageCode === code) : null);
  const hasHadeethEnc = (code) => editions.some((edition) => edition.source === "hadeethenc" && edition.languageCode === code);
  const inCollection = (code) => !book || !editions.length || Boolean(editionOf(code));

  // "Muhsin Khan · 7.580 hadith": the translator when the source names one,
  // and how many hadiths of the collection the translation has.
  const editionLine = (code) => {
    if (!book) {
      const info = byCode.get(code);
      return info ? t("translatedCount", { count: formatNumber(info.totalTranslated || 0) }) : "";
    }
    if (!editions.length) return "";
    const edition = editionOf(code);
    if (edition) {
      return [translatorName(edition.author, edition), t("editionCount", { count: formatNumber(edition.totalHadith || 0) })]
        .filter(Boolean)
        .join(" · ");
    }
    return book !== "hadeethenc" && hasHadeethEnc(code) ? t("editionTopicOnly") : t("editionNone");
  };

  const full = draft.length >= MAX_EXTRA_TRANSLATIONS + 1;
  const nameOf = (code) => capitalize(languageName(code, byCode.get(code)));

  const add = (code) => {
    if (draft.includes(code) || full) return;
    refocus.current = code;
    setDraft([...draft, code]);
  };
  const remove = (code) => {
    if (draft.length < 2) return;
    refocus.current = code;
    setDraft(draft.filter((item) => item !== code));
  };
  const move = (index, offset) => {
    const target = index + offset;
    if (target < 0 || target >= draft.length) return;
    const next = [...draft];
    [next[index], next[target]] = [next[target], next[index]];
    // At the top or the bottom the button just pressed turns disabled and
    // drops the focus: it goes to the language's checkbox instead.
    if (target === 0 || target === draft.length - 1) refocus.current = draft[index];
    setDraft(next);
  };

  // The deployment's language, English, then the rest by name; the languages
  // the collection has no edition in wait behind "Hiện tất cả".
  const needle = fold(query.trim());
  const matches = (code) => {
    if (!needle) return true;
    const info = byCode.get(code);
    return [code, info && info.name, info && info.nativeName, names.get(code)].some((value) => fold(value).includes(needle));
  };
  // compareLanguages ranks the deployment's language, then English; the rest
  // go A–Z by the names the interface shows ("Tiếng Bangla" under B).
  const sortKey = (code) => fold(names.get(code) || code).replace(/^tieng\s+/, "");
  const rest = languages
    .map((item) => item.code)
    .filter((code) => !draft.includes(code))
    .sort((a, b) => compareLanguages({ code: a, name: sortKey(a) }, { code: b, name: sortKey(b) }));
  const pinned = (code) => code === DEFAULT_LANGUAGE || code === "en";
  const visible = rest.filter((code) => pinned(code) || inCollection(code));
  const hidden = rest.filter((code) => !pinned(code) && !inCollection(code));
  const listed = needle ? rest.filter(matches) : visible;
  const loading = (languagesState.loading && !languages.length) || (editionsState.loading && !editions.length);
  const failed = languagesState.error && !languages.length;

  const row = (code, selectedIndex) => {
    const selected = selectedIndex != null;
    const info = byCode.get(code);
    const native = info ? info.nativeName || info.name : code;
    const sub = names.get(code);
    const id = `tr-${variant}-${code}`;
    return (
      <li key={code} className={`${styles.row} ${selected ? styles.rowSelected : ""}`} data-language={code}>
        <label className={styles.option} htmlFor={id}>
          <input
            id={id}
            type="checkbox"
            className={styles.check}
            checked={selected}
            disabled={selected ? draft.length < 2 : full}
            onChange={() => (selected ? remove(code) : add(code))}
          />
          <span className={styles.names}>
            <span className={styles.native}>
              <bdi lang={code} dir="auto">
                {native}
              </bdi>
              {selectedIndex === 0 && <span className={styles.main}>{t("translationsMain")}</span>}
            </span>
            {sub && fold(sub) !== fold(native) && <span className={styles.sub}>{sub}</span>}
            <span className={styles.edition}>{editionLine(code)}</span>
          </span>
        </label>
        {selected && draft.length > 1 && (
          <span className={styles.order}>
            <button
              type="button"
              className={styles.orderButton}
              onClick={() => move(selectedIndex, -1)}
              disabled={selectedIndex === 0}
              aria-label={selectedIndex === 1 ? t("makeMain", { language: nameOf(code) }) : t("moveUp", { language: nameOf(code) })}
              title={selectedIndex === 1 ? t("makeMain", { language: nameOf(code) }) : t("moveUp", { language: nameOf(code) })}
            >
              <ChevronUpIcon />
            </button>
            <button
              type="button"
              className={styles.orderButton}
              onClick={() => move(selectedIndex, 1)}
              disabled={selectedIndex === draft.length - 1}
              aria-label={t("moveDown", { language: nameOf(code) })}
              title={t("moveDown", { language: nameOf(code) })}
            >
              <ChevronDownIcon />
            </button>
          </span>
        )}
      </li>
    );
  };

  const titleId = `translations-title-${variant}`;

  return (
    <>
      <button
        type="button"
        className={`${styles.chip} ${variant === "bar" ? styles.chipBar : ""}`}
        onClick={openPanel}
        aria-haspopup="dialog"
        aria-expanded={open ? "true" : "false"}
        data-translations={[lang, ...extras].join(",")}
      >
        <SubtitlesIcon />
        <span className={styles.chipPrefix}>{t("translationsChipPrefix")} </span>
        <span className={styles.chipName}>{primaryName}</span>
        {variant === "bar" && (
          <span className={styles.chipCode} aria-hidden="true">
            {lang.toUpperCase()}
          </span>
        )}
        {extras.length > 0 && (
          <span className={styles.chipCount}>
            +{extras.length}
            <span className="visually_hidden">
              {" "}
              ({(extraNames || extras.map((code) => code.toUpperCase())).join(", ")})
            </span>
          </span>
        )}
        <span className={styles.caret} aria-hidden="true" />
      </button>

      <Drawer
        anchor={wide ? "right" : "bottom"}
        open={open}
        onClose={close}
        classes={{ paper: `${styles.paper} ${wide ? styles.side : styles.sheet}` }}
        slotProps={{ paper: { role: "dialog", "aria-modal": true, "aria-labelledby": titleId } }}
      >
        <div className={styles.head}>
          <h2 id={titleId} className={styles.title}>
            {t("translationsTitle")}
          </h2>
          <button type="button" className={styles.close} onClick={close} aria-label={t("close")} title={t("close")}>
            <CloseIcon />
          </button>
        </div>

        <div className={styles.searchRow}>
          <span className={styles.searchIcon} aria-hidden="true">
            <SearchIcon />
          </span>
          <input
            type="search"
            className={styles.search}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("translationsSearch")}
            aria-label={t("translationsSearch")}
            autoComplete="off"
            enterKeyHint="search"
          />
        </div>

        <div className={styles.body}>
          <p className={styles.intro}>{t("translationsIntro", { count: MAX_EXTRA_TRANSLATIONS })}</p>

          {failed ? (
            <ErrorState
              error={languagesState.error}
              onRetry={() => {
                languagesState.retry();
                editionsState.retry();
              }}
              compact
            />
          ) : loading ? (
            <div className={styles.loading} aria-busy="true">
              <Skeleton count={5} height={44} />
            </div>
          ) : (
            <>
              <h3 className={styles.groupTitle}>{t("translationsSelected")}</h3>
              <ol className={styles.list} aria-label={t("translationsSelected")}>
                {draft.map((code, index) => row(code, index))}
              </ol>
              {full && <p className={styles.limit}>{t("translationsLimit", { count: MAX_EXTRA_TRANSLATIONS + 1 })}</p>}

              <h3 className={styles.groupTitle}>{t("translationsOthers")}</h3>
              {listed.length ? (
                <ul className={styles.list} aria-label={t("translationsOthers")}>
                  {listed.map((code) => row(code, null))}
                </ul>
              ) : (
                <p className={styles.empty}>{t("translationsNoMatch", { query: query.trim() })}</p>
              )}

              {!needle && hidden.length > 0 && !showAll && (
                <button type="button" className={styles.showAll} onClick={() => setShowAll(true)}>
                  {t("translationsShowAll", { count: formatNumber(hidden.length) })}
                </button>
              )}
              {!needle && showAll && hidden.length > 0 && (
                <>
                  <h3 className={styles.groupTitle}>{t("translationsNotInCollection")}</h3>
                  <ul className={styles.list} aria-label={t("translationsNotInCollection")}>
                    {hidden.map((code) => row(code, null))}
                  </ul>
                </>
              )}
            </>
          )}
        </div>

        <div className={styles.foot}>
          <button type="button" className={styles.done} onClick={close}>
            {t("translationsDone")}
          </button>
        </div>
      </Drawer>
    </>
  );
}
