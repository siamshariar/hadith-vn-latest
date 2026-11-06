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
    'home: the figures are the API totals',
    async (t) => {
      const home = await api(`/home${loc()}`);
      const { page } = await h.open(t, '/');
      const figures = await page.locator('dl div').evaluateAll((items) =>
        items
          .filter((item) => item.querySelector('dt'))
          .map((item) => [...item.children].map((el) => el.textContent.replace(/\s+/g, ' ').trim()))
      );
      const { totals } = home;
      assert.deepEqual(figures, [
        [
          'Đọc được bằng tiếng Việt',
          viNumber(totals.translated + totals.linkedTranslated),
          `${viNumber(totals.translated)} bản dịch + ${viNumber(totals.linkedTranslated)} từ bộ hadith theo chủ đề`,
        ],
        ['Hadith', viNumber(totals.hadith)],
        ['Bộ sưu tập', viNumber(totals.book)],
        ['Danh mục', viNumber(totals.category)],
        ['Ngôn ngữ', viNumber(totals.language)],
      ]);

      // the collections with their counts
      for (const book of home.books) {
        const card = page.locator(`section[aria-labelledby="home-books"] a[href="/books/${book.slug}"]`);
        const counts = [`${viNumber(book.totalHadith)} hadith`];
        if (book.totalChapter > 1) counts.push(`${viNumber(book.totalChapter)} chương`);
        assert.ok(norm(await card.textContent()).includes(counts.join(' · ')), `${book.slug}: ${counts.join(' · ')}`);
      }
      // the daily hadith links to its page
      const daily = home.dailyHadith;
      assert.equal(await page.locator('#daily-hadith ~ a').first().getAttribute('href'), `/hadiths/${daily.id}`);
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
      await h.waitForPath(page, (url) => url.searchParams.get('translated') === '1', 'filter on');
      await until(async () => (await page.getByRole('switch').getAttribute('aria-checked')) === 'true', 'switch checked');
      await until(async () => JSON.stringify(await cardIds(page)) === JSON.stringify(ids(readable)), 'only the readable hadiths');
      // each shows the topic collection's translation, labelled as such and with its
      // source line, and the list says what that means once
      const linkedCount = readable.hadiths.filter((x) => x.linkedTranslation).length;
      assert.equal(await page.getByText('Bản dịch tiếng Việt từ bộ hadith theo chủ đề', { exact: true }).count(), linkedCount);
      assert.equal(await page.locator('article div[class*="linked"] p[data-source-line]').count(), linkedCount);
      assert.equal(await page.getByRole('note').filter({ hasText: 'Những hadith có nhãn' }).count(), 1);

      await page.getByRole('switch').click();
      await h.waitForPath(page, (url) => url.searchParams.get('translated') === null, 'filter off');
      await until(async () => JSON.stringify(await cardIds(page)) === JSON.stringify(ids(all)), 'all hadiths again');
    },
    { smoke: true }
  );

  h.test('chapter edge cases: the unassigned group, a page past the end', async (t) => {
    const [book, unassigned] = await Promise.all([api(`/books/bukhari${loc()}`), api(`/books/bukhari/chapters/-1${loc()}?perPage=20`)]);
    const { page } = await h.open(t, '/books/sahih-al-bukhari/chapters/-1');
    await waitForH1(page, 'Chưa xếp chương');
    await waitForText(page.getByText('Nguồn dữ liệu không xếp các hadith này vào chương nào.'), 'Nguồn dữ liệu không xếp các hadith này vào chương nào.');
    assert.deepEqual(await cardIds(page), ids(unassigned));
    // no position in a chapter for these
    assert.equal(await page.locator('article[id^="hadith-"] span[class*="inBook"]').count(), 0);
    const crumbs = await page.locator(BREADCRUMB_NAV).locator('li').allTextContents();
    assert.equal(norm(crumbs[crumbs.length - 1]), 'Chưa xếp chương');
    assert.ok(book.chapters.some((c) => c.chapterNo === -1));

    // a page number past the end says so and links to the first page
    await h.goto(page, '/books/sahih-al-bukhari/chapters/1?page=9');
    await waitForText(page.getByText('Trang này không có hadith.'), /^Trang này không có hadith\./);
    await page.getByRole('link', { name: 'Về trang đầu' }).click();
    await h.waitForPath(page, (url) => url.pathname === '/books/sahih-al-bukhari/chapters/1' && !url.search, 'first page');
    await until(async () => (await cardIds(page)).length > 0, 'hadiths on the first page');
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

    const pager = page.getByRole('navigation', { name: 'Trang' });
    await pager.getByRole('link', { name: /Sau/ }).click();
    await h.waitForPath(page, (url) => url.searchParams.get('page') === '2', 'page 2');
    await until(async () => JSON.stringify(await cardIds(page)) === JSON.stringify(ids(translated2)), 'page 2 hadiths');
    await waitForText(pager.locator('p'), `21–40 trong ${viNumber(translated.pagination.total)}`);

    await allChip.click();
    await h.waitForPath(page, (url) => url.searchParams.get('all') === '1' && !url.searchParams.get('page'), 'all hadiths');
    await until(async () => JSON.stringify(await cardIds(page)) === JSON.stringify(ids(everything)), 'every hadith, page 1');
    assert.equal(await allChip.getAttribute('aria-current'), 'true');

    await page.getByRole('group', { name: 'Danh mục con' }).getByRole('link', { name: 'Chỉ hadith thuộc trực tiếp danh mục này' }).click();
    await h.waitForPath(page, (url) => url.searchParams.get('direct') === '1', 'direct only');
    await until(async () => JSON.stringify(await cardIds(page)) === JSON.stringify(ids(direct)), 'direct hadiths');
    assert.equal(new URL(page.url()).searchParams.get('all'), '1', 'the language choice is kept');
  });

  h.test('"Danh mục con": one tile per subcategory, figures, links', async (t) => {
    const category = await api(`/categories/the-creed${loc()}`);
    const { page } = await h.open(t, `/categories/${category.slug}`);
    const section = page.locator('section[aria-labelledby="category-children"]');
    await waitForText(section.locator('h2'), 'Danh mục con');
    const tiles = await section.locator('li a').evaluateAll((links) =>
      links.map((a) => ({ href: decodeURIComponent(a.getAttribute('href')), text: [...a.querySelectorAll('span > *')].map((el) => el.textContent.trim()) }))
    );
    assert.deepEqual(
      tiles,
      category.children.map((child) => {
        const meta = [`${viNumber(child.totalHadith)} hadith`, `${viNumber(child.totalTranslated)} có bản dịch tiếng Việt`];
        if (child.totalChildren > 0) meta.push(`${viNumber(child.totalChildren)} danh mục con`);
        return {
          href: child.totalChildren > 0 ? `/categories/${child.slug}` : `/categories/${child.slug}/hadiths`,
          text: [child.title, ...(child.titleArabic ? [child.titleArabic] : []), meta.join(' · ')],
        };
      })
    );
    // the preview lists translated hadiths first and links to both lists
    const preview = await api(`/categories/${category.slug}/hadiths${loc()}?perPage=5&translated=1`);
    assert.deepEqual(await cardIds(page), ids(preview), 'preview: the first translated hadiths');
    const more = await page.locator('section[aria-labelledby="category-hadiths"] p[class*="more"] a').evaluateAll((links) =>
      links.map((a) => [a.getAttribute('href'), a.textContent.trim()])
    );
    assert.deepEqual(more, [
      [`/categories/${category.slug}/hadiths`, `Xem ${viNumber(category.totalTranslated)} hadith có bản dịch tiếng Việt`],
      [`/categories/${category.slug}/hadiths?all=1`, `Tất cả ${viNumber(category.totalHadith)} hadith`],
    ]);
    // a parent opens its own subcategories; a leaf (here one with an Arabic slug) its hadiths
    const parent = category.children.find((c) => c.totalChildren > 0);
    await section.locator(`a[href="/categories/${encodeURIComponent(parent.slug)}"]`).click();
    await h.waitForPath(page, (url) => decodeURIComponent(url.pathname) === `/categories/${parent.slug}`, 'subcategory page');
    await waitForH1(page, parent.title);
    const leaf = category.children.find((c) => c.totalChildren === 0);
    if (leaf) {
      await h.goto(page, `/categories/${category.slug}`);
      await section.locator(`a[href="/categories/${encodeURIComponent(leaf.slug)}/hadiths"]`).click();
      await h.waitForPath(page, (url) => decodeURIComponent(url.pathname) === `/categories/${leaf.slug}/hadiths`, 'leaf category hadiths');
      await waitForH1(page, leaf.title);
      assert.equal(await page.locator('article[id^="hadith-"]').count(), Math.min(20, leaf.totalHadith));
    }
  });

  h.test('category tree page: top-level categories with their children and counts', async (t) => {
    const [home, every] = await Promise.all([api(`/home${loc()}`), api(`/categories${loc()}`)]);
    // the lists leave out the categories with nothing to read in Vietnamese
    const all = readableCategories(every, 'vi');
    const { page } = await h.open(t, '/categories');
    await waitForH1(page, 'Danh mục');
    assert.deepEqual(await metaLine(page), [`${viNumber(all.length)} danh mục`]);
    const top = all.filter((c) => c.parentId == null);
    const heads = await page.locator('main ol > li > div > a').evaluateAll((links) => links.map((a) => a.getAttribute('href')));
    assert.deepEqual(heads, top.map((c) => `/categories/${c.slug}`), 'top-level categories in order');
    for (const parent of home.categories.filter((c) => all.some((a) => a.id === c.id))) {
      const list = page.getByRole('list', { name: `Danh mục con: ${parent.title}` });
      // the count as shown ("6/76"); the visually hidden sentence after it is for screen readers
      const children = await list.locator('a').evaluateAll((links) => links.map((a) => [decodeURIComponent(a.getAttribute('href')), a.querySelector('span[aria-hidden="true"]').textContent.trim()]));
      assert.deepEqual(
        children,
        all.filter((c) => c.parentId === parent.id).map((c) => [`/categories/${c.slug}`, `${viNumber(c.totalTranslated)}/${viNumber(c.totalHadith)}`]),
        `children of ${parent.slug}`
      );
    }
  });
});
