// Each site reads in its own language (lib/api SITE_LANGUAGE): the vn site in Vietnamese, every
// page built in it. There is no language menu (header, phone header, drawer), no language
// section in the settings and no list of languages on the home page; a ?lang= in an old link and
// a language saved by an older version (the hadith_lang cookie) change nothing. Also: the
// categories with nothing in the language are left out of the lists, and still open by URL.
'use strict';

const { api, assert, loc, norm, spec, viNumber, waitForH1, waitForText } = require('./harness');

const BUKHARI = 'sahih-al-bukhari';
const htmlLang = (page) => page.evaluate(() => document.documentElement.lang);
const hrefs = (locator) => locator.evaluateAll((links) => links.map((a) => decodeURIComponent(a.getAttribute('href'))));
// anything that would let the reader pick another language
const languagePickers = (page) =>
  page.evaluate(
    () =>
      document.querySelectorAll('[data-language-menu], [id^="language-menu-"], select[name="lang"], [aria-labelledby="home-languages"]').length
  );

module.exports = spec(module, 'language', (h) => {
  h.test(
    'one language per site: no language menu anywhere; ?lang= and an old saved language change nothing',
    async (t) => {
      const hadith = await api(`/books/bukhari/hadiths/1${loc()}`);
      const { page, context } = await h.open(t, '/');
      assert.equal(await htmlLang(page), 'vi');
      assert.equal(await languagePickers(page), 0, 'no language menu or list on the home page');

      // an old link's ?lang= is ignored: the page is the Vietnamese one
      await h.goto(page, `/books/${BUKHARI}/hadiths/1?lang=bn`);
      assert.equal(await htmlLang(page), 'vi');
      await waitForH1(page, 'Sahih al-Bukhari 1');
      assert.equal(await languagePickers(page), 0, 'none on a hadith page');
      // the Vietnamese page: its English fallback, labelled
      if (hadith.translation && hadith.translation.isFallback) {
        await waitForText(page.locator('section[class*="translationBlock"] span[class*="fallbackBadge"]'), 'Bản dịch tiếng Anh');
      }

      // a language an older version saved is ignored too
      await context.addCookies([{ name: 'hadith_lang', value: 'bn', url: new URL(page.url()).origin }]);
      await h.goto(page, '/books');
      assert.equal(await htmlLang(page), 'vi');

      // the settings have no language section
      await h.goto(page, '/settings');
      assert.equal(await languagePickers(page), 0, 'none in the settings');

      // on phones, nor at the foot of the navigation drawer
      if (h.phone) {
        await h.goto(page, `/books/${BUKHARI}/chapters/1`);
        await page.locator('[class*="titleButton"]').click();
        await page.locator('.MuiDrawer-paper').waitFor();
        assert.equal(await languagePickers(page), 0, 'none in the drawer');
      }
    },
    { smoke: true }
  );

  h.test('categories with nothing in the language leave the lists; their pages still open', async (t) => {
    const all = await api(`/categories${loc()}`);
    const empty = all.filter((category) => category.totalTranslated === 0);
    const topEmpty = empty.filter((category) => {
      const parent = all.find((c) => c.id === category.parentId);
      return !category.parentId || (parent && !parent.parentId);
    });
    assert.ok(topEmpty.length > 0, 'the API has categories without Vietnamese in the first two levels');
    const hidden = new Set(empty.map((category) => `/categories/${category.slug}`));

    const { page, response } = await h.open(t, '/categories');
    assert.equal(response.status(), 200);
    const listed = (await hrefs(page.locator('main a[href^="/categories/"]'))).map((href) => href.replace(/\/hadiths$/, ''));
    assert.ok(listed.length > 0);
    assert.deepEqual(listed.filter((href) => hidden.has(href)), [], 'the category tree leaves them out');
    const kept = all.length - empty.length;
    await waitForText(page.locator('main header p[class*="meta"] span').first(), `${viNumber(kept)} danh mục`);
    if (h.desktop) {
      const row = page.locator('aside nav a, aside nav button');
      await row.first().waitFor();
      const shown = (await row.allInnerTexts()).map(norm).join('|');
      assert.deepEqual(topEmpty.filter((category) => !category.parentId && shown.includes(norm(category.title))), [], 'the navigation too');
    }

    await h.goto(page, '/');
    const home = (await hrefs(page.locator('section[aria-labelledby="home-categories"] a[href^="/categories/"]'))).map((href) =>
      href.replace(/\/hadiths$/, '')
    );
    assert.deepEqual(home.filter((href) => hidden.has(href)), [], 'the home page too');

    // their own pages still open
    const response2 = await page.goto(`${new URL(page.url()).origin}/categories/${topEmpty[0].slug}`);
    assert.equal(response2.status(), 200);
    await h.waitForHydration(page);
    await waitForH1(page, topEmpty[0].title);
  });
});
