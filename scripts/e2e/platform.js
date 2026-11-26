// Platform pages: robots.txt and sitemap.xml (checked against the API), the web app
// manifest, HTTP 404 for unknown books, chapters, hadiths and categories, HTTP 500 for
// /500, and the 500 page itself (Vietnamese, inside the site frame). The HTTP checks
// run against BASE, and against BASE_BD and BASE_AC too when they are set
// (scripts/e2e/country.js, international.js).
'use strict';

const { BASE, api, assert, loc, meta, norm, spec, waitForH1 } = require('./harness');

const BASE_BD = (process.env.BASE_BD || '').replace(/\/+$/, '');
const BASE_AC = (process.env.BASE_AC || '').replace(/\/+$/, '');
const TARGETS = [BASE, BASE_BD, BASE_AC].filter(Boolean);
// The documents asked for here are a 404 and a 500: browsers log those as failed resources.
const ALLOW_ERRORS = [/status of 404/, /status of 500/];

const NOT_FOUND = [
  '/no-such-page',
  '/books/no-such-book',
  '/books/sahih-al-bukhari/chapters/9999',
  '/books/sahih-al-bukhari/chapters/-5',
  '/books/sahih-al-bukhari/chapters/abc',
  '/books/sahih-al-bukhari/hadiths/999999',
  '/books/no-such-book/hadiths/1',
  '/hadiths/99999999',
  '/hadiths/abc',
  '/categories/no-such-category',
  '/categories/no-such-category/hadiths',
];

async function get(url, init) {
  const response = await fetch(url, { redirect: 'manual', ...init });
  return { status: response.status, headers: response.headers, text: await response.text() };
}

// The Sitemap line of robots.txt: the site's public address (NEXT_PUBLIC_SITE_URL).
async function robots(target) {
  const res = await get(`${target}/robots.txt`);
  const match = res.text.match(/^Sitemap: (\S+)$/m);
  return { ...res, sitemap: match ? match[1] : null };
}

// What the sitemap must list, from the API (slugs do not depend on the language), as
// the site links them: percent-encoded (some category slugs are Arabic).
async function expectedPaths() {
  const [books, categories] = await Promise.all([api(`/books${loc()}`), api(`/categories${loc()}`)]);
  const details = await Promise.all(books.map((book) => api(`/books/${book.slug}${loc()}`)));
  const seg = encodeURIComponent;
  return [
    '/',
    '/books',
    ...details.flatMap((book) => [
      `/books/${seg(book.slug)}`,
      ...book.chapters.map((chapter) => `/books/${seg(book.slug)}/chapters/${seg(chapter.chapterNo)}`),
    ]),
    '/categories',
    ...categories.map((category) => `/categories/${seg(category.slug)}`),
    '/sources',
    '/about',
  ];
}

module.exports = spec(module, 'platform', (h) => {
  h.test(
    'robots.txt: crawl rules and the sitemap at the public site URL',
    async () => {
      for (const target of TARGETS) {
        const res = await robots(target);
        assert.equal(res.status, 200, `${target}/robots.txt`);
        assert.match(res.headers.get('content-type'), /^text\/plain/);
        const lines = res.text.split('\n');
        for (const line of ['User-agent: *', 'Disallow: /search', 'Disallow: /bookmarks', 'Disallow: /settings']) {
          assert.ok(lines.includes(line), `${target}/robots.txt has "${line}"`);
        }
        assert.ok(res.sitemap, `${target}/robots.txt names a sitemap`);
        const sitemap = new URL(res.sitemap);
        assert.equal(sitemap.pathname, '/sitemap.xml');
        assert.match(sitemap.protocol, /^https?:$/);
      }
    },
    { only: 'desktop' }
  );

  h.test(
    'sitemap.xml: home, every collection and chapter, every category, sources and about',
    async () => {
      const expected = await expectedPaths();
      for (const target of TARGETS) {
        const origin = new URL((await robots(target)).sitemap).origin;
        const res = await get(`${target}/sitemap.xml`);
        assert.equal(res.status, 200, `${target}/sitemap.xml`);
        assert.match(res.headers.get('content-type'), /^application\/xml/);
        const maxAge = Number((res.headers.get('cache-control') || '').match(/max-age=(\d+)/)?.[1]);
        assert.ok(maxAge > 0 && maxAge <= 3600, `a short cache: ${res.headers.get('cache-control')}`);
        assert.ok(res.text.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
        assert.match(res.text, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);

        const locs = [...res.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
        assert.equal(new Set(locs).size, locs.length, 'no URL twice');
        assert.ok(locs.every((url) => url.startsWith(`${origin}/`)), `every URL is on ${origin}`);
        const paths = locs.map((url) => url.slice(origin.length));
        assert.deepEqual([...paths].sort(), [...expected].sort(), `${target}: the sitemap lists exactly the API's books, chapters and categories`);
        assert.ok(!paths.some((p) => /\/hadiths\//.test(p)), 'hadith pages are reached through the chapters');

        // the listed pages exist (a sample: one of each kind)
        const sample = ['/', '/books', paths.find((p) => /^\/books\/[^/]+$/.test(p)), paths.find((p) => /\/chapters\//.test(p)), '/categories', paths.find((p) => /^\/categories\/[^/]+$/.test(p)), '/sources', '/about'];
        for (const path of sample) {
          assert.equal((await get(`${target}${path}`)).status, 200, `${target}${path} (listed in the sitemap)`);
        }
      }
    },
    { only: 'desktop' }
  );

  h.test(
    'statuses: unknown book, chapter, hadith or category answers 404; /500 answers 500',
    async () => {
      for (const target of TARGETS) {
        for (const path of NOT_FOUND) {
          assert.equal((await get(`${target}${path}`)).status, 404, `${target}${path}`);
        }
        const error = await get(`${target}/500`);
        assert.equal(error.status, 500, `${target}/500`);
        assert.match(error.text, /<meta name="robots" content="noindex"( data-next-head="")?\/?>/, 'the error page is not indexed');
      }
    },
    { only: 'desktop' }
  );

  h.test(
    'manifest: the site name and interface language of the deployment',
    async () => {
      for (const target of TARGETS) {
        const res = await get(`${target}/manifest.webmanifest`);
        assert.equal(res.status, 200);
        assert.match(res.headers.get('content-type'), /^application\/manifest\+json/);
        const manifest = JSON.parse(res.text);
        const home = (await get(`${target}/`)).text;
        const siteName = home.match(/<meta property="og:site_name" content="([^"]*)"/)[1];
        const htmlLang = home.match(/<html lang="([^"]+)"/)[1];
        assert.equal(manifest.name, siteName, `${target}: manifest name = og:site_name`);
        assert.equal(manifest.lang, htmlLang, `${target}: manifest lang = <html lang>`);
        assert.equal(manifest.start_url, '/');
        assert.match(home, /<link rel="manifest" href="\/manifest\.webmanifest"( data-next-head="")?\/?>/); // Next 15+ marks its head tags
      }
    },
    { only: 'desktop' }
  );

  h.test(
    'the 500 page: HTTP 500, in Vietnamese, inside the site frame',
    async (t) => {
      const { page, response } = await h.open(t, '/500', { allow: ALLOW_ERRORS });
      assert.equal(response.status(), 500);
      await waitForH1(page, 'Đã có lỗi xảy ra');
      const info = await meta(page);
      assert.equal(norm(info.title), 'Đã có lỗi xảy ra | Hadith tiếng Việt | Hadith.vn');
      assert.equal(info.lang, 'vi');
      assert.equal(info.robots, 'noindex');
      await page.getByText('Máy chủ không hiển thị được trang này. Vui lòng thử lại sau ít phút.').waitFor();
      const links = await page.locator('main ul a').evaluateAll((items) => items.map((a) => [a.getAttribute('href'), a.textContent.trim()]));
      assert.deepEqual(links, [
        ['/', 'Trang chủ'],
        ['/books', 'Bộ sưu tập hadith'],
        ['/categories', 'Danh mục'],
        ['/search', 'Tìm kiếm'],
      ]);
      // the site frame: a way home outside the page body
      assert.ok((await page.locator('a[href="/"]:not(main a)').count()) > 0, 'the site header links home');
    },
    { smoke: true }
  );
});
