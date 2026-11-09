// Search: Vietnamese, Arabic and no results, in the site's one language (an old ?lang= is
// ignored); the book filter of the "Bộ lọc" panel; the pager and the count line; highlighting
// (whole words only).
'use strict';

const { api, assert, interfaceStrings, loc, norm, spec, until, waitForText, viNumber } = require('./harness');

const VI = 'cầu nguyện';
const AR = 'انما الاعمال';
const EN = 'intention';

const searchPath = (q, params = {}) => {
  const search = new URLSearchParams({ q, ...params });
  return `/search?${search.toString()}`;
};
const apiSearch = (q, lang = 'vi', params = {}) =>
  api(`/search${loc(lang)}?${new URLSearchParams({ q, perPage: '20', ...params }).toString()}`);

// Citations of the result cards, in order ("Sahih al-Bukhari 1").
const cardCitations = (page) =>
  page.locator('article[id^="hadith-"]').evaluateAll((cards) => cards.map((card) => card.id.replace('hadith-', '')));

// Every <mark> with the word it sits in: a highlight must cover whole words.
const marks = (page) =>
  page.locator('article mark').evaluateAll((items) =>
    items.map((mark) => {
      const before = mark.previousSibling && mark.previousSibling.nodeType === 3 ? mark.previousSibling.textContent : '';
      const after = mark.nextSibling && mark.nextSibling.nodeType === 3 ? mark.nextSibling.textContent : '';
      return { text: mark.textContent, before: before.slice(-1), after: after.slice(0, 1), lang: mark.closest('[lang]') && mark.closest('[lang]').getAttribute('lang') };
    })
  );
const LETTER = /[\p{L}\p{M}\p{N}]/u;
const fold = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').toLowerCase();

// `tr`: the interface's strings (harness interfaceStrings) when it is not Vietnamese.
async function expectCountLine(page, results, tr = null) {
  const { page: current, perPage, total } = results.pagination;
  const from = (current - 1) * perPage + 1;
  const to = (current - 1) * perPage + results.hadiths.length;
  const line = tr
    ? tr('searchShowing', { from: tr.number(from), to: tr.number(to), total: tr.number(total) })
    : `Hiển thị ${viNumber(from)}–${viNumber(to)} trong ${viNumber(total)} kết quả`;
  await waitForText(page.locator('[aria-live="polite"] p'), line);
}

// Opens the filter panel on phones (always open from 768px).
const filterToggle = (page) => page.locator('button[aria-controls="search-filters"]');
async function filters(h, page) {
  const toggle = filterToggle(page);
  if (h.phone) {
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(await page.locator('#search-filters select[name="book"]').isVisible(), false, 'filters folded on phones');
    await toggle.click();
    assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
  }
  await page.locator('#search-filters select[name="book"]').waitFor({ state: 'visible' });
  return page.locator('#search-filters');
}

module.exports = spec(module, 'search', (h) => {
  h.test(
    'Vietnamese: count line, results in API order, whole-word highlights',
    async (t) => {
      const results = await apiSearch(VI);
      const { page } = await h.open(t, searchPath(VI));
      await waitForText(page.locator('#search-results'), `Kết quả cho “${VI}”`);
      await expectCountLine(page, results);
      assert.equal(norm(await page.locator('p[class*="searchedIn"] span').first().textContent()), 'Đã tìm trong bản dịch tiếng Việt.');
      assert.deepEqual(await cardCitations(page), results.hadiths.map((hadith) => String(hadith.id)), 'cards in API order');

      const found = await until(async () => {
        const list = await marks(page);
        return list.length ? list : null;
      }, 'highlights appear after hydration');
      const words = VI.split(' ');
      for (const mark of found) {
        assert.ok(!LETTER.test(mark.before) && !LETTER.test(mark.after), `"${mark.before}[${mark.text}]${mark.after}" is a whole word`);
        const markWords = mark.text.toLowerCase().split(/\s+/);
        assert.ok(
          markWords.every((word) => words.some((q) => word === q || (q.length >= 3 && word.startsWith(q)))),
          `"${mark.text}" is the query or one of its words`
        );
      }
      // the server HTML has no marks (no hydration mismatch); checked by the console watcher
    },
    { smoke: true }
  );

  h.test('Arabic: searched in the Arabic text, marks inside the Arabic', async (t) => {
    const results = await apiSearch(AR);
    assert.equal(results.searchedLanguage, 'ar');
    const { page } = await h.open(t, searchPath(AR));
    await waitForText(page.locator('#search-results'), `Kết quả cho “${AR}”`);
    await expectCountLine(page, results);
    assert.equal(norm(await page.locator('p[class*="searchedIn"] span').first().textContent()), 'Đã tìm trong văn bản tiếng Ả Rập (không dấu).');
    assert.deepEqual(await cardCitations(page), results.hadiths.map((hadith) => String(hadith.id)));
    const found = await until(async () => {
      const list = await marks(page);
      return list.length ? list : null;
    }, 'Arabic highlights');
    assert.ok(found.every((mark) => mark.lang === 'ar'), 'only the Arabic is marked');
  });

  h.test('one language: an old ?lang=en is ignored, the search is in Vietnamese; results show book › chapter', async (t) => {
    const { page, context } = await h.open(t, searchPath(AR, { lang: 'en' }));
    assert.equal(await page.evaluate(() => document.documentElement.lang), 'vi');
    const results = await apiSearch(AR);
    await expectCountLine(page, results);
    // book › chapter above each result outside the topic collection, linked
    const first = results.hadiths.find((hadith) => hadith.bookSlug !== 'hadeethenc');
    if (first) {
      const links = await page.locator(`#hadith-${first.id} header p a`).evaluateAll((items) => items.map((a) => a.getAttribute('href')));
      assert.deepEqual(links, [`/books/${first.bookSlug}`, `/books/${first.bookSlug}/chapters/${first.chapterNo}`]);
    }
    assert.equal(await page.locator('select[name="lang"]').count(), 0, 'no search language to choose');
    assert.equal((await context.cookies()).find((c) => c.name === 'hadith_lang'), undefined);
  });

  h.test('no results: a clear message and no cards', async (t) => {
    const q = 'zzqxjv';
    const results = await apiSearch(q);
    assert.equal(results.pagination.total, 0);
    const { page } = await h.open(t, searchPath(q));
    await waitForText(page.locator('#search-results'), `Không tìm thấy hadith nào cho “${q}”.`);
    assert.equal(await page.locator('article[id^="hadith-"]').count(), 0);
    assert.equal(await page.getByRole('navigation', { name: 'Trang', exact: true }).count(), 0, 'no pagination');
  });

  h.test('too short: says how many characters are needed', async (t) => {
    const { page } = await h.open(t, searchPath('a'));
    await waitForText(page.getByText('Nhập ít nhất 2 ký tự để tìm.'), 'Nhập ít nhất 2 ký tự để tìm.');
    assert.equal(await page.locator('article[id^="hadith-"]').count(), 0);
  });

  h.test('filters: the collection, kept in the URL', async (t) => {
    const vi = await interfaceStrings('vi');
    const books = await api(`/books${loc()}`);
    const { page } = await h.open(t, searchPath(VI));
    const panel = await filters(h, page);
    const bookSelect = panel.locator('select[name="book"]');
    const options = await bookSelect.locator('option').evaluateAll((items) => items.map((o) => [o.value, o.textContent.trim()]));
    assert.deepEqual(
      options,
      // the topic collection is named by the interface (lib/names), never by its source
      [['', vi('searchAllBooks')], ...books.map((b) => [b.slug, b.code === 'hadeethenc' ? vi('topicCollection') : b.name])],
      'every collection in the book filter'
    );
    assert.equal(await panel.locator('select[name="lang"]').count(), 0, 'no language filter');

    await bookSelect.selectOption('hadeethenc');
    await h.waitForPath(page, (url) => url.searchParams.get('book') === 'hadeethenc', 'book filter');
    const inTopic = await apiSearch(VI, 'vi', { book: 'hadeethenc' });
    await expectCountLine(page, inTopic);
    assert.deepEqual(await cardCitations(page), inTopic.hadiths.map((hadith) => String(hadith.id)));
    // the active filter is counted on the toggle
    assert.equal(norm(await filterToggle(page).textContent()).replace(/\s+/g, ''), `${vi('filters')}1`.replace(/\s+/g, ''));
  });

  h.test(
    'pagination: one pager, the Quran sites\', previous and next with the page between',
    async (t) => {
      const [p1, p2, p3] = await Promise.all([apiSearch(VI), apiSearch(VI, 'vi', { page: '2' }), apiSearch(VI, 'vi', { page: '3' })]);
      assert.ok(p1.pagination.lastPage >= 3, 'the query has at least three pages');
      const { page } = await h.open(t, searchPath(VI, { page: '2' }));
      await expectCountLine(page, p2);
      assert.deepEqual(await cardCitations(page), p2.hadiths.map((hadith) => String(hadith.id)));
      const pager = page.getByRole('navigation', { name: 'Trang', exact: true });
      assert.equal(await pager.count(), 1, 'one pager');
      await waitForText(pager.locator('span[class*="count"]'), `Trang 2/${viNumber(p1.pagination.lastPage)}`);

      await pager.getByRole('link', { name: /Sau/ }).click();
      await h.waitForPath(page, (url) => url.searchParams.get('page') === '3', 'next page');
      await expectCountLine(page, p3);
      const third = JSON.stringify(p3.hadiths.map((hadith) => String(hadith.id)));
      await until(async () => JSON.stringify(await cardCitations(page)) === third, "page 3's cards");

      await pager.getByRole('link', { name: /Trước/ }).click();
      await h.waitForPath(page, (url) => url.searchParams.get('page') === '2', 'previous page');
      await expectCountLine(page, p2);
      await pager.getByRole('link', { name: /Trước/ }).click();
      await h.waitForPath(page, (url) => url.pathname === '/search' && !url.searchParams.get('page'), 'first page');
      await expectCountLine(page, p1);
      assert.equal(await pager.getByRole('link', { name: /Trước/ }).count(), 0, 'nothing before the first page');
    },
    { smoke: true }
  );

  h.test('the note says how much reads in Vietnamese, and offers no other language', async (t) => {
    const { page } = await h.open(t, searchPath(VI));
    await page.locator('#search-results').waitFor();
    assert.equal(await page.getByRole('link', { name: 'Tìm trong bản dịch tiếng Anh' }).count(), 0);
    assert.equal(await page.locator('#search-filters input[name="go"]').count(), 0, 'no go-to field: a citation in the search opens the hadith');
  });

  h.test('Vietnamese query typed without diacritics still highlights whole words', async (t) => {
    const q = 'cau nguyen';
    const results = await apiSearch(q);
    const { page } = await h.open(t, searchPath(q));
    if (results.pagination.total === 0) {
      await waitForText(page.locator('#search-results'), `Không tìm thấy hadith nào cho “${q}”.`);
      return;
    }
    await expectCountLine(page, results);
    const found = await until(async () => {
      const list = await marks(page);
      return list.length ? list : null;
    }, 'highlights for an unaccented query');
    for (const mark of found) {
      assert.ok(!LETTER.test(mark.before) && !LETTER.test(mark.after), `"${mark.before}[${mark.text}]${mark.after}" is a whole word`);
      assert.ok(fold(mark.text).split(/\s+/).every((w) => ['cau', 'nguyen'].some((q2) => w.startsWith(q2))), `"${mark.text}" folds to the query`);
    }
  });
});
