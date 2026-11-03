// The language menu of the vn site (components/core/LanguageMenu) and what it changes: every
// language of the API, a filter, the current one marked; choosing Bengali gives the Bengali
// interface (<html lang="bn">, its strings) and the Bengali book names of the fixture
// (scripts/e2e/fixtures/names/bn.json: the instance and this run need NAMES_FIXTURE=1,
// docs/DEPLOY.md), on every page and list, while chapters keep the API's names; the topic
// collection is named by the interface (topicCollection); a language without a catalog keeps
// the site's interface and says so. Also: the categories with nothing in the content language
// are left out of the lists, except in Arabic, and still open by URL.
'use strict';

const { NAMES_FIXTURE, api, assert, breadcrumbs, interfaceStrings, loc, meta, namesOf, norm, spec, until, viNumber, waitForH1, waitForText } = require('./harness');

const BUKHARI = 'sahih-al-bukhari';
const TOPIC = 'hadeethenc';
// the name on a collection's card of the home page
const cardName = (page, slug) =>
  page.locator(`section[aria-labelledby="home-books"] a[href="/books/${slug}"] span[class*="name"]`).first().innerText().then(norm);
const menuButton = (page) => page.locator('button[data-language-menu]').filter({ visible: true }).first();
// the open panel (its name is the interface's word for "language")
const panel = (page) => page.locator('[role="dialog"][id^="language-menu-"]');
const rows = (page) => page.locator('[role="menuitemradio"]');
const htmlLang = (page) => page.evaluate(() => document.documentElement.lang);

async function openMenu(page) {
  await menuButton(page).click();
  await rows(page).first().waitFor();
  return panel(page);
}

// Picks a language in the menu and waits for the page to be in it.
async function choose(page, code, ui) {
  const dialog = await openMenu(page);
  await dialog.locator('input[type="search"]').fill(code === 'bn' ? 'beng' : code === 'id' ? 'indo' : code === 'vi' ? 'viet' : code);
  await dialog.locator(`[role="menuitemradio"][data-language="${code}"]`).click();
  await until(async () => (await htmlLang(page)) === ui && (await menuButton(page).getAttribute('data-language-menu')) === code, `the page in ${code}`);
  await page.waitForLoadState('networkidle');
}

const hrefs = (locator) => locator.evaluateAll((links) => links.map((a) => decodeURIComponent(a.getAttribute('href'))));

module.exports = spec(module, 'language menu', (h) => {
  h.test(
    'the menu: every language of the API by its own name, a filter, the current one marked',
    async (t) => {
      const languages = await api('/languages');
      const english = languages.find((l) => l.code === 'en');
      const { page } = await h.open(t, `/books/${BUKHARI}`);
      const button = menuButton(page);
      assert.equal(await button.getAttribute('aria-label'), 'Ngôn ngữ: Tiếng Việt');
      assert.equal(await button.getAttribute('aria-haspopup'), 'dialog');
      assert.equal(await button.getAttribute('aria-expanded'), 'false');
      const box = await button.boundingBox();
      assert.ok(box.width >= 44 && box.height >= 44, `a 44px tap target (${box.width}x${box.height})`);

      const dialog = await openMenu(page);
      assert.equal(await button.getAttribute('aria-expanded'), 'true');
      assert.equal(await rows(page).count(), languages.length, 'every language of /hadith/languages');
      const codes = await rows(page).evaluateAll((els) => els.map((el) => el.dataset.language));
      assert.deepEqual(codes.slice(0, 2), ['vi', 'en'], "the site's language, then English");
      assert.deepEqual(await dialog.locator('[aria-checked="true"]').evaluateAll((els) => els.map((el) => el.dataset.language)), ['vi']);
      // own name, then the name in the interface (the catalog's: "Tiếng Anh") and the count
      const row = await dialog.locator('[data-language="en"]').innerText();
      assert.deepEqual(row.split('\n').map(norm).filter(Boolean), ['English', `Tiếng Anh · ${viNumber(english.totalTranslated)} hadith đã dịch`]);
      const heights = await rows(page).evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
      assert.ok(heights.every((height) => height >= 44), `rows of 44px at least (smallest ${Math.min(...heights)})`);

      // the filter: own, interface and English names, and the code
      const filter = dialog.locator('input[type="search"]');
      const shown = async () => rows(page).evaluateAll((els) => els.map((el) => el.dataset.language));
      for (const [query, code] of [['anh', 'en'], ['বাংলা', 'bn'], ['indon', 'id'], ['pt', 'pt']]) {
        await filter.fill(query);
        await until(async () => (await shown()).includes(code), `"${query}" finds ${code}`);
      }
      await filter.fill('zzqx');
      await waitForText(dialog.getByRole('status'), 'Không có ngôn ngữ nào khớp “zzqx”.');

      if (h.desktop) {
        // a panel under the button; the filter has the focus, the list follows it
        await filter.fill('');
        assert.equal(await page.evaluate(() => document.activeElement.getAttribute('type')), 'search');
        await page.keyboard.press('ArrowDown');
        assert.equal(await page.evaluate(() => document.activeElement.dataset.language), 'vi');
        await page.keyboard.press('ArrowDown');
        assert.equal(await page.evaluate(() => document.activeElement.dataset.language), 'en');
        await page.keyboard.press('Escape');
        await until(async () => (await button.getAttribute('aria-expanded')) === 'false', 'closed');
        assert.equal(await page.evaluate(() => document.activeElement.dataset.languageMenu), 'vi', 'the focus is back on the button');
      } else {
        // a full-height sheet, closed by its 44px button
        assert.equal(await dialog.getAttribute('aria-labelledby') && (await dialog.locator('h2').innerText()), 'Ngôn ngữ');
        await until(
          () => dialog.evaluate((el) => {
            const box = el.getBoundingClientRect();
            return Math.abs(box.top) < 2 && Math.abs(box.bottom - window.innerHeight) < 2;
          }),
          'the sheet fills the screen'
        );
        const close = dialog.getByRole('button', { name: 'Đóng' });
        const closeBox = await close.boundingBox();
        assert.ok(closeBox.width >= 44 && closeBox.height >= 44);
        await close.click();
        await dialog.waitFor({ state: 'hidden' });
      }
    },
    { smoke: true }
  );

  h.test(
    'Bengali on the vn site: the Bengali interface and book names, everywhere; chapters keep the API names',
    async (t) => {
      const bn = await interfaceStrings('bn');
      const vi = await interfaceStrings('vi');
      const [book, chapter1, chapter2, books] = await Promise.all([
        api(`/books/bukhari${loc('bn')}`),
        api(`/books/bukhari/chapters/1${loc('bn')}?perPage=1`),
        api(`/books/bukhari/chapters/2${loc('bn')}?perPage=1`),
        api(`/books${loc('bn')}`),
      ]);
      const names = namesOf('bn');
      // a book the names (lib/names, or the fixture's two) do not have, nor the interface
      const unnamed = books.find((b) => !(names.books || {})[b.slug] && b.slug !== 'hadeethenc');
      const fixture = NAMES_FIXTURE && names.books && names.books[BUKHARI];
      const name = (names.books || {})[BUKHARI] || book.name;

      const { page, context } = await h.open(t, `/books/${BUKHARI}`, { allow: [/status of 404/] });
      await choose(page, 'bn', 'bn');
      assert.equal((await context.cookies()).find((c) => c.name === 'hadith_lang').value, 'bn', 'saved in hadith_lang');
      await waitForH1(page, name);
      const info = await meta(page);
      assert.equal(info.lang, 'bn');
      assert.equal(norm(info.title), `${name} | ${bn('siteHeading')} | Hadith.vn`);
      assert.deepEqual(await breadcrumbs(page), [
        { label: bn('home'), href: '/' },
        { label: bn('books'), href: '/books' },
        { label: name, href: null },
      ]);
      await waitForText(page.locator('#book-chapters'), bn('chapterCount', { count: book.chapters.length }));
      const chapterRows = (await page.locator('#book-chapters + ol li').allInnerTexts()).map(norm);
      assert.ok(chapterRows[0].includes(norm(book.chapters[0].name)), `chapter 1 keeps the API name: ${chapterRows[0]}`);
      if (h.desktop) {
        const sidebar = (await page.locator('aside div[class*="sidebar_branch"] > a').allInnerTexts()).map(norm);
        assert.ok(sidebar.some((text) => text.startsWith(name)), 'the sidebar names the book');
        assert.ok(sidebar.some((text) => text.startsWith(unnamed.name)), `a book the names do not have keeps the API name (${unnamed.slug})`);
      }
      if (!fixture) t.diagnostic('NAMES_FIXTURE is not set: the names expected are those of lib/names/bn.json, else the API');

      // a hadith: citation, breadcrumbs and the reader bar
      await h.goto(page, `/books/${BUKHARI}/hadiths/1`);
      await waitForH1(page, `${name} 1`);
      assert.deepEqual(
        (await breadcrumbs(page)).map((crumb) => crumb.label),
        [bn('home'), bn('books'), name, bn('chapterNumber', { number: 1 }), bn('hadithNumbered', { number: 1 })]
      );
      assert.equal(norm(await page.title()), `${name} 1 | ${bn('siteHeading')} | Hadith.vn`);
      const bar = (await page.locator('[class*="ReaderBar"] a').allInnerTexts()).map(norm);
      assert.ok(bar.includes(norm(bn('chapterNumberName', { number: 1, name: chapter1.chapter.name }))), `reader bar: ${bar.join(' | ')}`);

      // a chapter: the API's name in the title and the h1, the book's in Bengali
      await h.goto(page, `/books/${BUKHARI}/chapters/2`);
      await waitForH1(page, `2. ${chapter2.chapter.name}`);
      assert.ok(norm(await page.title()).startsWith(`${norm(chapter2.chapter.name)} - ${name} |`));

      // the last-read entry (stored with the source's name) is named in the reader's language
      await h.goto(page, '/');
      await waitForText(page.locator('a[class*="ContinueReading_card"] span[class*="title"]'), `${name} 1`);
      // the books are named in the home page's lists too
      assert.equal(await cardName(page, BUKHARI), name);
      // the topic collection: the interface's name for it
      assert.equal(await cardName(page, TOPIC), bn('topicCollection'));
      await h.goto(page, `/books/${TOPIC}`);
      await waitForH1(page, bn('topicCollection'));

      // the static 404 page switches to Bengali in the browser
      await h.goto(page, '/no-such-page');
      await waitForH1(page, bn('notFoundTitle'));
      // <html lang> follows in an effect right after that render (LocaleContext)
      await until(async () => (await htmlLang(page)) === 'bn', '<html lang> in Bengali');

      // a language without a catalog: the Vietnamese interface, on purpose, and the menu says so
      await h.goto(page, `/books/${BUKHARI}`);
      await choose(page, 'id', 'vi');
      const dialog = await openMenu(page);
      await waitForText(dialog.locator('[aria-checked="true"] [data-interface-note]'), 'Giao diện: Tiếng Việt');
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      await h.goto(page, '/');
      assert.equal(await cardName(page, TOPIC), vi('topicCollection'), 'the topic collection in the Vietnamese interface');

      // and back: Vietnamese, with the API's names
      await h.goto(page, `/books/${BUKHARI}`);
      await choose(page, 'vi', 'vi');
      await waitForH1(page, (await api(`/books/bukhari${loc()}`)).name);
      await h.goto(page, '/');
      await waitForText(page.locator('a[class*="ContinueReading_card"] span[class*="title"]'), 'Sahih al-Bukhari 1');
      assert.equal(await cardName(page, TOPIC), vi('topicCollection'));
    },
    { smoke: true }
  );

  h.test('categories with nothing in the language leave the lists, except in Arabic; their pages still open', async (t) => {
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
    const listed = await hrefs(page.locator('main ol a[href^="/categories/"]'));
    assert.ok(listed.length > 0);
    assert.deepEqual(listed.filter((href) => hidden.has(href)), [], 'the category tree leaves them out');
    const kept = all.length - empty.length;
    await waitForText(page.locator('main header p[class*="meta"] span').first(), `${viNumber(kept)} danh mục`);
    if (h.desktop) {
      await page.locator('aside nav a[href^="/categories/"]').first().waitFor();
      assert.deepEqual((await hrefs(page.locator('aside nav a[href^="/categories/"]'))).filter((href) => hidden.has(href)), [], 'the sidebar too');
    }

    await h.goto(page, '/');
    const home = await hrefs(page.locator('section[aria-labelledby="home-categories"] a[href^="/categories/"]'));
    assert.deepEqual(home.filter((href) => hidden.has(href)), [], 'the home page too');

    // Arabic, the original: every category
    await h.goto(page, '/categories?lang=ar');
    const arabic = await hrefs(page.locator('main ol a[href^="/categories/"]'));
    assert.ok(topEmpty.every((category) => arabic.includes(`/categories/${category.slug}`)), 'Arabic lists them all');

    // their own pages still open
    const response2 = await page.goto(`${new URL(page.url()).origin}/categories/${topEmpty[0].slug}`);
    assert.equal(response2.status(), 200);
    await h.waitForHydration(page);
    await waitForH1(page, topEmpty[0].title);
  });
});
