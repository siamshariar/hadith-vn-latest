#!/usr/bin/env node
// Country matrix: serves the site once per country (NEXT_PUBLIC_COUNTRY_CODE, `next dev` in
// a separate git worktree on PORT) and checks that every page shows that country's data,
// compared with what the API returns for the country's localization:
//   - interface: <html lang> (the country's `ui` catalog, else English), og:locale (the
//     country's for its own interface, else the catalog's), the site name in the title, the
//     h1 naming the country's content language
//   - content: the language the home page asked the API for, book names (lib/names for the
//     content language where it has them, else the API's), category titles, and the
//     translation shown on Bukhari 1 and HadeethEnc 4560 (own, linked or fallback)
//   - another language picked with the language menu (Bengali; English on bd): the
//     interface and the content follow, and hadith_lang keeps it
//   - no source names: no page says HadeethEnc, Fawaz, hadith-api or an edition code, except
//     HadeethEnc's source line, which reads the interface's sourceLine
//   - no console errors
// The international edition (ac, "international": true) has no country to compare with:
// it is checked for readers whose browsers ask for en-US, bn-BD, vi-VN, fr-FR and ur-PK
// instead (checkInternational below).
//
//   PLAYWRIGHT_CORE=/path/to/playwright-core node scripts/country-matrix.mjs [vn bd ac ...]
//
// Env: API (default http://127.0.0.1:8090/api), PORT (default 3001), WORKTREE (default a
// temporary directory; created and removed by the script), NAMES_FIXTURE=1 (the servers and
// the checks use the e2e suite's names, scripts/e2e/fixtures/names). Exits 1 when a check
// fails.
import { spawn, execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// lib/i18n.js is an ES module in a package without "type": "module"; Node says so once.
process.removeAllListeners("warning");
process.on("warning", (warning) => {
  if (warning.code !== "MODULE_TYPELESS_PACKAGE_JSON") console.warn(warning.stack || String(warning));
});

const require = createRequire(import.meta.url);
const pw = require(process.env.PLAYWRIGHT_CORE || "playwright-core");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = (process.env.API || "http://127.0.0.1:8090/api").replace(/\/+$/, "");
const PORT = Number(process.env.PORT || 3001);
const BASE = `http://127.0.0.1:${PORT}`;
const WORKTREE = process.env.WORKTREE || path.join(os.tmpdir(), `hadith-vn-countries-${process.pid}`);

const countries = JSON.parse(fs.readFileSync(path.join(root, "config", "countries.json"), "utf8"));
const i18n = await import(pathToFileURL(path.join(root, "lib", "i18n.js")).href);
await i18n.loadCatalogs(); // every catalog, for the strings expected below
delete countries._comment;
const wanted = process.argv.slice(2);
const codes = wanted.length ? wanted : Object.keys(countries);

// The interface of a site for content in `lang` (lib/language.js interfaceFor): the site's own
// (its `ui` catalog, else English) for its language, else that language's catalog, else the
// site's again. Right-to-left catalogs wait for lib/i18n RTL_INTERFACES.
const siteInterface = (entry) => i18n.interfaceLanguageFor(entry.ui);
const interfaceFor = (entry, lang) => (lang === entry.language || !i18n.isInterfaceLanguage(lang) ? siteInterface(entry) : lang);
// og:locale of an interface: the country's for its own `ui`, else the catalog's.
const ogLocaleFor = (entry, ui) => (ui === entry.ui ? entry.ogLocale : i18n.catalogLocale(ui).replace("-", "_"));

// Book names in a content language: lib/names/<lang>.json (the e2e fixture with NAMES_FIXTURE=1),
// else the API's; the topic collection's is the interface's topicCollection string, in `ui`.
const NAMES_DIR = process.env.NAMES_FIXTURE === "1" ? path.join(root, "scripts", "e2e", "fixtures", "names") : path.join(root, "lib", "names");
function namesOf(lang) {
  const file = path.join(NAMES_DIR, `${lang}.json`);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
}
const isTopicCollection = (book) => [book.slug, book.code, book.source].includes("hadeethenc");
const bookName = (lang, book, ui) =>
  isTopicCollection(book) ? i18n.translate(ui, "topicCollection") : (namesOf(lang).books || {})[book.slug] || book.name;

const api = async (p) => {
  const res = await fetch(`${API}${p}`);
  if (!res.ok) throw new Error(`${res.status} ${p}`);
  return res.json();
};
const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();
// A stretch from the middle of a text: the start may be restyled ("Narrated X:" on its own line)
// What a page names of the data sources, HadeethEnc's source line (data-source-line) aside;
// that line must read the interface's sourceLine. Edition codes come from /hadith/editions.
const SOURCE_NAMES = /hadeeth\s*enc|fawaz|hadith-api|jsdelivr|↗/i;
let editionCodes = [];
async function sourceNames(page) {
  const ui = (await page.getAttribute("html", "lang")) || "en";
  const line = i18n.translate(ui, "sourceLine", { source: "HadeethEnc.com" });
  return page.evaluate(
    ({ pattern, codes, line }) => {
      const bad = new RegExp(pattern, "i");
      const code = codes.length ? new RegExp(`(^|[^a-z0-9-])(${codes.join("|")})(?![a-z0-9-])`, "i") : null;
      const found = [];
      document.querySelectorAll("[data-source-line]").forEach((el) => {
        if (el.textContent.trim() !== line) found.push(`source line "${el.textContent.trim()}"`);
      });
      const body = document.body.cloneNode(true);
      body.querySelectorAll("[data-source-line], script, style, noscript").forEach((el) => el.remove());
      const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const text = node.textContent.replace(/\s+/g, " ").trim();
        if (text && (bad.test(text) || (code && code.test(text)))) found.push(text.slice(0, 80));
      }
      if (bad.test(document.title)) found.push(`title: ${document.title}`);
      return found;
    },
    { pattern: SOURCE_NAMES.source, codes: editionCodes, line }
  );
}
const namedCheck = (named) => [!named.size, named.size ? `${named.size}: ${[...named].slice(0, 3).join(" | ")}` : "none (HadeethEnc's source line aside)"];

const snippet = (s) => {
  const t = norm(s);
  return t.length > 100 ? t.slice(40, 100) : t;
};

function startServer(code) {
  fs.rmSync(path.join(WORKTREE, ".next"), { recursive: true, force: true });
  const child = spawn("npx", ["next", "dev", "-p", String(PORT), "-H", "127.0.0.1"], {
    cwd: WORKTREE,
    detached: true,
    env: {
      ...process.env,
      NEXT_PUBLIC_COUNTRY_CODE: code,
      NEXT_PUBLIC_SITE_URL: BASE,
      NEXT_PUBLIC_API_BASE_URL: API,
      NEXT_TELEMETRY_DISABLED: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("dev server did not start")), 60000);
    child.stdout.on("data", (chunk) => {
      if (/Ready/.test(String(chunk))) {
        clearTimeout(timer);
        resolve(child);
      }
    });
    child.on("exit", (status) => reject(new Error(`dev server exited (${status})`)));
  });
}

const stopServer = (child) => {
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    // already gone
  }
};

async function checkCountry(browser, code, languages) {
  const entry = countries[code];
  const loc = entry.localization;
  const expectedUi = siteInterface(entry);
  const contentLanguage = languages.find((l) => l.code === entry.language);
  const results = [];
  const check = (name, ok, detail = "") => results.push({ name, ok: Boolean(ok), detail });

  const context = await browser.newContext({ locale: "en-US" });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 160)));
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  const named = new Set();
  const open = async (p) => {
    const res = await page.goto(BASE + p, { waitUntil: "networkidle", timeout: 120000 });
    if (!res || res.status() !== 200) throw new Error(`${p}: HTTP ${res && res.status()}`);
    (await sourceNames(page)).forEach((text) => named.add(`${p}: ${text}`));
    return norm(await page.innerText("body"));
  };

  // home: interface and the language the data was asked in
  await open("/");
  const htmlLang = await page.getAttribute("html", "lang");
  check("html lang", htmlLang === expectedUi, `${htmlLang} (want ${expectedUi})`);
  const ogLocale = await page.getAttribute('meta[property="og:locale"]', "content");
  const wantOg = ogLocaleFor(entry, expectedUi);
  check("og:locale", ogLocale === wantOg, `${ogLocale} (want ${wantOg})`);
  const title = await page.title();
  const siteName = entry.siteName || "Hadith";
  check("site name in title", title.endsWith(`| ${siteName}`), title);
  const h1 = norm(await page.textContent("h1"));
  // as the interface catalog names it (English: "Kurdish (Sorani)" is "Kurdish")
  const wantName = i18n.languageName(expectedUi, entry.language, contentLanguage.name);
  check("h1 names the content language", h1.toLowerCase().includes(wantName.toLowerCase()), h1);
  const nextData = JSON.parse(await page.textContent("#__NEXT_DATA__"));
  const homeLang = nextData.props.pageProps.home && nextData.props.pageProps.home.language.code;
  check("home data language", homeLang === entry.language, `${homeLang}`);

  // books and categories, named in the country's language
  const books = await api(`/hadith/books/localizations/${loc}`);
  const booksText = await open("/books");
  const missingBooks = books.map((b) => bookName(entry.language, b, expectedUi)).filter((name) => !booksText.includes(norm(name)));
  check("book names", !missingBooks.length, missingBooks.length ? `missing ${missingBooks.join(", ")}` : `${books.length} books`);
  // the lists leave out the categories with nothing in the language (lib/api readableCategories)
  const readable = (c) => entry.language === "ar" || c.totalTranslated == null || c.totalTranslated > 0;
  const categories = (await api(`/hadith/categories/localizations/${loc}`)).filter((c) => !c.parentId && readable(c)).slice(0, 6);
  const categoriesText = await open("/categories");
  const missingCats = categories.filter((c) => !categoriesText.includes(norm(c.title))).map((c) => c.title);
  check("category titles", !missingCats.length, missingCats.length ? `missing ${missingCats.join(" | ")}` : `${categories.length} top categories`);

  // a book hadith and a HadeethEnc hadith: the translation the API gives for the country
  for (const p of ["/books/bukhari/hadiths/1", "/books/hadeethenc/hadiths/4560"]) {
    const d = await api(`/hadith${p}/localizations/${loc}`);
    const own = d.translation && d.translation.text ? d.translation : null;
    const linked = d.linkedTranslation && d.linkedTranslation.text ? d.linkedTranslation : null;
    const shown = own && !own.isFallback ? own : linked || own;
    const kind = shown === linked ? "linked" : own && own.isFallback ? "English fallback" : "own";
    const text = await open(p);
    if (!shown) {
      check(`${p} translation`, true, "Arabic only (no translation)");
      continue;
    }
    const lang = shown.languageCode;
    const inBlock = await page.evaluate(
      ({ lang, want }) =>
        [...document.querySelectorAll(`[lang="${lang}"]`)].some((el) =>
          el.innerText.replace(/\s+/g, " ").includes(want)
        ),
      { lang, want: snippet(shown.text) }
    );
    check(`${p} translation`, text.includes(snippet(shown.text)) && inBlock, `${lang} ${kind}`);
    if (d.title) check(`${p} title`, text.includes(norm(d.title).slice(0, 50)), norm(d.title).slice(0, 40));
  }

  check("no source names", ...namedCheck(named));

  // the language menu (desktop): another language for the content and the interface, kept
  const other = entry.language === "bn" ? "en" : "bn";
  const otherUi = interfaceFor(entry, other);
  await page.setViewportSize({ width: 1366, height: 900 });
  await open("/books/bukhari");
  await page.locator("button[data-language-menu]").filter({ visible: true }).first().click();
  const items = page.locator('[role="menuitemradio"]');
  await items.first().waitFor({ timeout: 60000 });
  const listed = await items.evaluateAll((els) => els.map((el) => [el.dataset.language, el.getAttribute("aria-checked")]));
  check(
    "menu: every language, the current one checked",
    listed.length === languages.length && listed.filter(([, on]) => on === "true").map(([c]) => c).join() === entry.language,
    `${listed.length} of ${languages.length}`
  );
  await page.locator(`[role="menuitemradio"][data-language="${other}"]`).click();
  await page.waitForFunction((ui) => document.documentElement.lang === ui, otherUi, { timeout: 60000 }).catch(() => {});
  await page.waitForLoadState("networkidle");
  const book = await api(`/hadith/books/bukhari/localizations/${other}`);
  const after = { lang: await page.getAttribute("html", "lang"), h1: norm(await page.textContent("h1")) };
  const saved = ((await context.cookies(BASE)).find((c) => c.name === "hadith_lang") || {}).value;
  check(
    `menu: ${other} for the content and the interface`,
    after.lang === otherUi && after.h1 === norm(bookName(other, book, otherUi)) && saved === other,
    `html ${after.lang} (want ${otherUi}), h1 ${after.h1}, cookie ${saved}`
  );
  await open("/");
  const home = JSON.parse(await page.textContent("#__NEXT_DATA__")).props.pageProps;
  check("menu: kept on the next page", home.lang === other && home.uiLang === otherUi, `content ${home.lang}, interface ${home.uiLang}`);

  check("no console errors", !errors.length, errors.slice(0, 2).join(" / "));
  await context.close();
  return results;
}

// ---------------------------------------------------------------- international (ac)

// Readers of the international edition, by the language their browser asks for: the content
// language is the best match among the API's languages, and the interface follows it: its
// catalog when there is one (bn, vi, fr), else English (ur: no
// right-to-left interface yet).
const READERS = [
  { locale: "en-US", content: "en" },
  { locale: "bn-BD", content: "bn" },
  { locale: "vi-VN", content: "vi" },
  { locale: "fr-FR", content: "fr" },
  { locale: "ur-PK", content: "ur" },
];

// The interface string as LocaleContext's t() gives it (the site's name filled in).
const tr = (ui, key, vars = {}) => i18n.translate(ui, key, { site: "Hadith", ...vars });

async function checkInternational(browser, code, languages) {
  const entry = countries[code];
  const uiOf = (lang) => interfaceFor(entry, lang);
  const siteName = entry.siteName || "Hadith";
  const t = (ui, key, vars = {}) => tr(ui, key, { site: siteName, ...vars });
  const results = [];
  const check = (name, ok, detail = "") => results.push({ name, ok: Boolean(ok), detail });
  const byCode = new Map(languages.map((l) => [l.code, l]));
  const directoryOrder = [...languages]
    .sort((a, b) => (b.totalTranslated || 0) - (a.totalTranslated || 0) || a.name.localeCompare(b.name))
    .map((l) => l.code);
  const contexts = [];

  // a browser context for one reader; console errors fail the "no console errors" check, and
  // source names the "no source names" one
  const errors = [];
  const named = new Set();
  async function reader(locale, { cookies = [], viewport } = {}) {
    const context = await browser.newContext({ locale, ...(viewport ? { viewport } : {}) });
    contexts.push(context);
    if (cookies.length) await context.addCookies(cookies.map((cookie) => ({ ...cookie, url: BASE })));
    const page = await context.newPage();
    // the not-found page answers 404 on purpose: only that document's 404 is expected
    const expected = (m) => /status of 404/.test(m.text()) && /\/no-such-page$/.test((m.location() || {}).url || "");
    page.on("console", (m) => m.type() === "error" && !expected(m) && errors.push(`${locale}: ${m.text().slice(0, 160)}`));
    page.on("pageerror", (e) => errors.push(`${locale}: ${String(e).slice(0, 160)}`));
    const open = async (p) => {
      const res = await page.goto(BASE + p, { waitUntil: "networkidle", timeout: 120000 });
      if (!res || res.status() !== 200) throw new Error(`${p}: HTTP ${res && res.status()}`);
      (await sourceNames(page)).forEach((text) => named.add(`${locale} ${p}: ${text}`));
      return norm(await page.innerText("body"));
    };
    const props = async () => JSON.parse(await page.textContent("#__NEXT_DATA__")).props.pageProps;
    const cookie = async (name) => ((await context.cookies(BASE)).find((c) => c.name === name) || {}).value;
    return { context, page, open, props, cookie };
  }

  // The translation the API gives for a hadith in `lang`, shown in a block of that language.
  async function shows(page, p, lang) {
    const d = await api(`/hadith${p}/localizations/${lang}`);
    const own = d.translation && d.translation.text ? d.translation : null;
    const linked = d.linkedTranslation && d.linkedTranslation.text ? d.linkedTranslation : null;
    const shown = own && !own.isFallback ? own : linked || own;
    if (!shown) return { ok: true, detail: "Arabic only" };
    const ok = await page.evaluate(
      ({ lang, want }) =>
        [...document.querySelectorAll(`main [lang="${lang}"]`)].some((el) => el.innerText.replace(/\s+/g, " ").includes(want)),
      { lang: shown.languageCode, want: snippet(shown.text) }
    );
    return { ok, detail: `${shown.languageCode} ${shown === linked ? "linked" : own && own.isFallback ? "English fallback" : "own"}` };
  }

  try {
    for (const reading of READERS) {
      const want = { ...reading, ui: uiOf(reading.content) };
      const tag = want.locale;
      const { page, open, props } = await reader(want.locale);
      const extras = want.content === "en" ? [] : ["en"];

      await open("/");
      const htmlLang = await page.getAttribute("html", "lang");
      check(`${tag} <html lang>`, htmlLang === want.ui, `${htmlLang} (want ${want.ui})`);
      const ogLocale = await page.getAttribute('meta[property="og:locale"]', "content");
      const wantOg = ogLocaleFor(entry, want.ui);
      check(`${tag} og:locale`, ogLocale === wantOg, `${ogLocale} (want ${wantOg})`);
      const title = await page.title();
      check(`${tag} title`, title === t(want.ui, "homeTitleAll"), title);
      const h1 = norm(await page.textContent("h1"));
      check(`${tag} h1`, h1 === t(want.ui, "siteHeadingAll"), h1);
      const home = await props();
      check(
        `${tag} content language`,
        home.lang === want.content && home.home.language.code === want.content,
        `${home.lang}, home data ${home.home.language.code} (want ${want.content})`
      );
      check(`${tag} interface`, home.uiLang === want.ui, `${home.uiLang}`);
      check(`${tag} default extras`, home.translations.join(",") === extras.join(","), `[${home.translations}]`);

      // the language directory: every language of the API, most translated first, counted as the API counts
      const entries = await page.$$eval("#language-directory a[data-language]", (links) =>
        links.map((a) => ({ code: a.dataset.language, href: a.getAttribute("href"), text: a.innerText.replace(/\s+/g, " ").trim() }))
      );
      const wrong = entries.filter((e) => {
        const l = byCode.get(e.code);
        // normalised as the text is: French groups digits with a narrow no-break space
        return !l || e.href !== `/?lang=${e.code}` || !e.text.includes(norm(l.nativeName)) || !e.text.includes(norm(i18n.formatNumber(l.totalTranslated, want.ui)));
      });
      check(
        `${tag} language directory`,
        entries.length === languages.length && !wrong.length && entries.map((e) => e.code).join() === directoryOrder.join(),
        `${entries.length} of ${languages.length} languages${wrong.length ? `; wrong: ${wrong.slice(0, 3).map((e) => e.code).join(", ")}` : ", counts as the API"}`
      );
      const current = await page.$$eval('#language-directory a[aria-current="true"]', (links) => links.map((a) => a.dataset.language));
      check(`${tag} directory marks the language`, current.join() === want.content, `[${current}]`);

      // a hadith in the content language, with English under it
      await open("/books/bukhari/hadiths/1");
      const hadith = await props();
      const chip = await page.getAttribute("[data-translations]", "data-translations");
      check(`${tag} hadith translations`, hadith.lang === want.content && chip === [want.content, ...extras].join(","), `${chip}`);
      const main = await shows(page, "/books/bukhari/hadiths/1", want.content);
      check(`${tag} hadith in ${want.content}`, main.ok, main.detail);
      if (extras.length) {
        const en = await shows(page, "/books/bukhari/hadiths/1", "en");
        check(`${tag} English beside it`, en.ok, en.detail);
      }
      const hadithLang = await page.getAttribute("html", "lang");
      check(`${tag} hadith <html lang>`, hadithLang === want.ui, hadithLang);
    }

    // the language menu: a French reader picks বাংলা, for the content and the interface; kept
    // after a reload and on a static page
    {
      const { page, open, props, cookie } = await reader("fr-FR", { viewport: { width: 1366, height: 900 } });
      await open("/books/bukhari/hadiths/1");
      const frUi = uiOf("fr");
      const button = page.locator("button[data-language-menu]").filter({ visible: true }).first();
      const label = await button.getAttribute("aria-label");
      const french = languages.find((l) => l.code === "fr");
      const wantLabel = t(frUi, "labelValue", { label: t(frUi, "language"), value: french.nativeName });
      check("menu: button named", label === wantLabel, label);
      await button.click();
      const items = page.locator('[role="menuitemradio"]');
      await items.first().waitFor({ timeout: 60000 });
      const listed = await items.evaluateAll((els) => els.map((el) => [el.dataset.language, el.getAttribute("aria-checked")]));
      check(
        "menu: every language, French checked",
        listed.length === languages.length && listed.filter(([, on]) => on === "true").map(([c]) => c).join() === "fr",
        `${listed.length} of ${languages.length}`
      );
      await page.locator('[role="menuitemradio"][data-language="bn"]').click();
      await page.waitForFunction(() => document.documentElement.lang === "bn", null, { timeout: 120000 }).catch(() => {});
      await page.waitForLoadState("networkidle");
      const saved = await cookie("hadith_lang");
      const html = await page.getAttribute("html", "lang");
      check("menu: Bengali saved", html === "bn" && saved === "bn", `html ${html}, cookie ${saved}`);
      await page.reload({ waitUntil: "networkidle" });
      const after = await props();
      check(
        "menu: content and interface after a reload",
        after.lang === "bn" && after.uiLang === "bn" && (await page.getAttribute("html", "lang")) === "bn",
        `content ${after.lang}, interface ${after.uiLang}`
      );
      await page.goto(BASE + "/no-such-page", { waitUntil: "networkidle", timeout: 120000 });
      await page.waitForFunction(() => document.documentElement.lang === "bn", null, { timeout: 30000 }).catch(() => {});
      const notFound = await page.title();
      check("menu: the static pages follow", notFound.startsWith(`${t("bn", "notFoundTitle")} | ${t("bn", "siteHeadingAll")}`), notFound);
    }

    // ?lang= overrides for one view; the hadith_lang cookie beats the browser; the reader's own
    // extras (none) beat the default
    {
      const { page, open, props } = await reader("en-US");
      await open("/?lang=de");
      const p = await props();
      check(
        "?lang= overrides",
        p.lang === "de" && p.home.language.code === "de" && p.uiLang === uiOf("de") && (await page.getAttribute("html", "lang")) === uiOf("de") && p.translations.join() === "en",
        `content ${p.lang}, interface ${p.uiLang}, extras [${p.translations}]`
      );
    }
    {
      const { open, props } = await reader("bn-BD", { cookies: [{ name: "hadith_lang", value: "fr" }] });
      await open("/");
      const p = await props();
      check("hadith_lang beats the browser", p.lang === "fr" && p.uiLang === uiOf("fr"), `content ${p.lang}, interface ${p.uiLang}`);
    }
    {
      const { open, props } = await reader("vi-VN", { cookies: [{ name: "hadith_tr", value: "" }] });
      await open("/books/bukhari/hadiths/1");
      const p = await props();
      check("the reader's extras win", p.lang === "vi" && p.translations.length === 0, `empty hadith_tr: [${p.translations}]`);
    }

    // a directory link opens the home page in its language and saves it
    {
      const { page, open, props, cookie } = await reader("en-US");
      await open("/");
      await page.locator('#language-directory a[data-language="fr"]').click();
      await page.waitForURL((url) => url.search === "?lang=fr", { timeout: 120000 });
      await page.waitForLoadState("networkidle");
      await page.waitForFunction(() => window.__NEXT_DATA__ && document.querySelector('#language-directory a[aria-current="true"][data-language="fr"]'), null, { timeout: 60000 });
      const saved = await cookie("hadith_lang");
      await open("/books/bukhari/hadiths/1");
      const p = await props();
      check("directory link", saved === "fr" && p.lang === "fr", `cookie ${saved}, next page in ${p.lang}`);
    }
  } finally {
    for (const context of contexts) await context.close().catch(() => {});
  }

  check("no source names", ...namedCheck(named));
  check("no console errors", !errors.length, errors.slice(0, 2).join(" / ") || `${contexts.length} browser contexts`);
  return results;
}

async function main() {
  const unknown = codes.filter((c) => !countries[c]);
  if (unknown.length) {
    console.error(`Unknown country code(s): ${unknown.join(", ")}`);
    process.exit(2);
  }
  const languages = await api("/hadith/languages");
  editionCodes = (await api("/hadith/editions")).map((edition) => edition.code.replace(/[^a-z0-9-]/gi, ""));
  execFileSync("git", ["-C", root, "worktree", "add", "--detach", WORKTREE, "HEAD"], { stdio: "ignore" });
  fs.symlinkSync(path.join(root, "node_modules"), path.join(WORKTREE, "node_modules"));
  const browser = await pw.chromium.launch();
  let failed = 0;
  try {
    for (const code of codes) {
      const child = await startServer(code);
      try {
        const results = countries[code].international
          ? await checkInternational(browser, code, languages)
          : await checkCountry(browser, code, languages);
        const bad = results.filter((r) => !r.ok);
        failed += bad.length;
        const what = countries[code].international ? "every language" : `content ${countries[code].language}`;
        console.log(`\n${code} (${countries[code].name}: ${what}) - ${bad.length ? `${bad.length} FAILED` : "all ok"}`);
        for (const r of results) console.log(`  ${r.ok ? "ok  " : "FAIL"} ${r.name}: ${r.detail}`);
      } catch (error) {
        failed += 1;
        console.log(`\n${code} - ERROR ${error.message}`);
      } finally {
        stopServer(child);
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  } finally {
    await browser.close();
    fs.unlinkSync(path.join(WORKTREE, "node_modules")); // the link only, never the target
    execFileSync("git", ["-C", root, "worktree", "remove", "--force", WORKTREE], { stdio: "ignore" });
  }
  console.log(`\n${codes.length} countries, ${failed} failed check(s)`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
