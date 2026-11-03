// Getting around: previous / next hadith, the chapter switcher of the reader
// bar, chapter neighbours, the desktop sidebar, the phone menu drawer, the
// header search, back-to-top and the phone header that hides on scroll.
'use strict';

const { BASE, api, assert, loc, norm, readableCategories, scrollTo, sleep, spec, until, waitForH1, waitForText, viNumber } = require('./harness');

const BUKHARI = 'sahih-al-bukhari';

// Visible on screen (not just in the DOM): the back-to-top button and the
// phone header are hidden with visibility / a transform.
const onScreen = (locator) =>
  locator.evaluate((el) => {
    const style = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    return style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity) > 0 && box.bottom > 0 && box.top < innerHeight;
  });

module.exports = spec(module, 'navigation', (h) => {
  h.test(
    'previous / next hadith follow the API navigation and keep ?lang=',
    async (t) => {
      const [one, two] = await Promise.all([
        api(`/books/bukhari/hadiths/1${loc()}`),
        api(`/books/bukhari/hadiths/2${loc()}`),
      ]);
      assert.equal(one.navigation.previous, null);
      const { page } = await h.open(t, `/books/${BUKHARI}/hadiths/1`);
      assert.equal(await page.locator('a[rel="prev"]').count(), 0, 'no previous link on the first hadith');
      const next = page.locator('a[rel="next"]');
      assert.equal(await next.getAttribute('href'), `/books/${BUKHARI}/hadiths/${one.navigation.next.referenceNumber}`);
      assert.deepEqual(
        await next.locator(':scope > span').allTextContents().then((parts) => parts.map(norm)),
        ['Hadith sau ›', `Sahih al-Bukhari ${one.navigation.next.referenceNumber}`]
      );

      await next.click();
      await h.waitForPath(page, (url) => url.pathname === `/books/${BUKHARI}/hadiths/2`, 'next hadith');
      await waitForH1(page, 'Sahih al-Bukhari 2');
      const prev = page.locator('a[rel="prev"]');
      assert.equal(await prev.getAttribute('href'), `/books/${BUKHARI}/hadiths/${two.navigation.previous.referenceNumber}`);
      assert.equal(
        await page.locator('a[rel="next"]').getAttribute('href'),
        `/books/${BUKHARI}/hadiths/${two.navigation.next.referenceNumber}`
      );
      await prev.click();
      await h.waitForPath(page, (url) => url.pathname === `/books/${BUKHARI}/hadiths/1`, 'previous hadith');
      await waitForH1(page, 'Sahih al-Bukhari 1');

      // a one-off ?lang= is kept while reading on
      await h.goto(page, `/books/${BUKHARI}/hadiths/2?lang=en`);
      assert.equal(await page.locator('a[rel="next"]').getAttribute('href'), `/books/${BUKHARI}/hadiths/3?lang=en`);
      assert.equal(await page.locator('a[rel="prev"]').getAttribute('href'), `/books/${BUKHARI}/hadiths/1?lang=en`);
    },
    { smoke: true }
  );

  h.test('the chapter switcher in the reader bar lists every chapter and opens the chosen one', async (t) => {
    const book = await api(`/books/bukhari${loc()}`);
    const { page } = await h.open(t, `/books/${BUKHARI}/chapters/1`);
    const select = page.getByRole('combobox', { name: 'Chọn chương' });
    const options = await select.locator('option').evaluateAll((items) => items.map((o) => [o.value, o.textContent.trim()]));
    assert.deepEqual(
      options,
      book.chapters.map((c) => [String(c.chapterNo), c.chapterNo === -1 ? 'Chưa xếp chương' : `${c.chapterNo}. ${c.name}`]),
      'one option per chapter, in order'
    );
    assert.equal(await select.inputValue(), '1');

    // the bar sticks under the header while reading
    await scrollTo(page, 2500);
    await sleep(400);
    const barTop = await select.evaluate((el) => el.closest('div[class*="bar"]').getBoundingClientRect().top);
    assert.ok(barTop >= 0 && barTop <= 64, `reader bar stays at the top (top=${barTop})`);

    await select.selectOption('3');
    await h.waitForPath(page, (url) => url.pathname === `/books/${BUKHARI}/chapters/3`, 'chapter from the switcher');
    const third = book.chapters.find((c) => c.chapterNo === 3);
    await waitForH1(page, `3. ${third.name}`);
    assert.equal(await page.getByRole('combobox', { name: 'Chọn chương' }).inputValue(), '3');

    // previous / next chapter at the end of the page
    const neighbours = page.getByRole('navigation', { name: 'Chương', exact: true });
    assert.equal(await neighbours.getByRole('link', { name: 'Chương 2', exact: true }).getAttribute('href'), `/books/${BUKHARI}/chapters/2`);
    await neighbours.getByRole('link', { name: 'Chương 4', exact: true }).click();
    await h.waitForPath(page, (url) => url.pathname === `/books/${BUKHARI}/chapters/4`, 'next chapter');
    await waitForH1(page, `4. ${book.chapters.find((c) => c.chapterNo === 4).name}`);
  });

  h.test(
    'desktop sidebar: collections with chapters, the current one marked, filter',
    async (t) => {
      const [books, book] = await Promise.all([api(`/books${loc()}`), api(`/books/bukhari${loc()}`)]);
      const { page } = await h.open(t, `/books/${BUKHARI}/chapters/1`);
      const sidebar = page.locator('aside').getByRole('navigation', { name: 'Bộ sưu tập hadith' });
      await sidebar.waitFor();
      const bookLinks = sidebar.locator('a[href^="/books/"]:not([href*="/chapters/"])');
      // chapter pages load the sidebar in the browser
      await until(async () => (await bookLinks.count()) === books.length, 'sidebar collections loaded');
      await until(async () => (await sidebar.locator(`a[href^="/books/${BUKHARI}/chapters/"]`).count()) === book.chapters.length, 'sidebar chapters loaded');
      assert.deepEqual(
        await bookLinks.evaluateAll((links) => links.map((a) => a.getAttribute('href'))),
        books.map((b) => `/books/${b.slug}`),
        'every collection, in order'
      );
      const chapterLinks = sidebar.locator(`a[href^="/books/${BUKHARI}/chapters/"]`);
      assert.equal(await chapterLinks.count(), book.chapters.length, 'the open collection lists its chapters');
      const current = sidebar.locator('a[aria-current="page"]');
      assert.equal(await current.getAttribute('href'), `/books/${BUKHARI}/chapters/1`);
      assert.equal(norm(await current.textContent()), `1.${book.chapters[0].name} (${book.chapters[0].totalHadith})`);

      await sidebar.locator(`a[href="/books/${BUKHARI}/chapters/5"]`).click();
      await h.waitForPath(page, (url) => url.pathname === `/books/${BUKHARI}/chapters/5`, 'chapter from the sidebar');
      await waitForH1(page, `5. ${book.chapters.find((c) => c.chapterNo === 5).name}`);
      await until(
        async () => (await sidebar.locator('a[aria-current="page"]').getAttribute('href')) === `/books/${BUKHARI}/chapters/5`,
        'sidebar marks the new chapter'
      );

      const filter = page.locator('aside').getByRole('searchbox', { name: 'Bộ sưu tập hadith' });
      await filter.fill('muslim');
      await until(async () => (await bookLinks.count()) === 1, 'filter leaves one collection');
      assert.equal(await bookLinks.first().getAttribute('href'), '/books/sahih-muslim');
      await page.locator('aside').getByRole('button', { name: 'Xoá bộ lọc' }).click();
      await until(async () => (await bookLinks.count()) === books.length, 'clearing the filter shows all');

      // categories mode
      const [creed, every] = await Promise.all([api(`/categories/the-creed${loc()}`), api(`/categories${loc()}`)]);
      // the tree lists the categories with something to read in Vietnamese
      const all = readableCategories(every, 'vi');
      const shown = new Set(all.map((c) => c.id));
      await h.goto(page, `/categories/${creed.slug}`);
      const tree = page.locator('aside').getByRole('navigation', { name: 'Danh mục' });
      await until(async () => (await tree.locator('a[aria-current="page"]').count()) === 1, 'current category marked');
      assert.equal(await tree.locator('a[aria-current="page"]').getAttribute('href'), `/categories/${creed.slug}`);
      for (const child of creed.children.filter((c) => shown.has(c.id))) {
        // (slugs can be Arabic: hrefs are percent-encoded)
        assert.equal(await tree.locator(`a[href^="/categories/${encodeURIComponent(child.slug)}"]`).count(), 1, `child ${child.slug} shown in the open branch`);
      }
      await page.locator('aside').getByRole('searchbox', { name: 'Danh mục' }).fill('giao ly');
      const matches = all.filter((c) => /giao ly/.test(c.title.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase()));
      await until(async () => (await tree.locator('a').count()) === matches.length, `filter shows the ${matches.length} matching categories`);
    },
    { only: 'desktop' }
  );

  h.test(
    'phone menu drawer: opens, closes with Escape and the backdrop, links work',
    async (t) => {
      const { page } = await h.open(t, `/books/${BUKHARI}`);
      const menu = page.getByRole('button', { name: 'Mở menu' });
      const drawer = page.locator('.MuiDrawer-paper').filter({ has: page.locator('a[href="/privacy-policy"]') });

      await menu.click();
      await drawer.waitFor({ state: 'visible' });
      const links = await drawer.locator('a').evaluateAll((items) => items.map((a) => [a.getAttribute('href'), a.textContent.trim()]));
      const expected = [
        ['/', ''],
        ['/books', 'Bộ sưu tập hadith'],
        ['/search', 'Tìm kiếm'],
        ['/categories', 'Danh mục'],
        ['/bookmarks', 'Dấu trang'],
        ['/bookmarks', 'Đã ghim'],
        ['/bookmarks', 'Đọc gần đây'],
        ['/settings', 'Cài đặt'],
        ['/support', 'Ủng hộ'],
        ['/grateful', 'Lời cảm ơn'],
        ['/sources', 'Dữ liệu & phương pháp'],
        ['/about', 'Giới thiệu'],
        ['/contact', 'Liên hệ'],
        ['/deeniinfotech', 'Deeni Info Tech'],
        ['/privacy-policy', 'Chính sách bảo mật'],
      ];
      assert.deepEqual(links, expected, 'drawer links');
      // every link target is a real page (also when opened in a new tab)
      for (const href of new Set(expected.map(([href]) => href))) {
        const res = await fetch(BASE + href, { redirect: 'manual' });
        assert.equal(res.status, 200, `${href} answers 200`);
      }

      await page.keyboard.press('Escape');
      await drawer.waitFor({ state: 'hidden' });

      await menu.click();
      await drawer.waitFor({ state: 'visible' });
      await page.mouse.click(380, 400); // the backdrop, right of the 300px drawer
      await drawer.waitFor({ state: 'hidden' });

      // a link to a page with the same layout: the drawer must not stay open
      for (const [name, path, h1] of [
        ['Dữ liệu & phương pháp', '/sources', 'Dữ liệu & phương pháp'],
        ['Bộ sưu tập hadith', '/books', 'Bộ sưu tập hadith'],
        ['Đã ghim', '/bookmarks', 'Đã lưu'],
      ]) {
        await page.getByRole('button', { name: 'Mở menu' }).click();
        await drawer.waitFor({ state: 'visible' });
        await drawer.getByRole('link', { name, exact: true }).click();
        await h.waitForPath(page, (url) => url.pathname === path, `drawer link ${name}`);
        await waitForH1(page, h1);
        await drawer.waitFor({ state: 'hidden' }).catch(() => assert.fail(`the drawer stays open after following "${name}"`));
      }
      // "Đã ghim" opens the saved lists on the pins tab
      await until(
        async () => (await page.getByRole('tab', { name: 'Đã ghim' }).getAttribute('aria-selected')) === 'true',
        'pins tab selected'
      );

      // "Danh mục" opens the category tree over the page
      await page.getByRole('button', { name: 'Mở menu' }).click();
      await drawer.waitFor({ state: 'visible' });
      await drawer.getByRole('link', { name: 'Danh mục', exact: true }).click();
      await drawer.waitFor({ state: 'hidden' });
      const creed = await api(`/categories/the-creed${loc()}`);
      const treeLink = page.getByRole('navigation', { name: 'Danh mục' }).locator(`a[href="/categories/${creed.slug}"]`).last();
      await treeLink.waitFor({ state: 'visible' });
      await treeLink.click();
      await h.waitForPath(page, (url) => url.pathname === `/categories/${creed.slug}`, 'category from the menu');
      await waitForH1(page, creed.title);
    },
    { only: 'phone', smoke: true }
  );

  h.test('header search goes to the results', async (t) => {
    const query = 'cầu nguyện';
    const results = await api(`/search${loc()}?q=${encodeURIComponent(query)}&perPage=20`);
    const { page } = await h.open(t, '/books');
    if (h.desktop) {
      const box = page.locator('form[role="search"]').getByRole('searchbox', { name: 'Tìm kiếm' });
      await box.fill(query);
      await box.press('Enter');
    } else {
      await page.getByRole('link', { name: 'Tìm kiếm' }).first().click();
      await h.waitForPath(page, (url) => url.pathname === '/search', 'header search icon');
      await waitForH1(page, 'Tìm kiếm');
      const box = page.getByRole('searchbox', { name: 'Tìm kiếm' });
      await box.fill(query);
      await page.getByRole('button', { name: 'Tìm', exact: true }).click();
    }
    await h.waitForPath(page, (url) => url.pathname === '/search' && url.searchParams.get('q') === query, 'search results');
    await waitForText(page.locator('#search-results'), `Kết quả cho “${query}”`);
    await waitForText(page.locator('#search-results ~ p, #search-results + p, [aria-live] p').first(), `Hiển thị 1–20 trong ${viNumber(results.pagination.total)} kết quả`);
  }, { smoke: true });

  h.test(
    'desktop header: logo, collections, search on the home page, About in the ⋯ menu',
    async (t) => {
      const { page } = await h.open(t, '/');
      // the home page has its own search box: the header links to /search
      await page.getByRole('link', { name: 'Tìm kiếm', exact: true }).click();
      await h.waitForPath(page, (url) => url.pathname === '/search', 'search icon');
      await waitForH1(page, 'Tìm kiếm');
      await page.getByRole('link', { name: 'Bộ sưu tập hadith', exact: true }).first().click();
      await h.waitForPath(page, (url) => url.pathname === '/books', 'collections icon');
      await waitForH1(page, 'Bộ sưu tập hadith');
      await page.getByRole('button', { name: 'Tùy chọn khác' }).click();
      await page.getByRole('menuitem', { name: 'Giới thiệu', exact: true }).click();
      await h.waitForPath(page, (url) => url.pathname === '/about', 'About from the menu');
      await waitForH1(page, 'Giới thiệu');
      await page.getByRole('link', { name: 'Hadith.vn', exact: true }).first().click();
      await h.waitForPath(page, (url) => url.pathname === '/', 'logo');
      await waitForH1(page, 'Hadith tiếng Việt');
    },
    { only: 'desktop', smoke: true }
  );

  h.test('back to top appears on long pages and scrolls up', async (t) => {
    const { page } = await h.open(t, `/books/${BUKHARI}/chapters/1`);
    const top = page.locator('button[aria-label="Lên đầu trang"]');
    assert.equal(await onScreen(top), false, 'hidden at the top of the page');
    await scrollTo(page, 3000);
    if (h.phone) {
      // reading down on a phone: out of the way, with the header
      await sleep(400);
      assert.equal(await onScreen(top), false, 'hidden while reading down on a phone');
      await scrollTo(page, 2900);
    }
    await until(() => onScreen(top), 'back-to-top shown after scrolling');
    await top.click();
    await until(async () => (await page.evaluate(() => window.scrollY)) === 0, 'scrolled to the top');
    await until(async () => !(await onScreen(top)), 'hidden again at the top');
  });

  h.test(
    'phone back button: back in history, else up to the parent page',
    async (t) => {
      const book = await api(`/books/bukhari${loc()}`);
      // opened directly (no history): up to the chapter, then the collection, then home
      const { page } = await h.open(t, `/books/${BUKHARI}/hadiths/1`);
      const back = () => page.getByRole('button', { name: 'Quay lại' }).click();
      await back();
      await h.waitForPath(page, (url) => url.pathname === `/books/${BUKHARI}/chapters/1`, 'up to the chapter');
      await waitForH1(page, `1. ${book.chapters[0].name}`);
      await back();
      await h.waitForPath(page, (url) => url.pathname === `/books/${BUKHARI}`, 'up to the collection');
      await waitForH1(page, book.name);
      // with pages behind it, back goes back in history: here /books -> /sources -> /about
      // (a text page with its own header)
      await h.goto(page, '/books');
      await page.getByRole('contentinfo').getByRole('link', { name: 'Dữ liệu & phương pháp' }).click();
      await h.waitForPath(page, (url) => url.pathname === '/sources', 'to /sources');
      await page.getByRole('contentinfo').getByRole('link', { name: 'Giới thiệu' }).click();
      await h.waitForPath(page, (url) => url.pathname === '/about', 'to /about');
      await waitForH1(page, 'Giới thiệu');
      await back();
      await h.waitForPath(page, (url) => url.pathname === '/sources', 'back in history to /sources');
      await waitForH1(page, 'Dữ liệu & phương pháp');
      // opened directly, a text page goes up to the home page
      const { page: fresh } = await h.open(t, '/about');
      await fresh.getByRole('button', { name: 'Quay lại' }).click();
      await h.waitForPath(fresh, (url) => url.pathname === '/', 'from /about');
      await waitForH1(fresh, 'Hadith tiếng Việt');
    },
    { only: 'phone' }
  );

  h.test(
    'phone category pages: the header opens the category tree',
    async (t) => {
      const creed = await api(`/categories/the-creed${loc()}`);
      const child = creed.children.find((c) => c.totalChildren > 0);
      const { page } = await h.open(t, `/categories/${creed.slug}`);
      await page.getByRole('button', { name: 'Danh mục', exact: true }).click();
      const dialog = page.locator('div[class*="ModalSecondary_modal"]').filter({ has: page.getByRole('navigation', { name: 'Danh mục' }) });
      const link = dialog.getByRole('navigation', { name: 'Danh mục' }).locator(`a[href="/categories/${child.slug}"]`);
      await link.waitFor({ state: 'visible' });
      assert.equal(await dialog.locator('a[aria-current="page"]').getAttribute('href'), `/categories/${creed.slug}`, 'the current category is marked');
      await link.click();
      await h.waitForPath(page, (url) => url.pathname === `/categories/${child.slug}`, 'category from the tree');
      await waitForH1(page, child.title);
      await until(async () => !(await dialog.isVisible()), 'the tree closes after the link');
      // and closes with its back button
      await page.getByRole('button', { name: 'Danh mục', exact: true }).click();
      await dialog.getByRole('button', { name: 'Quay lại' }).click();
      await until(async () => !(await dialog.isVisible()), 'closed with the back button');
    },
    { only: 'phone' }
  );

  h.test(
    'phone header hides while reading down and comes back on scroll up',
    async (t) => {
      const { page } = await h.open(t, `/books/${BUKHARI}/chapters/1`);
      const menu = page.getByRole('button', { name: 'Mở menu' });
      const hidden = () => page.evaluate(() => document.documentElement.classList.contains('header-hidden'));
      assert.equal(await onScreen(menu), true, 'header shown at the top');
      await scrollTo(page, 1500);
      await until(async () => (await hidden()) && !(await onScreen(menu)), 'header slides away reading down');
      // the reader bar moves up into the header's place
      await until(
        async () => (await page.getByRole('combobox', { name: 'Chọn chương' }).evaluate((el) => el.closest('div[class*="bar"]').getBoundingClientRect().top)) < 2,
        'reader bar at the top while the header is hidden'
      );
      await scrollTo(page, 1400);
      await until(async () => !(await hidden()) && (await onScreen(menu)), 'header back on scroll up');
      await scrollTo(page, 2500);
      await until(() => hidden(), 'hidden again reading down');
      await scrollTo(page, 0);
      await until(async () => !(await hidden()), 'shown at the top');
    },
    { only: 'phone', smoke: true }
  );
});
