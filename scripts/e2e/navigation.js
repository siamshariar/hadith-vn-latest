// Getting around: previous / next hadith and chapter, the navigation on the web (the side
// card and its rail) and on phones (the drawer), the header search, back-to-top and the
// header that hides on scroll.
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
    'previous / next hadith follow the API navigation, in the Quran sites\' pager',
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
      assert.equal(norm(await next.textContent()), `Sahih al-Bukhari ${one.navigation.next.referenceNumber}`);

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
    },
    { smoke: true }
  );

  h.test('one pager at the end of the page: the pages of a chapter, then the chapters before and after by name', async (t) => {
    const [book, third] = await Promise.all([api(`/books/bukhari${loc()}`), api(`/books/bukhari/chapters/3${loc()}?perPage=20`)]);
    const last = third.pagination.lastPage;
    assert.ok(last > 1, 'chapter 3 has pages');
    const { page } = await h.open(t, `/books/${BUKHARI}/chapters/3`);
    const chapter3 = book.chapters.find((c) => c.chapterNo === 3);
    await waitForH1(page, `3. ${chapter3.name}`);
    const pager = page.getByRole('navigation', { name: 'Chương', exact: true });
    const second = book.chapters.find((c) => c.chapterNo === 2);
    const fourth = book.chapters.find((c) => c.chapterNo === 4);
    assert.equal(await page.getByRole('navigation', { name: 'Trang', exact: true }).count(), 0, 'no second pagination');
    // its first page: back to chapter 2 by name, on to its page 2
    assert.equal(await pager.locator('a[rel="prev"]').getAttribute('href'), `/books/${BUKHARI}/chapters/2`);
    assert.equal(norm(await pager.locator('a[rel="prev"]').textContent()), `2. ${second.name}`);
    assert.equal(await pager.locator('a[rel="next"]').getAttribute('href'), `/books/${BUKHARI}/chapters/3/page/2`);
    assert.equal(norm(await pager.locator('span[class*="count"]').textContent()), `Trang 1/${last}`);
    // its last page: on to chapter 4 by name
    await h.goto(page, `/books/${BUKHARI}/chapters/3/page/${last}`);
    assert.equal(await pager.locator('a[rel="prev"]').getAttribute('href'), last > 2 ? `/books/${BUKHARI}/chapters/3/page/${last - 1}` : `/books/${BUKHARI}/chapters/3`);
    assert.equal(norm(await pager.locator('a[rel="next"]').textContent()), `4. ${fourth.name}`);
    await pager.locator('a[rel="next"]').click();
    await h.waitForPath(page, (url) => url.pathname === `/books/${BUKHARI}/chapters/4`, 'next chapter');
    await waitForH1(page, `4. ${fourth.name}`);
  });

  h.test(
    'the web navigation: tabs, one level at a time, the current one marked, filter',
    async (t) => {
      const [books, book] = await Promise.all([api(`/books${loc()}`), api(`/books/bukhari${loc()}`)]);
      const { page } = await h.open(t, `/books/${BUKHARI}/chapters/1`);
      const aside = page.locator('aside');
      const sidebar = aside.getByRole('navigation', { name: 'Bộ sưu tập hadith' });
      // the page comes with the navigation: the open book's chapters, the current one marked
      const chapterLinks = sidebar.locator(`a[href^="/books/${BUKHARI}/chapters/"]`);
      assert.equal(await chapterLinks.count(), book.chapters.length, 'the open collection lists its chapters');
      assert.equal(await aside.getByRole('tab', { name: 'Bộ sưu tập hadith' }).getAttribute('aria-selected'), 'true');
      const current = sidebar.locator('a[aria-current="page"]');
      assert.equal(await current.getAttribute('href'), `/books/${BUKHARI}/chapters/1`);
      assert.equal(norm(await current.textContent()), `1${book.chapters[0].name}${book.chapters[0].totalHadith}`);

      await sidebar.locator(`a[href="/books/${BUKHARI}/chapters/5"]`).click();
      await h.waitForPath(page, (url) => url.pathname === `/books/${BUKHARI}/chapters/5`, 'chapter from the navigation');
      await waitForH1(page, `5. ${book.chapters.find((c) => c.chapterNo === 5).name}`);
      await until(
        async () => (await sidebar.locator('a[aria-current="page"]').getAttribute('href')) === `/books/${BUKHARI}/chapters/5`,
        'the navigation marks the new chapter'
      );

      // up: every collection, in order, the open one marked; a collection opens its page (its
      // chapters on the right) and the list goes down into it
      assert.equal(await aside.locator(`a[href="/books/${BUKHARI}"]`).count(), 1, 'the level links to the collection');
      await aside.getByRole('button', { name: 'Quay lại' }).click();
      const bookRows = sidebar.locator('a[href^="/books/"]:not([href*="/chapters/"])');
      await until(async () => (await bookRows.count()) === books.length, 'every collection');
      assert.equal(await sidebar.locator('a[aria-current="true"]').count(), 1, 'the open collection marked');
      await bookRows.filter({ hasText: books.find((b) => b.slug === 'sahih-muslim').name }).click();
      await h.waitForPath(page, (url) => url.pathname === '/books/sahih-muslim', 'the collection\'s page');
      await until(async () => (await sidebar.locator('a[href^="/books/sahih-muslim/chapters/"]').count()) > 10, 'Muslim\'s chapters in the list');
      assert.ok((await page.locator('main a[href^="/books/sahih-muslim/chapters/"]').count()) > 10, 'and on the page');
      await aside.getByRole('button', { name: 'Quay lại' }).click();

      const filter = aside.getByRole('searchbox', { name: 'Bộ sưu tập hadith' });
      await filter.fill('muslim');
      await until(async () => (await bookRows.count()) === 1, 'filter leaves one collection');
      await aside.getByRole('button', { name: 'Xoá bộ lọc' }).click();
      await until(async () => (await bookRows.count()) === books.length, 'clearing the filter shows all');

      // categories: the tab of a category page, the level of the current one
      const [creed, every] = await Promise.all([api(`/categories/the-creed${loc()}`), api(`/categories${loc()}`)]);
      // the lists show the categories with something to read in Vietnamese
      const all = readableCategories(every, 'vi');
      const shown = new Set(all.map((c) => c.id));
      await h.goto(page, `/categories/${creed.slug}`);
      const tree = aside.getByRole('navigation', { name: 'Danh mục' });
      assert.equal(await aside.getByRole('tab', { name: 'Danh mục' }).getAttribute('aria-selected'), 'true');
      assert.equal(await aside.locator(`a[aria-current="page"][href="/categories/${creed.slug}"]`).count(), 1, 'the level is the current category');
      const children = creed.children.filter((c) => shown.has(c.id));
      await until(async () => (await tree.locator('a, button').count()) === children.length, 'its subcategories');
      await aside.getByRole('searchbox', { name: 'Danh mục' }).fill('giao ly');
      const matches = all.filter((c) => /giao ly/.test(c.title.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase()));
      await until(async () => (await tree.locator('a').count()) === matches.length, `filter shows the ${matches.length} matching categories`);

      // the tabs are a tablist: the arrow keys move
      await aside.getByRole('tab', { name: 'Danh mục' }).focus();
      await page.keyboard.press('ArrowLeft');
      await until(async () => (await aside.getByRole('tab', { name: 'Bộ sưu tập hadith' }).getAttribute('aria-selected')) === 'true', 'arrow key to the other tab');
    },
    { only: 'desktop' }
  );

  h.test(
    'from chapter to chapter the filter stays (it is in the path); an old ?translated=1 link is sent there',
    async (t) => {
      const { page } = await h.open(t, `/books/${BUKHARI}/chapters/1/translated`);
      assert.equal(await page.locator(`aside a[href="/books/${BUKHARI}/chapters/2/translated"]`).count(), 1, 'in the navigation');
      const next = page.locator('a[rel="next"]').last();
      assert.equal(await next.getAttribute('href'), `/books/${BUKHARI}/chapters/2/translated`, 'in the pager');
      const old = await fetch(`${BASE}/books/${BUKHARI}/chapters/8?translated=1&page=2`, { redirect: 'manual' });
      assert.equal(old.status, 308, 'the old link redirects, permanently');
      assert.equal(new URL(old.headers.get('location'), BASE).pathname, `/books/${BUKHARI}/chapters/8/translated/page/2`);
    },
    { only: 'desktop' }
  );

  h.test(
    'with keyboard focus in the header it stays, and the navigation stays below it',
    async (t) => {
      const { page } = await h.open(t, `/books/${BUKHARI}/chapters/1`);
      const hidden = () => page.evaluate(() => document.documentElement.classList.contains('header-hidden'));
      // the logo, then Tab: the search icon has keyboard focus
      await page.getByRole('link', { name: 'Hadith.vn', exact: true }).first().focus();
      await page.keyboard.press('Tab');
      const icon = page.locator('[data-site-header] a[href="/search"]').filter({ visible: true }).first();
      await until(async () => icon.evaluate((el) => el === document.activeElement), 'the search icon has the focus');
      await scrollTo(page, 1500);
      await sleep(500);
      assert.equal(await hidden(), false, 'the header stays while it has keyboard focus');
      const top = await page.evaluate(() => Math.round(document.querySelector('aside').getBoundingClientRect().top));
      assert.equal(top, 90, 'and the card is below it');
      await icon.evaluate((el) => el.blur());
      await scrollTo(page, 2500);
      await until(() => hidden(), 'away once focus has left');
      // Tab into the hidden header: it comes back
      await page.getByRole('link', { name: 'Hadith.vn', exact: true }).first().focus();
      await until(async () => !(await hidden()), 'back when focus goes into it');
    },
    { only: 'desktop' }
  );

  h.test(
    'the web navigation closes to the rail: quran.vn\'s frame, remembered, each icon opens it',
    async (t) => {
      const { page } = await h.open(t, `/books/${BUKHARI}/chapters/1`, { context: { viewport: { width: 1440, height: 900 } } });
      const frame = () =>
        page.evaluate(() => {
          const side = document.querySelector('aside').getBoundingClientRect();
          const card = document.querySelector('main div[class*="Page_page"]').getBoundingClientRect();
          return { navX: Math.round(side.left), navW: Math.round(side.width), cardX: Math.round(card.left), cardW: Math.round(card.width), gap: Math.round(card.left - side.right) };
        });
      assert.deepEqual(await frame(), { navX: 92, navW: 300, cardX: 408, cardW: 940, gap: 16 }, 'open: the nav beside the card');
      const close = page.locator('aside').getByRole('button', { name: 'Đóng', exact: true });
      assert.equal(await close.getAttribute('aria-expanded'), 'true');
      await close.click();
      await until(async () => (await frame()).navW === 70, 'closed to the 70px rail');
      assert.deepEqual(await frame(), { navX: 207, navW: 70, cardX: 293, cardW: 940, gap: 16 }, 'rail and card where quran.vn has them');
      await until(() => page.evaluate(() => document.activeElement.getAttribute('aria-expanded') === 'false'), 'focus on the button that opens it');

      // remembered, on another page too, and on <html> before the page's scripts run
      await h.goto(page, `/books/${BUKHARI}/chapters/2`);
      assert.equal((await frame()).navW, 70, 'still closed on the next page');
      const early = await page.evaluate(() => performance.getEntriesByType('navigation').length);
      assert.equal(early, 1);
      assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-nav')), 'closed');

      // each icon opens the panel on what it says
      await page.locator('aside').getByRole('button', { name: 'Danh mục', exact: true }).click();
      await until(async () => (await frame()).navW === 300, 'open again');
      assert.equal(await page.locator('aside').getByRole('tab', { name: 'Danh mục' }).getAttribute('aria-selected'), 'true');
      assert.equal(await page.evaluate(() => localStorage.getItem('hadith-nav')), null, 'the choice is saved');
      await until(() => page.evaluate(() => document.activeElement.getAttribute('role') === 'tab'), 'focus on the tab, not the filter');
    },
    { only: 'desktop', smoke: true }
  );

  h.test(
    'the phone drawer: from the title, the current place marked, closes with Escape, the page and a link',
    async (t) => {
      const book = await api(`/books/bukhari${loc()}`);
      const { page } = await h.open(t, `/books/${BUKHARI}/chapters/1`);
      const title = page.getByRole('button', { name: `1. ${book.chapters[0].name}` });
      const drawer = page.locator('.MuiDrawer-paper').filter({ has: page.locator('a[href="/privacy-policy"]') });

      await title.click();
      await drawer.waitFor({ state: 'visible' });
      await until(async () => (await drawer.boundingBox()).x === 0, 'slides in from the left');
      assert.equal((await drawer.boundingBox()).width, 346, 'leaving 44px of a 390px screen');
      assert.equal(await drawer.locator('a[aria-current="page"]').getAttribute('href'), `/books/${BUKHARI}/chapters/1`);
      const links = await drawer.locator('ul a').evaluateAll((items) => items.map((a) => a.getAttribute('href')));
      assert.deepEqual(links, ['/sources', '/about', '/support', '/grateful', '/contact', '/privacy-policy'], 'the site\'s other pages');
      // every link target is a real page (also when opened in a new tab)
      for (const href of links) {
        const res = await fetch(BASE + href, { redirect: 'manual' });
        assert.equal(res.status, 200, `${href} answers 200`);
      }

      await page.keyboard.press('Escape');
      await drawer.waitFor({ state: 'hidden' });
      await title.click();
      await drawer.waitFor({ state: 'visible' });
      await page.mouse.click(380, 400); // the page, right of the drawer
      await drawer.waitFor({ state: 'hidden' });
      await title.click();
      await drawer.waitFor({ state: 'visible' });
      await drawer.getByRole('button', { name: 'Đóng', exact: true }).click();
      await drawer.waitFor({ state: 'hidden' });

      // a link to a page with the same layout: the drawer must not stay open
      await title.click();
      await drawer.waitFor({ state: 'visible' });
      await drawer.locator(`a[href="/books/${BUKHARI}/chapters/3"]`).click();
      await h.waitForPath(page, (url) => url.pathname === `/books/${BUKHARI}/chapters/3`, 'chapter from the drawer');
      await waitForH1(page, `3. ${book.chapters.find((c) => c.chapterNo === 3).name}`);
      await drawer.waitFor({ state: 'hidden' }).catch(() => assert.fail('the drawer stays open after following a link'));

      // the saved lists and the site's pages from it
      await page.getByRole('button', { name: `3. ${book.chapters.find((c) => c.chapterNo === 3).name}` }).click();
      await drawer.waitFor({ state: 'visible' });
      await drawer.getByRole('link', { name: 'Đã lưu', exact: true }).click();
      await h.waitForPath(page, (url) => url.pathname === '/bookmarks', 'Saved from the drawer');
      await waitForH1(page, 'Đã lưu');
      await drawer.waitFor({ state: 'hidden' });

      // the home page opens it from its menu button, on what the language has most
      await h.goto(page, '/');
      await page.getByRole('button', { name: 'Mở menu' }).click();
      await drawer.waitFor({ state: 'visible' });
      assert.equal(await drawer.getByRole('tab', { name: 'Danh mục' }).getAttribute('aria-selected'), 'true', 'Vietnamese leads with the categories');
    },
    { only: 'phone', smoke: true }
  );

  h.test('header search goes to the results', async (t) => {
    const query = 'cầu nguyện';
    const results = await api(`/search${loc()}?q=${encodeURIComponent(query)}&perPage=20`);
    const { page } = await h.open(t, '/books');
    // the header's search icon, on the web and on phones: the search page, its field ready
    await page.locator('[data-site-header]').getByRole('link', { name: 'Tìm kiếm' }).filter({ visible: true }).first().click();
    await h.waitForPath(page, (url) => url.pathname === '/search', 'header search icon');
    await waitForH1(page, 'Tìm kiếm');
    const box = page.getByRole('searchbox', { name: 'Tìm kiếm' });
    await until(async () => box.evaluate((el) => el === document.activeElement), 'the field has the focus');
    await box.fill(query);
    await page.getByRole('button', { name: 'Tìm', exact: true }).click();
    await h.waitForPath(page, (url) => url.pathname === '/search' && url.searchParams.get('q') === query, 'search results');
    await waitForText(page.locator('#search-results'), `Kết quả cho “${query}”`);
    await waitForText(page.locator('#search-results ~ p, #search-results + p, [aria-live] p').first(), `Hiển thị 1–20 trong ${viNumber(results.pagination.total)} kết quả`);
  }, { smoke: true });

  h.test(
    'desktop header: logo, the search icon, About in the ⋯ menu; text pages in the reading frame',
    async (t) => {
      const { page } = await h.open(t, '/');
      await page.locator('[data-site-header]').getByRole('link', { name: 'Tìm kiếm', exact: true }).filter({ visible: true }).click();
      await h.waitForPath(page, (url) => url.pathname === '/search', 'search icon');
      await waitForH1(page, 'Tìm kiếm');
      await page.getByRole('button', { name: 'Tùy chọn khác' }).click();
      await page.getByRole('menuitem', { name: 'Giới thiệu', exact: true }).click();
      await h.waitForPath(page, (url) => url.pathname === '/about', 'About from the menu');
      await waitForH1(page, 'Giới thiệu');
      // a text page as the reading pages: the navigation card beside it, the title bar, the trail
      await page.locator('aside').getByRole('link').first().waitFor({ state: 'visible' });
      assert.equal(await page.locator('main nav[aria-label] [aria-current="page"]').innerText(), 'Giới thiệu');
      assert.equal(await page.locator('[data-site-header] nav').count(), 0, 'no section words in the header');
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
    'phone category pages: the title opens the drawer on the categories, one level at a time',
    async (t) => {
      const creed = await api(`/categories/the-creed${loc()}`);
      const child = creed.children.find((c) => c.totalChildren > 0);
      const { page } = await h.open(t, `/categories/${creed.slug}`);
      await page.getByRole('button', { name: creed.title, exact: true }).click();
      const drawer = page.locator('.MuiDrawer-paper').filter({ has: page.locator('a[href="/privacy-policy"]') });
      await drawer.waitFor({ state: 'visible' });
      assert.equal(await drawer.getByRole('tab', { name: 'Danh mục' }).getAttribute('aria-selected'), 'true');
      assert.equal(await drawer.locator(`a[aria-current="page"][href="/categories/${creed.slug}"]`).count(), 1, 'the level is the current category');
      // a subcategory with its own: a link to its page (its subcategories), the drawer closes
      await drawer.getByRole('link', { name: new RegExp(child.title) }).first().click();
      await h.waitForPath(page, (url) => decodeURIComponent(url.pathname) === `/categories/${child.slug}`, 'category from the drawer');
      await waitForH1(page, child.title);
      await drawer.waitFor({ state: 'hidden' });
    },
    { only: 'phone' }
  );

  h.test(
    'the header hides while reading down and comes back on scroll up',
    async (t) => {
      const { page } = await h.open(t, `/books/${BUKHARI}/chapters/1`);
      const search = page.getByRole('link', { name: 'Tìm kiếm', exact: true }).or(page.getByRole('button', { name: 'Tìm', exact: true })).first();
      const hidden = () => page.evaluate(() => document.documentElement.classList.contains('header-hidden'));
      assert.equal(await onScreen(search), true, 'header shown at the top');
      await scrollTo(page, 1500);
      await until(async () => (await hidden()) && !(await onScreen(search)), 'header slides away reading down');
      if (h.desktop) {
        // the navigation card moves up into the header's place, and stays on the screen
        await until(() => page.evaluate(() => Math.round(document.querySelector('aside').getBoundingClientRect().top) === 24), 'the card 24px from the top');
      }
      await scrollTo(page, 1400);
      await until(async () => !(await hidden()) && (await onScreen(search)), 'header back on scroll up');
      await scrollTo(page, 2500);
      await until(() => hidden(), 'hidden again reading down');
      await scrollTo(page, 0);
      await until(async () => !(await hidden()), 'shown at the top');
    },
    { smoke: true }
  );
});
