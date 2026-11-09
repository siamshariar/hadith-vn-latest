// A country build: the Bangladesh site (NEXT_PUBLIC_COUNTRY_CODE=bd) at BASE_BD, a second
// instance of the app (e.g. http://127.0.0.1:3001, from a git worktree; docs/DEPLOY.md).
// Its interface is Bengali (<html lang="bn">, og:locale bn_BD, the site name in the title),
// its content is requested in bn with the Bengali book names (lib/names), and a reader who
// picks English gets English content and the English interface. Skipped when BASE_BD is not
// set.
//
// Expected strings come from the catalogs (lib/locales) and the API, not from the page.
// SITE_NAME_BD: the instance's NEXT_PUBLIC_SITE_NAME, if it was started with one.
'use strict';

const path = require('node:path');
const { pathToFileURL } = require('node:url');
const countries = require('../../config/countries.json');
const { api, assert, bookName, breadcrumbs, cleanText, interfaceStrings, loc, meta, norm, spec, waitForH1, waitForText } = require('./harness');

const BASE_BD = (process.env.BASE_BD || '').replace(/\/+$/, '');
const SITE_NAME = process.env.SITE_NAME_BD || countries.bd.siteName || 'Hadith'; // lib/sites.js default
const ALLOW_ERRORS = [/status of 404/, /status of 500/];
const squash = (value) => String(value || '').replace(/\s+/g, '');

// lib/locales/bn.js is an ES module; Node says so once, which is not a test problem.
process.removeAllListeners('warning');
process.on('warning', (warning) => {
  if (warning.code !== 'MODULE_TYPELESS_PACKAGE_JSON') console.warn(warning.stack || String(warning));
});
let catalog;
async function bn() {
  catalog = catalog || import(pathToFileURL(path.join(__dirname, '..', '..', 'lib', 'locales', 'bn.js')).href);
  const { default: strings, languageNames } = await catalog;
  // what LocaleContext's t() fills in: the site name and the country's language name
  const t = (key, vars = {}) =>
    Object.entries({ site: SITE_NAME, siteLanguage: languageNames.bn, ...vars }).reduce(
      (text, [name, value]) => text.split(`{${name}}`).join(String(value)),
      strings[key]
    );
  return { t, strings, languageNames, heading: t('siteHeading') };
}

// A fresh context with a Bengali browser, then the page on the bd instance.
async function openBd(h, t, pathname, options = {}) {
  const opened = await h.open(t, null, { ...options, context: { locale: 'bn-BD', timezoneId: 'Asia/Dhaka' } });
  if (options.cookies) await opened.context.addCookies(options.cookies.map((cookie) => ({ ...cookie, url: BASE_BD })));
  const response = await opened.page.goto(BASE_BD + pathname, { waitUntil: 'domcontentloaded' });
  await h.waitForHydration(opened.page);
  return { ...opened, response };
}

const social = (page) =>
  page.evaluate(() => ({
    ogLocale: document.querySelector('meta[property="og:locale"]')?.getAttribute('content'),
    ogSiteName: document.querySelector('meta[property="og:site_name"]')?.getAttribute('content'),
    dir: document.documentElement.getAttribute('dir'),
  }));

const pageProps = (page) => page.evaluate(() => window.__NEXT_DATA__.props.pageProps);

// Texts of the elements in the page body marked with this content language.
const textsIn = (page, code) => page.locator(`main [lang="${code}"]`).evaluateAll((els) => els.map((el) => el.innerText));

module.exports = spec(module, 'country (bd)', (h) => {
  if (!BASE_BD) {
    h.test('bd site', (t) => t.skip('BASE_BD is not set (e.g. BASE_BD=http://127.0.0.1:3001, an instance built with NEXT_PUBLIC_COUNTRY_CODE=bd)'), {
      only: 'desktop',
    });
    return;
  }

  h.test(
    'bd: Bengali interface, <html lang="bn">, og:locale bn_BD and the site name in the title',
    async (t) => {
      const { t: tr, heading, strings } = await bn();
      const counts = await interfaceStrings('bn', { site: SITE_NAME, language: 'bn' });
      const book = await api(`/books/bukhari${loc('bn')}`);
      assert.equal(book.language && book.language.code, 'bn', 'the API answers the collection in bn');
      const name = bookName('bn', book);
      const { page, response } = await openBd(h, t, `/books/${book.slug}`);
      assert.equal(response.status(), 200);
      await waitForH1(page, name);

      const info = await meta(page);
      assert.equal(info.lang, 'bn', '<html lang>');
      assert.equal(norm(info.title), `${name} | ${heading} | ${SITE_NAME}`, 'title: page | বাংলা হাদিস | site name');
      const tags = await social(page);
      assert.equal(tags.ogLocale, 'bn_BD');
      assert.equal(tags.ogSiteName, SITE_NAME);
      assert.equal(tags.dir, 'ltr', 'no right-to-left interface');

      assert.deepEqual(await breadcrumbs(page), [
        { label: strings.home, href: '/' },
        { label: strings.books, href: '/books' },
        { label: name, href: null },
      ]);
      await waitForText(page.locator('#book-chapters'), counts('chapterCount', { count: book.chapters.length }));
      assert.equal(tr('siteHeading'), 'বাংলা হাদিস');
    },
    { smoke: true }
  );

  h.test(
    'bd: a Bukhari hadith is requested and shown in Bengali',
    async (t) => {
      const hadith = await api(`/books/bukhari/hadiths/1${loc('bn')}`);
      assert.equal(hadith.translation.languageCode, 'bn', 'the API has Bukhari 1 in Bengali');
      assert.equal(hadith.translation.isFallback, false);
      const { page } = await openBd(h, t, '/books/sahih-al-bukhari/hadiths/1');
      await waitForH1(page, /1$/);
      const props = await pageProps(page);
      assert.equal(props.lang, 'bn', 'the page was fetched in the country language');
      assert.equal(props.languageInfo && props.languageInfo.code, 'bn');
      const shown = await textsIn(page, 'bn');
      assert.ok(
        shown.some((text) => squash(text) === squash(cleanText(hadith.translation.text))),
        `the Bengali translation is on the page (${shown.length} bn blocks)`
      );
      assert.equal((await meta(page)).lang, 'bn');
    },
    { smoke: true }
  );

  h.test('bd: one language: ?lang=en and an old saved English preference change nothing', async (t) => {
    const ways = [
      ['?lang=en', '/books/sahih-al-bukhari/hadiths/1?lang=en', {}],
      ['the hadith_lang cookie', '/books/sahih-al-bukhari/hadiths/1', { cookies: [{ name: 'hadith_lang', value: 'en' }] }],
    ];
    for (const [how, pathname, options] of ways) {
      await t.test(how, async (st) => {
        const { page } = await openBd(h, st, pathname, options);
        await waitForH1(page, /1$/);
        assert.equal((await pageProps(page)).lang, 'bn', `${how}: content in Bengali still`);
        assert.equal((await meta(page)).lang, 'bn', `${how}: the Bengali interface`);
        assert.equal((await social(page)).ogLocale, 'bn_BD', `${how}: og:locale`);
      });
    }
  });

  h.test(
    'bd: the not-found and server-error pages are Bengali, inside the site frame',
    async (t) => {
      const { strings, heading } = await bn();
      const cases = [
        ['/no-such-page', 404, 'notFoundTitle', 'notFoundMessage'],
        ['/books/no-such-book', 404, 'notFoundTitle', 'notFoundMessage'],
        ['/books/sahih-al-bukhari/hadiths/999999', 404, 'notFoundTitle', 'notFoundMessage'],
        ['/categories/no-such-category', 404, 'notFoundTitle', 'notFoundMessage'],
        ['/500', 500, 'serverErrorTitle', 'serverErrorMessage'],
      ];
      for (const [pathname, status, titleKey, messageKey] of cases) {
        await t.test(pathname, async (st) => {
          const { page, response } = await openBd(h, st, pathname, { allow: ALLOW_ERRORS });
          assert.equal(response.status(), status, `${pathname}: HTTP ${status}`);
          await waitForH1(page, strings[titleKey]);
          const info = await meta(page);
          assert.equal(norm(info.title), `${strings[titleKey]} | ${heading} | ${SITE_NAME}`);
          assert.equal(info.lang, 'bn');
          assert.equal(info.robots, 'noindex');
          await page.getByText(strings[messageKey]).waitFor();
          const links = await page.locator('main ul a').evaluateAll((items) => items.map((a) => [a.getAttribute('href'), a.textContent.trim()]));
          assert.deepEqual(links, [
            ['/', strings.home],
            ['/books', strings.books],
            ['/categories', strings.categories],
            ['/search', strings.search],
          ]);
          assert.ok((await page.locator('a[href="/"]:not(main a)').count()) > 0, 'the site header links home');
        });
      }
    },
    { smoke: true }
  );
});
