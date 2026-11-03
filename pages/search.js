import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { server, config, shareImage } from "../lib/config";
import {
  ApiError,
  MIN_SEARCH_LENGTH,
  getBookHadith,
  getBooks,
  getLanguages,
  loadPage,
  parsePage,
  searchHadiths,
} from "../lib/api";
import { REFERENCE_NUMBER, parseReference } from "../lib/reference";
import { booksBySlug, hadithPath, shortBookName } from "../lib/hadith";
import { compareLanguages } from "../lib/language";
import { useLocale } from "../contexts/LocaleContext";
import useRouteLoading from "../hooks/useRouteLoading";
import useSubmitBusy from "../hooks/useSubmitBusy";
import Meta from "../components/core/meta";
import Breadcrumbs from "../components/core/breadcrumbs";
import ErrorState, { EmptyState } from "../components/core/error";
import Pagination, { pageHref } from "../components/core/pagination";
import Layout from "../components/layouts/LayoutSecondary";
import { sidebarCategoriesData } from "../components/sidebar/data";
import HadithCard, { HadithList } from "../components/hadith/HadithCard";
import { HighlightProvider } from "../components/hadith/Highlight";
import { GoToHadith } from "../components/home/search";
import SearchIcon from "../components/icons/Search";
import TuneIcon from "../components/icons/Tune";
import styles from "../components/content/Page.module.scss";
import searchStyles from "../components/home/search.module.scss";

// One GET form: text, collection and language. Changing a filter re-runs
// the search; everything lives in the URL. On phones the filters (and "go
// to hadith" once there are results) fold into a "Bộ lọc" panel so the
// results start on the first screen; from 768px the panel is always open.
// The selects sit outside the <form> element (form="search-form") so the
// panel can also hold the separate go-to form.
function SearchForm({ query, book, books, languages, goTo }) {
  const router = useRouter();
  const { t, lang, formatNumber } = useLocale();
  const [value, setValue] = useState(query);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [busy, startBusy] = useSubmitBusy();
  const active = (book ? 1 : 0) + (router.query.lang ? 1 : 0);

  const go = (overrides = {}) => {
    const q = (overrides.q ?? value).trim();
    if (q.length < MIN_SEARCH_LENGTH) return;
    const params = { q };
    const selectedBook = overrides.book ?? book;
    const selectedLang = overrides.lang ?? (router.query.lang || "");
    if (selectedBook) params.book = selectedBook;
    if (selectedLang) params.lang = selectedLang;
    startBusy();
    router.push({ pathname: "/search", query: params });
  };

  return (
    <div className={styles.searchForm}>
      <form
        id="search-form"
        action="/search"
        method="get"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          go();
        }}
      >
        <div className={searchStyles.search}>
          <span className={searchStyles.icon} aria-hidden="true">
            <SearchIcon />
          </span>
          <input
            type="search"
            name="q"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={t("searchPlaceholderLong")}
            aria-label={t("search")}
            minLength={MIN_SEARCH_LENGTH}
            autoComplete="off"
            enterKeyHint="search"
          />
          <button type="submit" aria-busy={busy || undefined}>
            {t("searchButton")}
          </button>
        </div>
      </form>

      <button
        type="button"
        className={searchStyles.filterToggle}
        aria-expanded={filtersOpen ? "true" : "false"}
        aria-controls="search-filters"
        onClick={() => setFiltersOpen((open) => !open)}
      >
        <TuneIcon />
        <span>{t("filters")}</span>
        {active > 0 && <span className={searchStyles.filterCount}>{formatNumber(active)}</span>}
        <span className={searchStyles.filterChevron} aria-hidden="true" />
      </button>

      <div id="search-filters" className={`${searchStyles.filterPanel} ${filtersOpen ? searchStyles.filterPanelOpen : ""}`}>
        <div className={styles.filters}>
          {books.length > 0 && (
            <label className={styles.filter}>
              <span>{t("books")}</span>
              <select
                name="book"
                form="search-form"
                value={book}
                onChange={(event) => go({ book: event.target.value })}
                className={styles.select}
              >
                <option value="">{t("searchAllBooks")}</option>
                {books.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {shortBookName(item)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {languages.length > 0 && (
            <label className={styles.filter}>
              <span>{t("searchLanguage")}</span>
              <select
                name="lang"
                form="search-form"
                value={lang}
                onChange={(event) => go({ lang: event.target.value })}
                className={styles.select}
              >
                {languages.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.nativeName}
                    {language.nativeName !== language.name ? ` (${language.name})` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {goTo}
      </div>
    </div>
  );
}

export default function Search({ query, book, results, books, languages, notFound, translations, error }) {
  const { t, lang, languageInfo, formatNumber, languageName } = useLocale();
  const router = useRouter();
  const loading = useRouteLoading();
  const bookList = books || [];
  const bookMap = booksBySlug(bookList);
  const tooShort = query && query.length < MIN_SEARCH_LENGTH;

  const totalHadiths = bookList.reduce((sum, item) => sum + (item.totalHadith || 0), 0);
  const searchedArabic = results && results.searchedLanguage === "ar";
  const showCoverage =
    results &&
    !searchedArabic &&
    lang !== "en" &&
    languageInfo &&
    totalHadiths > 0 &&
    languageInfo.totalTranslated < totalHadiths;

  // "Hiển thị 21–40 trong 252 kết quả"
  const shown =
    results && results.hadiths.length > 0
      ? {
          from: (results.pagination.page - 1) * results.pagination.perPage + 1,
          to: (results.pagination.page - 1) * results.pagination.perPage + results.hadiths.length,
        }
      : null;

  // Keep the query, book filter and any ?lang= override across pages.
  const baseQuery = { q: query, book: book || undefined, lang: router.query.lang || undefined, tr: router.query.tr };

  return (
    <>
      <Meta
        title={query ? t("labelValue", { label: t("search"), value: query }) : t("search")}
        description={t("searchTips")}
        url={`${server}/search`}
        image={shareImage}
        type="website"
      />

      <div className={styles.page}>
        <Breadcrumbs items={[{ href: "/", label: t("home") }, { label: t("search") }]} />

        <header className={styles.header}>
          <h1 className={styles.title}>{t("search")}</h1>
        </header>

        <SearchForm
          key={`${query}|${book}|${lang}`}
          query={query || ""}
          book={book || ""}
          books={bookList}
          languages={languages || []}
          goTo={query ? <GoToHadith /> : null}
        />

        {!query && (
          <div className={styles.goRow}>
            <GoToHadith />
          </div>
        )}

        {notFound && (
          <p className={`${styles.notice} ${styles.warning}`} role="status">
            {t("referenceNotFound", { query: notFound })} {t("referenceHelp")}
          </p>
        )}

        {!query && !notFound && <p className={styles.notice}>{t("searchTips")}</p>}

        {tooShort && (
          <p className={`${styles.notice} ${styles.warning}`}>{t("searchMinLength", { count: MIN_SEARCH_LENGTH })}</p>
        )}

        {error && <ErrorState error={error} />}

        {results && (
          <section aria-labelledby="search-results" aria-busy={loading ? "true" : undefined}>
            {/* Heading and "Hiển thị 1–20 trong 252 kết quả", announced
                after each search or page change. */}
            <div aria-live="polite">
              <div className={styles.sectionHead}>
                <h2 id="search-results" className={styles.sectionTitle}>
                  {results.pagination.total > 0 ? t("searchResultsFor", { query }) : t("searchNoResults", { query })}
                </h2>
              </div>
              {results.pagination.total > 0 && (
                <p className={searchStyles.resultCount}>
                  {shown
                    ? t("searchShowing", {
                        from: formatNumber(shown.from),
                        to: formatNumber(shown.to),
                        total: formatNumber(results.pagination.total),
                      })
                    : t("searchResults", { count: formatNumber(results.pagination.total), query })}
                </p>
              )}
            </div>

            <p className={`${styles.meta} ${styles.searchedIn}`}>
              <span>
                {searchedArabic
                  ? t("searchedArabic")
                  : t("searchedLanguage", { language: languageName(results.searchedLanguage) })}
              </span>
              {book && bookMap[book] && <span>{shortBookName(bookMap[book])}</span>}
            </p>

            {showCoverage && (
              <p className={`${styles.notice} ${styles.warning}`}>
                {t("searchCoverage", {
                  count: formatNumber(languageInfo.totalTranslated),
                  language: languageName(lang),
                })}{" "}
                <Link href={pageHref("/search", { ...baseQuery, lang: "en" }, 1)}>{t("searchInEnglish")}</Link>
              </p>
            )}

            {results.hadiths.length === 0 ? (
              results.pagination.total > 0 ? (
                <EmptyState>
                  {t("pageEmpty")} <Link href={pageHref("/search", baseQuery, 1)}>{t("goToFirstPage")}</Link>
                </EmptyState>
              ) : (
                <EmptyState>{t("searchTips")}</EmptyState>
              )
            ) : (
              <HighlightProvider query={query} field={searchedArabic ? "arabic" : results.searchedLanguage}>
                <HadithList
                  hadiths={results.hadiths}
                  loading={loading}
                  picker={{ translations, book: book || null }}
                  renderCard={(hadith) => (
                    <HadithCard key={hadith.id} hadith={hadith} book={bookMap[hadith.bookSlug]} showContext />
                  )}
                />
              </HighlightProvider>
            )}

            <Pagination pagination={results.pagination} hrefFor={(page) => pageHref("/search", baseQuery, page)} />
          </section>
        )}
      </div>
    </>
  );
}

Search.getLayout = function getLayout(page) {
  return <Layout>{page}</Layout>;
};

const first = (value) => (Array.isArray(value) ? value[0] : value);

export async function getServerSideProps(context) {
  const query = String(first(context.query.q) || "").trim().slice(0, 200);
  const goTo = String(first(context.query.go) || "").trim().slice(0, 100);
  const rawBook = first(context.query.book);
  const book = /^[\w-]+$/.test(String(rawBook || "")) ? String(rawBook) : "";
  const langOverride = first(context.query.lang);
  const trOverride = context.query.tr === undefined ? undefined : String(first(context.query.tr));

  return loadPage(context, async (lang, { translations }) => {
    const [books, languages] = await Promise.all([getBooks(lang).catch(() => []), getLanguages().catch(() => [])]);

    // "Go to hadith": ?go=Bukhari 1, ?go=8a&book=sahih-muslim, or a search
    // query that is a reference ("Muslim 8a"). Found: open the hadith.
    let notFound = null;
    const reference = goTo
      ? book && REFERENCE_NUMBER.test(goTo)
        ? { slug: book, number: goTo }
        : parseReference(goTo, books)
      : query
      ? parseReference(query, books)
      : null;
    if (reference) {
      try {
        const hadith = await getBookHadith(reference.slug, reference.number, lang);
        const keep = new URLSearchParams();
        if (langOverride) keep.set("lang", langOverride);
        if (trOverride !== undefined) keep.set("tr", trOverride);
        const search = keep.toString().replace(/%2C/gi, ",");
        return { redirect: { destination: `${hadithPath(hadith)}${search ? `?${search}` : ""}`, permanent: false } };
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 404)) throw error;
        notFound = goTo || query;
      }
    } else if (goTo) {
      notFound = goTo;
    }

    const results =
      query.length >= MIN_SEARCH_LENGTH && !goTo
        ? await searchHadiths(query, lang, {
            page: parsePage(context.query.page),
            perPage: config.perPage,
            book: book || undefined,
            translations,
          })
        : null;

    return {
      props: {
        query: goTo ? "" : query,
        book,
        results,
        notFound,
        books: books.map(({ slug, code, name, nameEnglish, source, totalHadith }) => ({
          slug,
          code,
          name,
          nameEnglish: nameEnglish || null,
          source,
          totalHadith,
        })),
        // the deployment's language first, then English, then by name
        languages: languages
          .filter((language) => language.code !== "ar")
          .map(({ code, name, nativeName }) => ({ code, name, nativeName }))
          .sort(compareLanguages),
        sidebarData: await sidebarCategoriesData(lang),
        backLink: "/",
      },
    };
  });
}
