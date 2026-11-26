// Lists and their figures: the home totals, collections, a collection's
// chapters, the "only hadiths in Vietnamese" toggle of a chapter, category
// lists (language chips, subcategories, pagination) and the category tree.
'use strict';

const { BREADCRUMB_NAV, api, assert, loc, norm, readableCategories, spec, until, waitForH1, waitForText, viNumber } = require('./harness');

const cardIds = (page) =>
  page.locator('article[id^="hadith-"]').evaluateAll((cards) => cards.map((card) => Number(card.id.replace('hadith-', ''))));
const ids = (list) => list.hadiths.map((hadith) => hadith.id);
// The figures under a page's h1 ("725 hadith", "281 có bản dịch tiếng Việt" ...).
const metaLine = (page) => page.locator('h1 ~ p[class*="meta"] > span').evaluateAll((spans) => spans.map((s) => s.textContent.replace(/\s+/g, ' ').trim()));

function chapterRange(chapter) {
  const lettered = (n) => {
    const m = String(n || '').match(/^(\d+)\.(\d{2})$/);
    return m ? `${m[1]}${String.fromCharCode(96 + parseInt(m[2], 10))}` : String(n);
  };
  if (chapter.chapterNo === -1 || !chapter.hadithStart) return '';
  const start = lettered(chapter.hadithStart);
  const end = chapter.hadithEnd ? lettered(chapter.hadithEnd) : start;
  return start === end ? start : `${start}–${end}`;
}

module.exports = spec(module, 'lists', (h) => {
  h.test(
    'home: the band\'s cards, the library as cards (name and count, no Arabic), no search or figures',
    async (t) => {
      const home = await api(`/home${loc()}`);
      const { page } = await h.open(t, '/');
      // the band: the hadith of the day and the two ways in, the categories first for Vietnamese
      const band = page.locator('section[aria-labelledby="site-heading"]');
      const titles = (await band.locator('h2').filter({ visible: true }).allTextContents()).map(norm);
      assert.deepEqual(titles, h.desktop ? ['Hadith hôm nay', 'Danh mục', 'Bộ sưu tập hadith'] : ['Hadith hôm nay']);
      assert.equal(await page.locator('#daily-hadith ~ a').first().getAttribute('href'), `/hadiths/${home.dailyHadith.id}`);
      // the collections: each a card with its name and how many hadiths
      for (const book of home.books) {
        const card = page.locator(`section[aria-labelledby="home-books"] a[href="/books/${book.slug}"]`);
        assert.equal(await card.count(), 1, book.slug);
        assert.ok(norm(await card.textContent()).includes(`${viNumber(book.totalHadith)} hadith`), `${book.slug}: its count`);
        assert.ok(!/chương/.test(norm(await card.textContent())), `${book.slug}: the name and the count only`);
      }
      assert.equal(await page.locator('section[aria-labelledby="home-categories"] [lang="ar"]').count(), 0, 'no Arabic on the category cards');
      assert.equal(await page.locator('main dl, main input').count(), 0, 'no figures, no search field');
    },
    { smoke: true }
  );

  h.test('collections page and a collection: figures, editions, chapter rows', async (t) => {
    const [books, book, editions] = await Promise.all([api(`/books${loc()}`), api(`/books/bukhari${loc()}`), api('/editions')]);
    const total = books.reduce((sum, b) => sum + b.totalHadith, 0);
    const { page } = await h.open(t, '/books');
    await waitForH1(page, 'Bộ sưu tập hadith');
    assert.deepEqual(await metaLine(page), [`${viNumber(books.length)} bộ sưu tập`, `${viNumber(total)} hadith`]);

    await h.goto(page, `/books/${book.slug}`);
    const listed = books.find((b) => b.slug === book.slug);
    const facts = await page.locator('header dl > div').evaluateAll((items) =>
      items.map((item) => [...item.children].map((el) => el.textContent.replace(/\s+/g, ' ').trim()))
    );
    const own = listed.totalTranslated;
    const linked = listed.totalLinkedTranslated;
    assert.deepEqual(facts, [
      ['Hadith', viNumber(book.totalHadith)],
      ['Chương', viNumber(book.chapters.length)],
      ['Đọc được bằng tiếng Việt', viNumber(own + linked), ...(linked > 0 ? [own > 0 ? `${viNumber(own)} bản dịch + ${viNumber(linked)} từ bộ hadith theo chủ đề` : 'tất cả qua bản dịch từ bộ hadith theo chủ đề'] : [])],
    ]);
    const bookEditions = editions.filter((e) => e.bookSlug === book.slug);
    // one row per language, with the translator when the source names one
    assert.equal(norm(await page.locator('header details summary').textContent()), `Bản dịch (${bookEditions.length} ngôn ngữ)`);
    assert.equal(await page.locator('header details li').count(), bookEditions.length);
    assert.equal(await page.locator('header details li').filter({ hasText: 'Muhsin Khan' }).count(), 1);

    const rows = await page.locator('#book-chapters + ol > li a').evaluateAll((links) =>
      links.map((a) => [a.getAttribute('href'), [...a.children].map((el) => el.textContent.trim())])
    );
    assert.deepEqual(
      rows,
      book.chapters.map((c) => [
        `/books/${book.slug}/chapters/${c.chapterNo}`,
        [c.chapterNo === -1 ? '–' : String(c.chapterNo), c.chapterNo === -1 ? 'Chưa xếp chương' : c.name, [`${viNumber(c.totalHadith)} hadith`, chapterRange(c)].filter(Boolean).join(' · ')],
      ]),
      'chapter rows: number, name, count and range'
    );
  });

  h.test(
    'chapter: "Chỉ hiện hadith có tiếng Việt" shows exactly the readable ones',
    async (t) => {
      const [all, readable] = await Promise.all([
        api(`/books/bukhari/chapters/1${loc()}?perPage=20`),
        api(`/books/bukhari/chapters/1${loc()}?perPage=20&translated=1`),
      ]);
      assert.ok(readable.pagination.total > 0 && readable.pagination.total < all.chapter.totalHadith, 'chapter 1 is partly readable');
      const { page } = await h.open(t, '/books/sahih-al-bukhari/chapters/1');
      const toggle = page.getByRole('switch', { name: /Chỉ hiện hadith có tiếng Việt/ });
      assert.equal(
        norm(await toggle.textContent()),
        `Chỉ hiện hadith có tiếng Việt (${readable.pagination.total}/${all.chapter.totalHadith})`
      );
      assert.equal(await toggle.getAttribute('aria-checked'), 'false');
      assert.deepEqual(await cardIds(page), ids(all));

      await toggle.click();
      await h.waitForPath(page, (url) => url.pathname === '/books/sahih-al-bukhari/chapters/1/translated', 'filter on');
      await until(async () => (await page.getByRole('switch').getAttribute('aria-checked')) === 'true', 'switch checked');
      await until(async () => JSON.stringify(await cardIds(page)) === JSON.stringify(ids(readable)), 'only the readable hadiths');
      // each shows the topic collection's translation, labelled as such (naming no source),
      // and the list says what that means once
      const linkedCount = readable.hadiths.filter((x) => x.linkedTranslation).length;
      assert.equal(await page.getByText('Bản dịch tiếng Việt từ bộ hadith theo chủ đề', { exact: true }).count(), linkedCount);
      assert.equal(await page.locator('article').getByText(/hadeeth\s*enc/i).count(), 0);
      assert.equal(await page.getByRole('note').filter({ hasText: 'Những hadith có nhãn' }).count(), 1);

      await page.getByRole('switch').click();
      await h.waitForPath(page, (url) => url.pathname === '/books/sahih-al-bukhari/chapters/1', 'filter off');
      await until(async () => JSON.stringify(await cardIds(page)) === JSON.stringify(ids(all)), 'all hadiths again');
    },
    { smoke: true }
  );

  h.test('chapter edge cases: the unassigned group, a page past the end', async (t) => {
    const [book, unassigned] = await Promise.all([api(`/books/bukhari${loc()}`), api(`/books/bukhari/chapters/-1${loc()}?perPage=20`)]);
    // a page past the end answers 404: the browser logs it
    const { page } = await h.open(t, '/books/sahih-al-bukhari/chapters/-1', { allow: [/status of 404/] });
    await waitForH1(page, 'Chưa xếp chương');
    await waitForText(page.getByText('Nguồn dữ liệu không xếp các hadith này vào chương nào.'), 'Nguồn dữ liệu không xếp các hadith này vào chương nào.');
    assert.deepEqual(await cardIds(page), ids(unassigned));
    // no position in a chapter for these
    assert.equal(await page.locator('article[id^="hadith-"] span[class*="inBook"]').count(), 0);
    const crumbs = await page.locator(BREADCRUMB_NAV).locator('li').allTextContents();
    assert.equal(norm(crumbs[crumbs.length - 1]), 'Chưa xếp chương');
    assert.ok(book.chapters.some((c) => c.chapterNo === -1));

    // a page past the end is not a page
    const past = await page.goto(`${new URL(page.url()).origin}/books/sahih-al-bukhari/chapters/1/page/9`);
    assert.equal(past.status(), 404);
  });

  h.test('category hadiths: language chips, pagination and direct-only', async (t) => {
    const slug = 'the-creed';
    const [category, translated, translated2, everything, direct] = await Promise.all([
      api(`/categories/${slug}${loc()}`),
      api(`/categories/${slug}/hadiths${loc()}?perPage=20&translated=1`),
      api(`/categories/${slug}/hadiths${loc()}?perPage=20&translated=1&page=2`),
      api(`/categories/${slug}/hadiths${loc()}?perPage=20`),
      api(`/categories/${slug}/hadiths${loc()}?perPage=20&direct=1`),
    ]);
    const { page } = await h.open(t, `/categories/${slug}/hadiths`);
    await waitForH1(page, category.title);
    assert.deepEqual(await metaLine(page), [
      `${viNumber(category.totalHadith)} hadith`,
      `${viNumber(category.totalTranslated)} có bản dịch tiếng Việt`,
      `Trang 1/${translated.pagination.lastPage}`,
    ]);
    const chips = page.getByRole('group', { name: 'Ngôn ngữ bản dịch' });
    const only = chips.getByRole('link', { name: `Chỉ tiếng Việt (${viNumber(category.totalTranslated)})` });
    const allChip = chips.getByRole('link', { name: `Tất cả (${viNumber(category.totalHadith)})` });
    assert.equal(await only.getAttribute('aria-current'), 'true');
    assert.deepEqual(await cardIds(page), ids(translated), 'translated hadiths first');

    const pager = page.getByRole('navigation', { name: 'Trang', exact: true });
    await pager.getByRole('link', { name: /Sau/ }).click();
    await h.waitForPath(page, (url) => url.pathname === `/categories/${slug}/hadiths/page/2`, 'page 2');
    await until(async () => JSON.stringify(await cardIds(page)) === JSON.stringify(ids(translated2)), 'page 2 hadiths');
    await waitForText(pager.locator('span[class*="count"]'), `Trang 2/${viNumber(translated.pagination.lastPage)}`);

    await allChip.click();
    await h.waitForPath(page, (url) => url.pathname === `/categories/${slug}/hadiths/all`, 'all hadiths');
    await until(async () => JSON.stringify(await cardIds(page)) === JSON.stringify(ids(everything)), 'every hadith, page 1');
    assert.equal(await allChip.getAttribute('aria-current'), 'true');

    await page.getByRole('group', { name: 'Danh mục con' }).getByRole('link', { name: 'Chỉ hadith thuộc trực tiếp danh mục này' }).click();
    await h.waitForPath(page, (url) => url.pathname === `/categories/${slug}/hadiths/all/direct`, 'direct only, the language choice kept');
    await until(async () => JSON.stringify(await cardIds(page)) === JSON.stringify(ids(direct)), 'direct hadiths');
  });

  h.test('"Danh mục con": one card per subcategory with Vietnamese hadiths (name and count, no Arabic), links', async (t) => {
    const category = await api(`/categories/the-creed${loc()}`);
    // the subcategories with nothing to read in Vietnamese are left out, as in every list of categories,
    // and a card opens a subcategory's page only when that page lists readable subcategories
    const readable = new Map(readableCategories(await api(`/categories${loc()}`), 'vi').map((c) => [c.id, c]));
    const children = category.children
      .filter((child) => child.totalTranslated > 0)
      .map((child) => ({ ...child, totalChildren: readable.get(child.id).totalChildren }));
    assert.ok(children.length < category.children.length, 'the-creed has a subcategory without Vietnamese hadiths');
    const { page } = await h.open(t, `/categories/${category.slug}`);
    const section = page.locator('section[aria-labelledby="category-children"]');
    await waitForText(section.locator('h2'), 'Danh mục con');
    const cards = await section.locator('li a').evaluateAll((links) =>
      links.map((a) => ({
        href: decodeURIComponent(a.getAttribute('href')),
        text: [...a.querySelectorAll('span[class*="title"], span[class*="note"]')].map((el) => el.textContent.trim()),
      }))
    );
    assert.deepEqual(
      cards,
      children.map((child) => ({
        href: child.totalChildren > 0 ? `/categories/${child.slug}` : `/categories/${child.slug}/hadiths`,
        text: [child.title, `${viNumber(child.totalHadith)} hadith`],
      }))
    );
    assert.equal(await page.locator('main header [lang="ar"]').count(), 0, 'no Arabic name in the header');
    // the preview lists translated hadiths first and links to both lists
    const preview = await api(`/categories/${category.slug}/hadiths${loc()}?perPage=5&translated=1`);
    assert.deepEqual(await cardIds(page), ids(preview), 'preview: the first translated hadiths');
    const more = await page.locator('section[aria-labelledby="category-hadiths"] p[class*="more"] a').evaluateAll((links) =>
      links.map((a) => [a.getAttribute('href'), a.textContent.trim()])
    );
    assert.deepEqual(more, [
      [`/categories/${category.slug}/hadiths`, `Xem ${viNumber(category.totalTranslated)} hadith có bản dịch tiếng Việt`],
      [`/categories/${category.slug}/hadiths/all`, `Tất cả ${viNumber(category.totalHadith)} hadith`],
    ]);
    // a parent opens its own subcategories; a leaf its hadiths
    const parent = children.find((c) => c.totalChildren > 0);
    await section.locator(`a[href="/categories/${encodeURIComponent(parent.slug)}"]`).click();
    await h.waitForPath(page, (url) => decodeURIComponent(url.pathname) === `/categories/${parent.slug}`, 'subcategory page');
    await waitForH1(page, parent.title);
    const leaf = children.find((c) => c.totalChildren === 0);
    if (leaf) {
      await h.goto(page, `/categories/${category.slug}`);
      await section.locator(`a[href="/categories/${encodeURIComponent(leaf.slug)}/hadiths"]`).click();
      await h.waitForPath(page, (url) => decodeURIComponent(url.pathname) === `/categories/${leaf.slug}/hadiths`, 'leaf category hadiths');
      await waitForH1(page, leaf.title);
      assert.equal(await page.locator('article[id^="hadith-"]').count(), Math.min(20, leaf.totalHadith));
    }
  });

  h.test('"Danh mục con": a subcategory whose own subcategories have nothing in Vietnamese opens its hadiths', async (t) => {
    const every = await api(`/categories${loc()}`);
    const readable = new Map(readableCategories(every, 'vi').map((c) => [c.id, c]));
    // a readable subcategory with subcategories in the API, none of them readable in Vietnamese
    const child = every.find((c) => c.parentId != null && c.totalChildren > 0 && readable.has(c.id)
      && readable.get(c.id).totalChildren === 0);
    assert.ok(child, 'such a subcategory exists in the data');
    const parent = every.find((c) => c.id === child.parentId);
    const { page } = await h.open(t, `/categories/${parent.slug}`);
    const section = page.locator('section[aria-labelledby="category-children"]');
    await waitForText(section.locator('h2'), 'Danh mục con');
    const hrefs = await section.locator('li a').evaluateAll((links) => links.map((a) => decodeURIComponent(a.getAttribute('href'))));
    assert.ok(hrefs.includes(`/categories/${child.slug}/hadiths`), `${child.slug} opens its hadiths`);
    assert.ok(!hrefs.includes(`/categories/${child.slug}`), `${child.slug} does not open an empty list of subcategories`);
  });

  h.test('category tree page: each top-level category over its subcategories\' cards', async (t) => {
    const every = await api(`/categories${loc()}`);
    // the lists leave out the categories with nothing to read in Vietnamese
    const all = readableCategories(every, 'vi');
    const { page } = await h.open(t, '/categories');
    await waitForH1(page, 'Danh mục');
    assert.deepEqual(await metaLine(page), [`${viNumber(all.length)} danh mục`]);
    const top = all.filter((c) => c.parentId == null);
    const heads = await page.locator('main section h2 a').evaluateAll((links) => links.map((a) => decodeURIComponent(a.getAttribute('href'))));
    assert.deepEqual(heads, top.map((c) => `/categories/${c.slug}`), 'top-level categories in order');
    for (const parent of top) {
      const children = all.filter((c) => c.parentId === parent.id);
      if (!children.length) continue;
      const section = page.locator('main section').filter({ has: page.locator(`h2 a[href="/categories/${encodeURIComponent(parent.slug)}"]`) });
      const cards = await section.locator('ul li a').evaluateAll((links) =>
        links.map((a) => [decodeURIComponent(a.getAttribute('href')), a.querySelector('span[class*="note"]').textContent.trim()])
      );
      assert.deepEqual(
        cards,
        children.map((c) => [c.totalChildren > 0 ? `/categories/${c.slug}` : `/categories/${c.slug}/hadiths`, `${viNumber(c.totalHadith)} hadith`]),
        `children of ${parent.slug}`
      );
    }
    assert.equal(await page.locator('main [lang="ar"]').count(), 0, 'no Arabic names');
  });

  h.test(
    'pages 2 and on of a list have their own title and description',
    async (t) => {
      const { page } = await h.open(t, '/books/sahih-muslim/chapters/1');
      for (const first of ['/books/sahih-muslim/chapters/1', '/categories/the-creed/hadiths']) {
        const seen = [];
        for (const path of [first, `${first}/page/2`, `${first}/page/3`]) {
          await h.goto(page, path);
          seen.push({ title: await page.title(), description: await page.getAttribute('meta[name="description"]', 'content'), og: await page.getAttribute('meta[property="og:title"]', 'content') });
        }
        assert.ok(!/Trang \d/.test(seen[0].title), `page 1 as it was: ${seen[0].title}`);
        seen.slice(1).forEach((item, index) => {
          assert.ok(Object.values(item).every((text) => text.includes(`Trang ${index + 2}`)), JSON.stringify(item));
        });
        assert.equal(new Set(seen.map((item) => item.title)).size, 3, 'three titles');
      }
    },
    { only: 'desktop' }
  );

  h.test(
    "a category list's views (all, direct) each have their own title and description",
    async (t) => {
      const first = '/categories/the-creed/hadiths';
      const { page } = await h.open(t, first);
      const seen = [];
      for (const view of ['', '/all', '/direct', '/all/direct', '/all/page/2']) {
        await h.goto(page, `${first}${view}`);
        const canonical = await page.getAttribute('link[rel="canonical"]', 'href');
        assert.equal(new URL(canonical).pathname, `${first}${view}`, 'each view is its own page');
        const title = await page.title();
        const description = await page.getAttribute('meta[name="description"]', 'content');
        assert.equal(/Tất cả \(/.test(title), view.includes('/all'), `"all" named: ${title}`);
        assert.equal(/trực tiếp/.test(title), view.includes('/direct'), `"direct" named: ${title}`);
        assert.equal(/Tất cả \(/.test(description), view.includes('/all'), `"all" in the description: ${description}`);
        seen.push({ title, description });
      }
      assert.equal(new Set(seen.map((item) => item.title)).size, seen.length, 'a title each');
      assert.equal(new Set(seen.map((item) => item.description)).size, seen.length, 'a description each');
    },
    { only: 'desktop' }
  );
});
