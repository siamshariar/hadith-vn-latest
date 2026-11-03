// Shared plumbing for the end-to-end suite (see index.js for how to run it):
// browser profiles, a page per test with console watching, the API client
// the expectations come from, and small DOM helpers.
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { after, describe, test } = require('node:test');
const { pathToFileURL } = require('node:url');
const pw = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');

const BASE = (process.env.BASE || 'http://127.0.0.1:3000').replace(/\/+$/, '');
const API = (process.env.API || 'http://127.0.0.1:8090/api/hadith').replace(/\/+$/, '');
// First visits compile the page in `next dev`; later ones take a second or two.
const NAV_TIMEOUT = Number(process.env.E2E_NAV_TIMEOUT || 90000);
const TIMEOUT = Number(process.env.E2E_TIMEOUT || 15000);

const UA_ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const UA_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

// Interactive tests run in the two Chromium profiles; WebKit runs the tests
// marked `smoke`. WebKit has no isMobile emulation, so its phone is a touch
// screen of the same size.
const PROFILES = [
  { name: 'chromium-desktop', engine: 'chromium', phone: false, smokeOnly: false, context: { viewport: { width: 1366, height: 768 } } },
  {
    name: 'chromium-phone',
    engine: 'chromium',
    phone: true,
    smokeOnly: false,
    context: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3, userAgent: UA_ANDROID },
  },
  { name: 'webkit-desktop', engine: 'webkit', phone: false, smokeOnly: true, context: { viewport: { width: 1366, height: 768 } } },
  {
    name: 'webkit-phone',
    engine: 'webkit',
    phone: true,
    smokeOnly: true,
    context: { viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 3, userAgent: UA_IOS },
  },
];

// E2E_PROFILES=chromium-desktop,webkit-phone runs only those.
function selectedProfiles() {
  const names = (process.env.E2E_PROFILES || '').split(',').map((s) => s.trim()).filter(Boolean);
  return names.length ? PROFILES.filter((p) => names.includes(p.name)) : PROFILES;
}

// ------------------------------------------------------------------ API

// GET {API}{path} as JSON, cached for the run; a failed call is not cached.
const apiCache = new Map();
function api(path) {
  if (!apiCache.has(path)) {
    const pending = fetch(`${API}${path}`, { headers: { Accept: 'application/json' } }).then(async (res) => {
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const error = new Error(`API ${res.status} for ${path}`);
        error.status = res.status;
        error.body = body;
        throw error;
      }
      return body;
    });
    pending.catch(() => apiCache.delete(path));
    apiCache.set(path, pending);
  }
  return apiCache.get(path);
}
const loc = (lang = 'vi') => `/localizations/${lang}`;

// ------------------------------------------------------------------ text

// Whitespace-normalised text, the way the suite compares page and API text.
const norm = (value) => String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
// What the app does to source text before showing it (lib/hadith cleanText).
const cleanText = (value) => String(value || '').replace(/\r\n?/g, '\n').trim();
// Vietnamese thousands separators (lib/i18n formatNumber).
const viNumber = (value) => String(Math.trunc(Number(value))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
// The translator a translation is credited to (lib/citation translatorName): the
// name the source gives, unless it is HadeethEnc's own site or the collection's
// compiler (the forty-hadith editions give Imam Nawawi, Shah Waliullah Dehlawi).
function translatorOf(author, edition) {
  const { code = '', source } = edition || {};
  if (!author || source === 'hadeethenc') return null;
  const collection = String(code).split('-').pop();
  return collection && String(author).toLowerCase().replace(/[^a-z]/g, '').includes(collection) ? null : author;
}
// Muslim's 8.01 is cited 8a (lib/hadith lettered).
function lettered(number) {
  const match = String(number ?? '').match(/^(\d+)\.(\d{2})$/);
  if (!match) return number == null ? '' : String(number);
  const index = parseInt(match[2], 10);
  return index >= 1 && index <= 26 ? `${match[1]}${String.fromCharCode(96 + index)}` : String(number);
}

// ------------------------------------------------------------------ interface and names

// lib/i18n.js is an ES module in a package without "type": "module"; Node says so once,
// which is not a test problem.
process.removeAllListeners('warning');
process.on('warning', (warning) => {
  if (warning.code !== 'MODULE_TYPELESS_PACKAGE_JSON') console.warn(warning.stack || String(warning));
});

// lib/i18n.js with every catalog loaded (lib/locales).
let i18nModule;
function i18n() {
  i18nModule =
    i18nModule ||
    import(pathToFileURL(path.join(__dirname, '..', '..', 'lib', 'i18n.js')).href).then(async (m) => {
      await m.loadCatalogs();
      return m;
    });
  return i18nModule;
}

// The strings of an interface as LocaleContext's t() gives them on a site: tr(key, vars), with
// the site's name and content language filled in, plus tr.language(code) (a language inside a
// sentence) and tr.number(n). Default: the vn site.
async function interfaceStrings(ui, { site = 'Hadith.vn', language = 'vi' } = {}) {
  const m = await i18n();
  const vars = { site, siteLanguage: m.languageName(ui, language) };
  const tr = (key, values) => m.translate(ui, key, { ...vars, ...values });
  tr.language = (code) => m.languageName(ui, code);
  tr.number = (value) => m.formatNumber(value, ui);
  return tr;
}

// The book names the site under test shows (lib/names.js): those of the fixture when the
// builds and this run have NAMES_FIXTURE=1 (scripts/e2e/fixtures/names), else of lib/names;
// the API's where they have none. Chapters keep the API's names. The topic collection is
// named by the interface: pass that interface's strings (interfaceStrings) as `tr`.
const NAMES_FIXTURE = process.env.NAMES_FIXTURE === '1';
const NAMES_DIR = NAMES_FIXTURE ? path.join(__dirname, 'fixtures', 'names') : path.join(__dirname, '..', '..', 'lib', 'names');
const namesCache = new Map();
function namesOf(lang) {
  if (!namesCache.has(lang)) {
    const file = path.join(NAMES_DIR, `${lang}.json`);
    namesCache.set(lang, fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {});
  }
  return namesCache.get(lang);
}
const isTopicCollection = (book) => [book.slug, book.code, book.source].includes('hadeethenc');

// The categories the lists show for content in `lang`: those with something to read in it
// and their ancestors (lib/api.js readableCategories, which Node cannot import: its paths
// are the bundler's). Arabic, the original, keeps them all.
function readableCategories(categories, lang) {
  if (lang === 'ar') return categories;
  const byId = new Map(categories.map((c) => [c.id, c]));
  const kept = new Set();
  categories
    .filter((c) => c.totalTranslated == null || c.totalTranslated > 0)
    .forEach((c) => {
      for (let node = c; node && !kept.has(node.id); node = byId.get(node.parentId)) kept.add(node.id);
    });
  return categories.filter((c) => kept.has(c.id));
}
const bookName = (lang, book, tr = null) =>
  (isTopicCollection(book) && tr ? tr('topicCollection') : null) || (namesOf(lang).books || {})[book.slug] || book.name;

// ------------------------------------------------------------------ browsers

// One browser per profile: profiles run in parallel, and Chromium's
// clipboard is per browser, so copy tests of two profiles never mix.
const browsers = new Map();
function browserFor(profile) {
  if (!browsers.has(profile.name)) browsers.set(profile.name, pw[profile.engine].launch());
  return browsers.get(profile.name);
}
after(async () => {
  for (const pending of browsers.values()) {
    const browser = await pending.catch(() => null);
    if (browser) await browser.close().catch(() => {});
  }
});

// Console output that fails a test: every console error and page error, and
// warnings about hydration. `allow`: patterns expected on this test (the
// 404 document of a not-found page).
const HYDRATION = /hydrat|did not match|server html|server-rendered/i;
// WebKit reports the API requests it cancels when a document is left (a
// reload, a typed URL) as "Fetch API cannot load ... due to access control
// checks". Only while a document is being left are they noted instead of
// failing the test: a real CORS failure happens on a loaded page and fails.
const CANCELLED = /due to access control checks|Load request cancelled/;
function watchConsole(page, problems, notes) {
  let leaving = false;
  page.on('request', (request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) leaving = true;
  });
  page.on('domcontentloaded', () => {
    leaving = false;
  });
  const report = (text) => {
    if (leaving && CANCELLED.test(text)) notes.push(`cancelled while leaving the page: ${text}`);
    else problems.push(text);
  };
  page.on('console', (message) => {
    const type = message.type();
    const text = message.text();
    if (type === 'error') report(`console.error: ${text}`);
    else if ((type === 'warning' || type === 'warn') && HYDRATION.test(text)) problems.push(`hydration warning: ${text}`);
    else if (type === 'warning' || type === 'warn') notes.push(text);
  });
  page.on('pageerror', (error) => report(`pageerror: ${error && error.message}`));
}

// Hydrated once React has attached its fiber to the server-rendered DOM.
async function waitForHydration(page) {
  await page.waitForFunction(
    () => {
      const root = document.getElementById('__next');
      const el = root && root.querySelector('main, header, div');
      return Boolean(el) && Object.keys(el).some((key) => key.startsWith('__reactFiber'));
    },
    null,
    { timeout: NAV_TIMEOUT }
  );
  // effects (localStorage, settings) run right after the hydration commit
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0))));
}

// Whether a test runs in a profile: WebKit only runs the smoke tests;
// `only: 'phone'` / `'desktop'` limit a test to one screen size.
function wanted(profile, { smoke = false, only } = {}) {
  if (profile.smokeOnly && !smoke) return false;
  if (only === 'phone' && !profile.phone) return false;
  if (only === 'desktop' && profile.phone) return false;
  return true;
}

// A harness bound to one profile: `h.test` registers a test (skipped from
// WebKit unless `smoke`), `h.open` gives the test a fresh browser context.
function harness(profile) {
  const h = {
    profile,
    phone: profile.phone,
    desktop: !profile.phone,
    engine: profile.engine,
    chromium: profile.engine === 'chromium',
    webkit: profile.engine === 'webkit',

    test(name, fn, options = {}) {
      if (!wanted(profile, options)) return;
      test(name, { timeout: Number(process.env.E2E_TEST_TIMEOUT || 240000) }, fn);
    },

    // Fresh context (empty localStorage and cookies) and page for test `t`;
    // `path` null opens nothing yet. Options: allow (RegExp[] of tolerated
    // console errors), initScript (run before the page's own scripts).
    async open(t, path, options = {}) {
      const browser = await browserFor(profile);
      const context = await browser.newContext({
        ...profile.context,
        locale: 'vi-VN',
        timezoneId: 'Asia/Ho_Chi_Minh',
        ...(options.context || {}),
      });
      context.setDefaultTimeout(TIMEOUT);
      context.setDefaultNavigationTimeout(NAV_TIMEOUT);
      if (h.chromium) await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
      if (options.initScript) await context.addInitScript(options.initScript);

      const page = await context.newPage();
      const problems = [];
      const notes = [];
      watchConsole(page, problems, notes);
      const allow = options.allow || [];
      t.after(async () => {
        await context.close().catch(() => {});
        // warnings that do not fail the test, once each
        [...new Set(notes)].forEach((note) => t.diagnostic(`${profile.name} ${path}: ${note.split('\n')[0].slice(0, 160)}`));
        const real = problems.filter((p) => !allow.some((pattern) => pattern.test(p)));
        assert.deepEqual(real, [], `console problems on ${profile.name} ${path}`);
      });

      let response = null;
      if (path != null) response = await h.goto(page, path);
      return { page, context, response, problems, notes };
    },

    // Navigates and waits for hydration; returns the document response.
    async goto(page, path) {
      const response = await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
      await waitForHydration(page);
      return response;
    },

    // After a click that changes the URL: wait for it and for the new page.
    async waitForPath(page, predicate, message) {
      const matches = typeof predicate === 'function' ? predicate : (url) => predicate.test(url.pathname + url.search);
      await page.waitForURL((url) => matches(url), { timeout: NAV_TIMEOUT }).catch((error) => {
        throw new Error(`${message || 'navigation'}: still at ${page.url()} (${error.message.split('\n')[0]})`);
      });
      await page.waitForLoadState('domcontentloaded');
      await waitForHydration(page);
    },

    waitForHydration,
  };
  return h;
}

// A spec file: `module.exports = spec(module, 'search', (h) => { h.test(...) })`.
// Run on its own (node --test scripts/e2e/search.js) it registers itself;
// index.js runs them all.
function spec(mod, title, register) {
  const item = { title, register };
  if (require.main === mod) run([item]);
  return item;
}

// Each selected profile runs the specs in order, one test at a time; the
// profiles run side by side (E2E_CONCURRENCY, default 2).
function run(specs) {
  const concurrency = Math.max(1, Number(process.env.E2E_CONCURRENCY || 2));
  describe('hadith-vn', { concurrency }, () => {
    for (const profile of selectedProfiles()) {
      describe(profile.name, { concurrency: 1 }, () => {
        const h = harness(profile);
        for (const item of specs) {
          // leave out a spec with no test for this profile (WebKit: smoke only)
          let count = 0;
          item.register({ ...h, test: (name, fn, options) => { if (wanted(profile, options)) count += 1; } });
          if (count) describe(item.title, () => item.register(h));
        }
      });
    }
  });
}

// ------------------------------------------------------------------ DOM helpers

// The breadcrumb trail (components/core/breadcrumbs). It is named in the interface
// language, which can be any catalog's, so it is found by its class.
const BREADCRUMB_NAV = 'nav[class*="breadcrumbs_breadcrumbs"]';

// Breadcrumb labels and links, in order.
async function breadcrumbs(page) {
  return page.locator(BREADCRUMB_NAV).locator('li').evaluateAll((items) =>
    items.map((li) => {
      const link = li.querySelector('a');
      return { label: li.textContent.replace(/\s+/g, ' ').trim(), href: link ? link.getAttribute('href') : null };
    })
  );
}

async function meta(page) {
  return page.evaluate(() => ({
    title: document.title,
    canonical: document.querySelector('link[rel=canonical]') && document.querySelector('link[rel=canonical]').getAttribute('href'),
    ogUrl: document.querySelector('meta[property="og:url"]') && document.querySelector('meta[property="og:url"]').getAttribute('content'),
    robots: document.querySelector('meta[name=robots]') && document.querySelector('meta[name=robots]').getAttribute('content'),
    lang: document.documentElement.lang,
    h1: [...document.querySelectorAll('h1')].map((el) => el.textContent.replace(/\s+/g, ' ').trim()),
  }));
}

// localStorage value as JSON.
const stored = (page, key) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), key);

// Reads the system clipboard (Chromium with clipboard permissions).
const readClipboard = (page) => page.evaluate(() => navigator.clipboard.readText());
const writeClipboard = (page, value) => page.evaluate((v) => navigator.clipboard.writeText(v), value);

// The URL as the browser has it, without the origin.
const pathOf = (page) => {
  const url = new URL(page.url());
  return url.pathname + url.search;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Polls `check` (async, returns a truthy value when done) until it passes.
async function until(check, message, timeout = TIMEOUT) {
  const deadline = Date.now() + timeout;
  let last;
  for (;;) {
    try {
      last = await check();
      if (last) return last;
    } catch (error) {
      last = error;
    }
    if (Date.now() > deadline) {
      throw new Error(`${typeof message === 'function' ? message(last) : message} (last: ${last instanceof Error ? last.message : JSON.stringify(last)})`);
    }
    await sleep(100);
  }
}

// Waits until the first element of `locator` has this (whitespace-normalised)
// text; `expected` is a string (exact) or a RegExp. Returns the text.
async function waitForText(locator, expected, timeout = TIMEOUT) {
  let seen = null;
  await until(async () => {
    seen = norm(await locator.first().textContent({ timeout: 1000 }));
    return expected instanceof RegExp ? expected.test(seen) : seen === expected;
  }, () => `expected ${locator} to have text ${expected}, saw ${JSON.stringify(seen)}`, timeout);
  return seen;
}

// The page's (single) h1, once it reads `expected`.
const waitForH1 = (page, expected, timeout) => waitForText(page.locator('h1'), expected, timeout);

async function scrollTo(page, y) {
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
}

module.exports = {
  API,
  BASE,
  BREADCRUMB_NAV,
  NAMES_FIXTURE,
  PROFILES,
  api,
  assert,
  bookName,
  breadcrumbs,
  cleanText,
  lettered,
  interfaceStrings,
  loc,
  meta,
  namesOf,
  norm,
  pathOf,
  readClipboard,
  readableCategories,
  run,
  scrollTo,
  sleep,
  spec,
  stored,
  translatorOf,
  until,
  viNumber,
  waitForH1,
  waitForText,
  writeClipboard,
};
