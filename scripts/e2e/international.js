// The international edition: the ac site (NEXT_PUBLIC_COUNTRY_CODE=ac, Hadith.ac) at BASE_AC,
// another instance of the app (e.g. http://127.0.0.1:3002, from a git worktree; docs/DEPLOY.md).
// Its pages are built in English, whatever the browser asks for (each site has one language,
// lib/api SITE_LANGUAGE), with no language menu; what makes it international is the translations
// chip, which adds up to two more languages under every hadith, in the browser
// (contexts/ExtraTranslationsContext), saved in the hadith_tr cookie, and a link's ?tr= that
// shows them for one visit. Skipped when BASE_AC is not set.
'use strict';

const countries = require('../../config/countries.json');
const { assert, spec, until, waitForH1 } = require('./harness');

const BASE_AC = (process.env.BASE_AC || '').replace(/\/+$/, '');
const BUKHARI_1 = '/books/sahih-al-bukhari/hadiths/1';
const CHAPTER = '/books/sahih-al-bukhari/chapters/1';

// Readers whose browsers ask for other languages: they get the English site all the same.
const READERS = ['en-US', 'bn-BD', 'vi-VN', 'ur-PK'];

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

const htmlLang = (page) => page.evaluate(() => document.documentElement.lang);
const cookieOf = async (context, name) => {
  const found = (await context.cookies(BASE_AC)).find((c) => c.name === name);
  return found ? decodeURIComponent(found.value) : undefined;
};
// the translations chip (the chapter's toolbar, a hadith page's header)
const chip = (page) => page.locator('main button[data-translations]').filter({ visible: true }).first();
// translation blocks of a language in the hadiths
const blocksIn = (page, code) => page.locator(`main article [lang="${code}"]`).count();

module.exports = spec(module, 'international (ac)', (h) => {
  if (!BASE_AC) {
    h.test('ac site', (t) => t.skip('BASE_AC is not set (e.g. BASE_AC=http://127.0.0.1:3002, an instance built with NEXT_PUBLIC_COUNTRY_CODE=ac)'), {
      only: 'desktop',
    });
    return;
  }

  h.test(
    'ac: English pages for every reader, whatever the browser asks for; no language menu',
    async (t) => {
      for (const locale of READERS) {
        const { page, context } = await openAc(h, t, BUKHARI_1, { locale });
        assert.equal(await htmlLang(page), 'en', locale);
        await waitForH1(page, 'Sahih al-Bukhari 1');
        assert.equal(await page.locator('[data-language-menu], [id^="language-menu-"]').count(), 0, `no language menu (${locale})`);
        await context.close();
      }
    },
    { smoke: true }
  );

  h.test(
    'ac: the translations chip adds a language in the browser, saved and kept; ?tr= shows one for one visit',
    async (t) => {
      const { page, context } = await openAc(h, t, CHAPTER);
      assert.equal(await blocksIn(page, 'bn'), 0, 'English alone at first');
      await chip(page).click();
      const bn = page.locator('.MuiDrawer-paper li[data-language="bn"] input[type="checkbox"]');
      await bn.waitFor();
      await bn.check();
      await page.keyboard.press('Escape');
      await until(async () => (await blocksIn(page, 'bn')) > 0, 'Bengali under the hadiths');
      assert.equal(await cookieOf(context, 'hadith_tr'), 'bn', 'the choice is saved');
      assert.match(await chip(page).getAttribute('data-translations'), /^en,bn$/);

      await page.reload({ waitUntil: 'domcontentloaded' });
      await h.waitForHydration(page);
      await until(async () => (await blocksIn(page, 'bn')) > 0, 'kept after a reload');
      await gotoAc(h, page, BUKHARI_1);
      await until(async () => (await blocksIn(page, 'bn')) > 0, 'and on a hadith page');

      // a shared link's ?tr= in another browser: for that visit, not saved
      const other = await openAc(h, t, `${CHAPTER}?tr=ur`);
      await until(async () => (await blocksIn(other.page, 'ur')) > 0, 'Urdu from the link');
      assert.equal(await cookieOf(other.context, 'hadith_tr'), undefined, 'a link does not save it');
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
