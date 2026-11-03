// The international edition: the ac site (NEXT_PUBLIC_COUNTRY_CODE=ac, Hadith.ac) at BASE_AC,
// another instance of the app (e.g. http://127.0.0.1:3002, from a git worktree; docs/DEPLOY.md).
// One site for every language: the reader's browser languages (Accept-Language) choose the
// content language among the API's, the interface follows it (its catalog when there is
// one, else English), the language menu saves another (hadith_lang), English is shown beside
// any other language until the reader chooses (hadith_tr), and the home page lists every
// language. Skipped when BASE_AC is not set.
//
// Expected strings come from the catalogs (lib/i18n.js, lib/locales) and the API, not from the page.
'use strict';

const path = require('node:path');
const { pathToFileURL } = require('node:url');
const countries = require('../../config/countries.json');
const { api, assert, cleanText, loc, norm, spec, until, waitForH1 } = require('./harness');

const BASE_AC = (process.env.BASE_AC || '').replace(/\/+$/, '');
const SITE_NAME = process.env.SITE_NAME_AC || countries.ac.siteName;
const BUKHARI_1 = '/books/sahih-al-bukhari/hadiths/1';
const squash = (value) => String(value || '').replace(/\s+/g, '');

let loaded;
async function i18n() {
  loaded =
    loaded ||
    import(pathToFileURL(path.join(__dirname, '..', '..', 'lib', 'i18n.js')).href).then(async (m) => {
      await m.loadCatalogs();
      return m;
    });
  const m = await loaded;
  // what LocaleContext's t() gives on this site (the site name filled in)
  const t = (ui, key, vars = {}) => m.translate(ui, key, { site: SITE_NAME, ...vars });
  // the interface for content in `lang` (lib/language.js interfaceFor; ac's own language is en)
  const uiOf = (lang) => (lang !== 'en' && m.isInterfaceLanguage(lang) ? lang : 'en');
  return { ...m, t, uiOf };
}

// Readers by the language their browser asks for: the content language they must get; the
// interface follows it (French: the French catalog; Urdu: English, no right-to-left
// interface while lib/i18n RTL_INTERFACES is off).
const READERS = [
  { locale: 'en-US', content: 'en' },
  { locale: 'bn-BD', content: 'bn' },
  { locale: 'vi-VN', content: 'vi' },
  { locale: 'fr-FR', content: 'fr' },
  { locale: 'ur-PK', content: 'ur' },
];

// A fresh context whose browser asks for `locale`, then the page on the ac instance.
async function openAc(h, t, pathname, { locale = 'en-US', cookies = [], ...options } = {}) {
  const opened = await h.open(t, null, { ...options, context: { locale, timezoneId: 'UTC', ...(options.context || {}) } });
  if (cookies.length) await opened.context.addCookies(cookies.map((cookie) => ({ ...cookie, url: BASE_AC })));
  const response = await opened.page.goto(BASE_AC + pathname, { waitUntil: 'domcontentloaded' });
  await h.waitForHydration(opened.page);
  return { ...opened, response };
}

// A page of the ac instance in an open page (h.goto opens BASE's).
async function gotoAc(h, page, pathname) {
  const response = await page.goto(BASE_AC + pathname, { waitUntil: 'domcontentloaded' });
  await h.waitForHydration(page);
  return response;
}

// The props of a page loaded as a document (window.__NEXT_DATA__ is not updated by
// client-side navigation).
const pageProps = (page) => page.evaluate(() => window.__NEXT_DATA__.props.pageProps);
const htmlLang = (page) => page.evaluate(() => document.documentElement.lang);
const cookieOf = async (context, name) => {
  const found = (await context.cookies(BASE_AC)).find((c) => c.name === name);
  return found ? decodeURIComponent(found.value) : undefined;
};
// the visible language menu button of the header (desktop: "English ▾"; phones: the globe)
const menuButton = (page) => page.locator('button[data-language-menu]').filter({ visible: true }).first();
// the translations chip of the hadith page header
const headerChip = (page) => page.locator('article > header button[data-translations]');

module.exports = spec(module, 'international (ac)', (h) => {
  if (!BASE_AC) {
    h.test('ac site', (t) => t.skip('BASE_AC is not set (e.g. BASE_AC=http://127.0.0.1:3002, an instance built with NEXT_PUBLIC_COUNTRY_CODE=ac)'), {
      only: 'desktop',
    });
    return;
  }

  h.test(
    'ac: the browser languages choose the content language, the interface follows (<html lang>, og:locale, title, h1)',
    async (t) => {
      const { t: tr, catalogLocale, uiOf } = await i18n();
      for (const reading of READERS) {
        const want = { ...reading, ui: uiOf(reading.content) };
        await t.test(want.locale, async (st) => {
          const { page, response } = await openAc(h, st, '/', { locale: want.locale });
          assert.equal(response.status(), 200);
          await waitForH1(page, tr(want.ui, 'siteHeadingAll'));
          assert.equal(await htmlLang(page), want.ui, '<html lang> is the interface');
          assert.equal(norm(await page.title()), tr(want.ui, 'homeTitleAll'));
          const ogLocale = await page.getAttribute('meta[property="og:locale"]', 'content');
          assert.equal(ogLocale, catalogLocale(want.ui).replace('-', '_'), 'og:locale is the catalog locale');
          const props = await pageProps(page);
          assert.equal(props.lang, want.content, 'content language: the best match of Accept-Language');
          assert.equal(props.home.language.code, want.content, 'the API answered in it');
          assert.equal(props.uiLang, want.ui);
          assert.deepEqual(props.translations, want.content === 'en' ? [] : ['en'], 'English beside any other language');
          const logo = await page.locator('a[aria-label] img').filter({ visible: true }).first().getAttribute('src');
          assert.equal(logo, '/img/logo_ac.png', 'the Hadith.ac logo');
        });
      }
    },
    { smoke: true }
  );

  h.test(
    'ac: the language directory lists every language with the API counts, and a link saves the language',
    async (t) => {
      const { formatNumber } = await i18n();
      const languages = await api('/languages');
      const { page, context } = await openAc(h, t, '/', { locale: 'en-US' });
      const entries = await page.locator('#language-directory a[data-language]').evaluateAll((links) =>
        links.map((a) => ({ code: a.dataset.language, href: a.getAttribute('href'), text: a.innerText.replace(/\s+/g, ' ').trim() }))
      );
      assert.equal(entries.length, languages.length, 'every language of /hadith/languages');
      const order = [...languages].sort((a, b) => b.totalTranslated - a.totalTranslated || a.name.localeCompare(b.name)).map((l) => l.code);
      assert.deepEqual(entries.map((e) => e.code), order, 'most translated first');
      for (const entry of entries) {
        const language = languages.find((l) => l.code === entry.code);
        assert.equal(entry.href, `/?lang=${entry.code}`);
        assert.ok(entry.text.includes(norm(language.nativeName)), `${entry.code}: its own name`);
        assert.ok(entry.text.includes(formatNumber(language.totalTranslated, 'en')), `${entry.code}: the API count`);
      }
      // right-to-left names are isolated
      assert.equal(await page.locator('#language-directory a[data-language="ur"] bdi').getAttribute('dir'), 'auto');
      assert.equal(await page.locator('#language-directory a[aria-current="true"]').getAttribute('data-language'), 'en');

      if (h.phone) {
        // phones: a filter over the list
        const filter = page.locator('section[aria-labelledby="home-languages"] input[type="search"]');
        await filter.fill('viet');
        await until(async () => (await page.locator('#language-directory a[data-language]').count()) === 1, 'the filter keeps Tiếng Việt only');
        assert.equal(await page.locator('#language-directory a[data-language]').getAttribute('data-language'), 'vi');
        await filter.fill('');
      }

      await page.locator('#language-directory a[data-language="fr"]').click();
      await h.waitForPath(page, /^\/\?lang=fr$/, 'the French home page');
      await page.locator('#language-directory a[aria-current="true"][data-language="fr"]').waitFor();
      assert.equal(await cookieOf(context, 'hadith_lang'), 'fr', 'saved as the preference');
      await gotoAc(h, page, BUKHARI_1);
      assert.equal((await pageProps(page)).lang, 'fr', 'the next pages are in French too');
    }
  );

  h.test(
    'ac: the language menu sets the content and the interface, kept after a reload and on static pages',
    async (t) => {
      const { t: tr, uiOf } = await i18n();
      const languages = await api('/languages');
      const french = languages.find((l) => l.code === 'fr');
      const { page, context } = await openAc(h, t, BUKHARI_1, { locale: 'fr-FR', allow: [/status of 404/] });
      const button = menuButton(page);
      const frUi = uiOf('fr');
      assert.equal(await button.getAttribute('aria-label'), tr(frUi, 'labelValue', { label: tr(frUi, 'language'), value: french.nativeName }));
      assert.equal(await button.getAttribute('aria-haspopup'), 'dialog');
      const box = await button.boundingBox();
      assert.ok(box.width >= 44 && box.height >= 44, `a 44px tap target (${box.width}x${box.height})`);
      if (h.desktop) assert.equal(norm(await button.innerText()), french.nativeName, 'desktop: "Français ▾"');
      await button.click();
      assert.equal(await button.getAttribute('aria-expanded'), 'true');
      const items = page.getByRole('menuitemradio');
      await items.first().waitFor();
      assert.equal(await items.count(), languages.length, 'every language of the API');
      assert.deepEqual(await page.locator('[role="menuitemradio"][aria-checked="true"]').evaluateAll((els) => els.map((el) => el.dataset.language)), ['fr']);
      await page.locator('[role="menuitemradio"][data-language="bn"]').click();
      await until(async () => (await htmlLang(page)) === 'bn', 'the page is shown in Bengali');
      assert.equal(await cookieOf(context, 'hadith_lang'), 'bn', 'saved in hadith_lang');
      assert.equal(await cookieOf(context, 'hadith_ui'), undefined, 'no interface cookie');
      await waitForH1(page, /1$/);

      await page.reload();
      await h.waitForHydration(page);
      const props = await pageProps(page);
      assert.equal(props.lang, 'bn', 'the content language');
      assert.equal(props.uiLang, 'bn', 'and the interface');
      assert.equal(await htmlLang(page), 'bn', 'kept after a reload');
      const bengali = languages.find((l) => l.code === 'bn');
      assert.equal(await menuButton(page).getAttribute('aria-label'), tr('bn', 'labelValue', { label: tr('bn', 'language'), value: bengali.nativeName }));

      // a static page (built in English) takes the language once in the browser
      await gotoAc(h, page, '/no-such-page');
      await waitForH1(page, tr('bn', 'notFoundTitle'));
      assert.equal(await htmlLang(page), 'bn');
      assert.equal(norm(await page.title()), `${tr('bn', 'notFoundTitle')} | ${tr('bn', 'siteHeadingAll')} | ${SITE_NAME}`);
    },
    { smoke: true }
  );

  h.test('ac: English beside other languages until the reader chooses; the choice is kept', async (t) => {
    const { t: tr } = await i18n();
    const bn = await api(`/books/bukhari/hadiths/1${loc('bn')}?translations=en`);
    const { page, context } = await openAc(h, t, BUKHARI_1, { locale: 'bn-BD' });
    await waitForH1(page, /1$/);
    assert.equal(await headerChip(page).getAttribute('data-translations'), 'bn,en', 'Bengali, then English');
    const english = bn.translations.find((entry) => entry.languageCode === 'en');
    const shown = await page.locator('main div[data-language="en"] [lang="en"]').first().textContent();
    assert.equal(squash(shown), squash(cleanText(english.text)), "the API's English translation");
    assert.equal(await cookieOf(context, 'hadith_tr'), undefined, 'a default, not a saved choice');

    // the reader takes English away: saved as an empty choice, and no default any more
    await headerChip(page).click();
    const dialog = page.getByRole('dialog', { name: tr('bn', 'translationsTitle') });
    await dialog.locator('li[data-language="en"] input[type="checkbox"]').uncheck();
    await dialog.getByRole('button', { name: tr('bn', 'translationsDone') }).click();
    await until(async () => (await cookieOf(context, 'hadith_tr')) === '', 'hadith_tr saved empty');
    await until(async () => (await headerChip(page).getAttribute('data-translations')) === 'bn', 'Bengali alone');
    await page.reload();
    await h.waitForHydration(page);
    assert.deepEqual((await pageProps(page)).translations, [], 'kept after a reload');
    assert.equal(await page.locator('main div[data-language="en"]').count(), 0);
  });

  h.test(
    'ac: ?lang= overrides for one view; the saved language beats the browser',
    async (t) => {
      const { t: tr, uiOf } = await i18n();
      const de = await api(`/home${loc('de')}`);
      await t.test('?lang=de', async (st) => {
        const { page } = await openAc(h, st, '/?lang=de', { locale: 'en-US' });
        const props = await pageProps(page);
        assert.equal(props.lang, 'de');
        assert.equal(props.home.language.code, de.language.code);
        assert.equal(props.uiLang, uiOf('de'), 'the interface follows the content language');
        assert.equal(await htmlLang(page), uiOf('de'));
        assert.equal(props.preferredLang, 'en', '?lang= is not saved');
      });
      await t.test('hadith_lang=fr in a Bengali browser', async (st) => {
        const { page } = await openAc(h, st, '/', { locale: 'bn-BD', cookies: [{ name: 'hadith_lang', value: 'fr' }] });
        await waitForH1(page, tr(uiOf('fr'), 'siteHeadingAll'));
        const props = await pageProps(page);
        assert.equal(props.lang, 'fr', 'the saved language');
        assert.equal(props.uiLang, uiOf('fr'), 'the interface follows it');
      });
      await t.test('an old hadith_ui cookie is ignored', async (st) => {
        const { page } = await openAc(h, st, '/', { locale: 'en-US', cookies: [{ name: 'hadith_ui', value: 'vi' }] });
        await waitForH1(page, tr('en', 'siteHeadingAll'));
        assert.equal(await htmlLang(page), 'en');
        assert.equal((await pageProps(page)).lang, 'en', 'the content follows the browser');
      });
    },
    { smoke: true }
  );

  h.test(
    'ac: the international accent and the dark logo (no ribbon under the header)',
    async (t) => {
      const settings = JSON.stringify({
        view: { arabic: true, translation: true, tafseer: true },
        fontSize: { arabic: 28, translation: 18 },
        fontFamily: { arabic: 'Amiri', translation: 'BeVietnamPro' },
        theme: 'dark',
        reader: { showArabic: true, textOrder: 'arabic' },
        verseMode: 'scroll',
        activeVerse: 1,
        autoScroll: true,
        notification: false,
        version: 4,
      });
      const { page } = await openAc(h, t, '/', { initScript: `localStorage.setItem('settings', ${JSON.stringify(settings)})` });
      const brand = await page.evaluate(() => {
        const visible = (el) => el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
        const header = [...document.querySelectorAll('div[class*="Header_header"]')].find(visible);
        const logo = header && [...header.querySelectorAll('a[aria-label] img')].find(visible);
        return {
          // the site's accent (config/countries.json), for a wordmark without a logo
          accent: getComputedStyle(document.documentElement).getPropertyValue('--brand-ribbon').trim(),
          ribbon: getComputedStyle(header, '::after').backgroundImage,
          logo: logo && new URL(logo.currentSrc || logo.src).pathname,
          loaded: logo && logo.complete && logo.naturalWidth === 2020,
          dark: document.body.classList.contains('dark'),
        };
      });
      assert.equal(brand.dark, true);
      assert.match(brand.accent, /^linear-gradient\(90deg, #0D9488, #2563EB 50%, #4F46E5\)$/i, 'teal, blue, indigo');
      assert.equal(brand.ribbon, 'none', 'the logo carries the accent; the header has no ribbon');
      assert.equal(brand.logo, '/img/logo_ac_dark.png');
      assert.equal(brand.loaded, true);
      const share = await page.getAttribute('meta[property="og:image"]', 'content');
      assert.match(share, /\/img\/s_logo_ac\.png$/);
    },
    { smoke: true }
  );
});
