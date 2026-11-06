// Every page: HTTP 200, one h1, a Vietnamese title, <html lang="vi">, no
// console errors or hydration warnings. Then the main reading path, home ->
// collection -> chapter -> hadith and back up through the breadcrumbs.
'use strict';

const { BREADCRUMB_NAV, api, assert, bookName, breadcrumbs, cleanText, interfaceStrings, lettered, loc, meta, norm, spec, waitForH1, viNumber } = require('./harness');

const SITE = 'Hadith tiếng Việt | Hadith.vn';

// [path, expected h1, expected title prefix] (null: derived from the API below)
async function pages() {
  const [bukhari, chapter1, bukhari3, creed] = await Promise.all([
    api(`/books/bukhari${loc()}`),
    api(`/books/bukhari/chapters/1${loc()}?perPage=1`),
    api(`/books/bukhari/hadiths/3${loc()}`),
    api(`/categories/the-creed${loc()}`),
  ]);
  const henc = await api(`/hadiths/${bukhari3.linkedTranslation.hadithId}${loc()}`);
  const hencTitle = cleanText(henc.title);
  const vi = await interfaceStrings('vi');
  return [
    ['/', 'Hadith tiếng Việt', 'Trang chủ'],
    ['/books', 'Bộ sưu tập hadith', 'Bộ sưu tập hadith'],
    [`/books/${bukhari.slug}`, bukhari.name, bukhari.name],
    [`/books/${bukhari.slug}/chapters/1`, `1. ${chapter1.chapter.name}`, `${chapter1.chapter.name} - ${bukhari.name}`],
    [`/books/${bukhari.slug}/hadiths/1`, 'Sahih al-Bukhari 1', 'Sahih al-Bukhari 1'],
    ['/books/sahih-muslim/hadiths/8a', 'Sahih Muslim 8a', 'Sahih Muslim 8a'],
    // the title is cut at 70 characters (components/hadith/HadithPage)
    [`/hadiths/${henc.id}`, norm(hencTitle), norm(`${hencTitle.slice(0, 70)} - ${bookName('vi', henc.book, vi)} ${henc.referenceNumber}`)],
    ['/categories', 'Danh mục', 'Danh mục'],
    [`/categories/${creed.slug}`, creed.title, creed.title],
    [`/categories/${creed.slug}/hadiths`, creed.title, `Hadith trong danh mục: ${creed.title}`],
    ['/search', 'Tìm kiếm', 'Tìm kiếm'],
    ['/search?q=c%E1%BA%A7u%20nguy%E1%BB%87n', 'Tìm kiếm', 'Tìm kiếm: cầu nguyện'],
    ['/search?q=%D8%A7%D9%86%D9%85%D8%A7%20%D8%A7%D9%84%D8%A7%D8%B9%D9%85%D8%A7%D9%84', 'Tìm kiếm', 'Tìm kiếm: انما الاعمال'],
    ['/bookmarks', 'Đã lưu', 'Đã lưu'],
    ['/bookmarks?key=favorites', 'Yêu thích', 'Đã lưu'],
    ['/sources', 'Dữ liệu & phương pháp', 'Dữ liệu & phương pháp'],
    ['/settings', 'Cài đặt', 'Cài đặt'],
    ['/about', 'Giới thiệu', 'Giới thiệu'],
    ['/contact', 'Liên hệ', 'Liên hệ'],
    ['/support', 'Ủng hộ', 'Ủng hộ'],
    ['/grateful', 'Lời cảm ơn', 'Lời cảm ơn'],
    ['/privacy-policy', 'Chính sách bảo mật', 'Chính sách bảo mật'],
    ['/deeniinfotech', 'Deeni Info Tech', 'Deeni Info Tech'],
  ];
}

module.exports = spec(module, 'smoke', (h) => {
  h.test(
    'every page has one h1, a Vietnamese title and no console errors',
    async (t) => {
      for (const [path, h1, title] of await pages()) {
        await t.test(path, async (st) => {
          const { page, response } = await h.open(st, path);
          assert.equal(response.status(), 200, `${path} HTTP status`);
          await waitForH1(page, h1);
          const info = await meta(page);
          assert.deepEqual(info.h1, [h1], `${path}: exactly one h1`);
          assert.equal(norm(info.title), `${title} | ${SITE}`, `${path}: title`);
          assert.equal(info.lang, 'vi', `${path}: <html lang>`);
        });
      }
    },
    { smoke: true }
  );

  h.test(
    'home -> collection -> chapter -> hadith, breadcrumbs lead back',
    async (t) => {
      const [books, bukhari, chapter] = await Promise.all([
        api(`/books${loc()}`),
        api(`/books/bukhari${loc()}`),
        api(`/books/bukhari/chapters/1${loc()}?perPage=20`),
      ]);
      const { page } = await h.open(t, '/');

      // home: every collection, linked to its page
      const cards = page.locator('#home-books ~ * a[href^="/books/"], section[aria-labelledby="home-books"] a[href^="/books/"]');
      const hrefs = [...new Set(await cards.evaluateAll((links) => links.map((a) => a.getAttribute('href'))))];
      assert.deepEqual(hrefs.sort(), books.map((book) => `/books/${book.slug}`).sort(), 'home lists every collection');

      await page.locator(`section[aria-labelledby="home-books"] a[href="/books/${bukhari.slug}"]`).click();
      await h.waitForPath(page, (url) => url.pathname === `/books/${bukhari.slug}`, 'collection page');
      await waitForH1(page, bukhari.name);
      assert.equal(
        norm(await page.locator('#book-chapters').textContent()),
        `${viNumber(bukhari.chapters.length)} chương`,
        'chapter count heading'
      );
      assert.equal(await page.locator('#book-chapters + ol > li').count(), bukhari.chapters.length, 'one row per chapter');

      await page.locator(`#book-chapters + ol a[href="/books/${bukhari.slug}/chapters/1"]`).click();
      await h.waitForPath(page, (url) => url.pathname === `/books/${bukhari.slug}/chapters/1`, 'chapter page');
      await waitForH1(page, `1. ${chapter.chapter.name}`);
      assert.equal(await page.locator('article[id^="hadith-"]').count(), chapter.hadiths.length, 'one card per hadith on the page');

      const first = chapter.hadiths[0];
      await page.locator(`#hadith-${first.id}`).getByRole('link', { name: 'Xem chi tiết' }).click();
      await h.waitForPath(page, (url) => url.pathname === `/books/${bukhari.slug}/hadiths/${lettered(first.referenceNumber)}`, 'hadith page');
      await waitForH1(page, `Sahih al-Bukhari ${first.referenceNumber}`);

      assert.deepEqual(await breadcrumbs(page), [
        { label: 'Trang chủ', href: '/' },
        { label: 'Bộ sưu tập hadith', href: '/books' },
        { label: 'Sahih al-Bukhari', href: `/books/${bukhari.slug}` },
        { label: 'Chương 1', href: `/books/${bukhari.slug}/chapters/1` },
        { label: `Hadith ${first.referenceNumber}`, href: null },
      ]);

      // phones have no breadcrumb on show: back, then the drawer's level, lead up
      if (h.phone) {
        await page.getByRole('button', { name: 'Quay lại' }).click();
        await h.waitForPath(page, (url) => url.pathname === `/books/${bukhari.slug}/chapters/1`, 'back to the chapter');
        await waitForH1(page, `1. ${chapter.chapter.name}`);
        return;
      }
      const crumbs = page.locator(BREADCRUMB_NAV);
      await crumbs.getByRole('link', { name: 'Chương 1' }).click();
      await h.waitForPath(page, (url) => url.pathname === `/books/${bukhari.slug}/chapters/1`, 'breadcrumb to the chapter');
      await waitForH1(page, `1. ${chapter.chapter.name}`);
      await crumbs.getByRole('link', { name: 'Sahih al-Bukhari' }).click();
      await h.waitForPath(page, (url) => url.pathname === `/books/${bukhari.slug}`, 'breadcrumb to the collection');
      await waitForH1(page, bukhari.name);
      await crumbs.getByRole('link', { name: 'Bộ sưu tập hadith' }).click();
      await h.waitForPath(page, (url) => url.pathname === '/books', 'breadcrumb to the collections');
      await waitForH1(page, 'Bộ sưu tập hadith');
      await crumbs.getByRole('link', { name: 'Trang chủ' }).click();
      await h.waitForPath(page, (url) => url.pathname === '/', 'breadcrumb home');
      await waitForH1(page, 'Hadith tiếng Việt');
    },
    { smoke: true }
  );
});

