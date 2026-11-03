import { useState } from "react";
import Link from "next/link";
import { useLocale } from "../../contexts/LocaleContext";
import SearchIcon from "../icons/Search";
import homeStyles from "./Home.module.scss";
import styles from "./LanguageDirectory.module.scss";

// Names in the Arabic script (Urdu, Persian, Uyghur ...) get the Arabic face and size.
const ARABIC_SCRIPT = /[\u0600-\u06ff\u0750-\u077f\ufb50-\ufdff\ufe70-\ufeff]/;

// For search: case and diacritics ignored ("viet" finds "Tiếng Việt").
const fold = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();

// The languages of /hadith/languages for the directory, most translated first.
export function directoryLanguages(languages) {
  return (Array.isArray(languages) ? languages : [])
    .map(({ code, name, nativeName, direction, totalTranslated }) => ({
      code,
      name: name || code,
      nativeName: nativeName || name || code,
      direction: direction || "auto",
      totalTranslated: totalTranslated || 0,
    }))
    .sort((a, b) => b.totalTranslated - a.totalTranslated || a.name.localeCompare(b.name));
}

// The home page of an international site: every content language, with its own name, its
// English name and how many hadiths it has. Each opens the home page in that language
// (?lang=, so the link works and can be shared as it is) and saves it as the reader's
// preference (hadith_lang). Phones and tablets get a filter: the list is long there.
export default function LanguageDirectory({ languages }) {
  const { t, lang, rememberLanguage } = useLocale();
  const [query, setQuery] = useState("");
  const needle = fold(query.trim());
  const shown = needle
    ? languages.filter((language) => [language.code, language.name, language.nativeName].some((value) => fold(value).includes(needle)))
    : languages;

  return (
    <section className={homeStyles.section} aria-labelledby="home-languages">
      <div className={homeStyles.sectionHead}>
        <h2 id="home-languages" className={homeStyles.sectionTitle}>
          {t("languagesTitle")}
        </h2>
      </div>
      <p className={styles.intro}>{t("languagesIntro", { count: languages.length })}</p>

      <div className={styles.filter}>
        <span className={styles.filterIcon} aria-hidden="true">
          <SearchIcon />
        </span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("translationsSearch")}
          aria-label={t("translationsSearch")}
          aria-controls="language-directory"
          autoComplete="off"
          enterKeyHint="search"
        />
      </div>

      <ul id="language-directory" className={styles.list} aria-labelledby="home-languages">
        {shown.map((language) => {
          const current = language.code === lang;
          const count = language.totalTranslated;
          return (
            <li key={language.code} className={styles.item}>
              <Link
                href={`/?lang=${encodeURIComponent(language.code)}`}
                hrefLang={language.code}
                className={`${styles.link} ${current ? styles.current : ""}`}
                aria-current={current ? "true" : undefined}
                onClick={() => rememberLanguage(language.code)}
                data-language={language.code}
              >
                <span className={`${styles.native} ${ARABIC_SCRIPT.test(language.nativeName) ? styles.arabic : ""}`}>
                  <bdi lang={language.code} dir="auto">
                    {language.nativeName}
                  </bdi>
                </span>
                {fold(language.name) !== fold(language.nativeName) && <span className={styles.english}>{language.name}</span>}
                <span className={styles.count}>
                  {language.code === "ar" ? t("languageOriginal", { count }) : t("translatedCount", { count })}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {needle && !shown.length && (
        <p className={styles.empty} role="status">
          {t("translationsNoMatch", { query: query.trim() })}
        </p>
      )}
    </section>
  );
}
