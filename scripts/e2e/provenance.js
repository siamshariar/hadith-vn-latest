// No page names a data source: the site presents the hadith data as its own. Readers never
// see "HadeethEnc", "Fawaz", "hadith-api", an edition code (eng-bukhari, hadeethenc-vi ...)
// or a link to a source's site or files. The one exception is HadeethEnc's source line,
// which its terms require wherever its content is shown (data-source-line): it must read
// exactly the catalog's sourceLine ("Nguồn: HadeethEnc.com"), on its hadiths and under its
// translations shown with another collection's hadith.
//
// Checked on the vn site (BASE), and on the bd (BASE_BD) and ac (BASE_AC) sites when they
// are set: a hadith page of every collection, a hadith with linked translations, the home
// page, the collections, two collections, a chapter, the categories, a category and its
// hadiths, search, data & method and about. Covered: the page's text (also what is folded
// or visually hidden), its title, meta tags, the attributes readers meet (title,
// aria-label, alt, placeholder) and links to other sites. The site's own URLs keep the
// API's slugs (/books/hadeethenc/...) and are not checked.
'use strict';

const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { BASE, api, assert, loc, spec } = require('./harness');

const SITES = [
  { name: 'vn', base: BASE, locale: 'vi-VN', ui: 'vi', lang: 'vi' },
  { name: 'bd', base: (process.env.BASE_BD || '').replace(/\/+$/, ''), locale: 'bn-BD', ui: 'bn', lang: 'bn' },
  { name: 'ac', base: (process.env.BASE_AC || '').replace(/\/+$/, ''), locale: 'en-US', ui: 'en', lang: 'en' },
].filter((site) => site.base);

// Names and hosts of the sources; edition codes come from the API.
const SOURCE_NAMES = 'hadeeth\\s*enc|fawaz|hadith-api|jsdelivr|sunnah\\.com|↗';

// lib/i18n.js is an ES module; Node says so once, which is not a test problem.
process.removeAllListeners('warning');
process.on('warning', (warning) => {
  if (warning.code !== 'MODULE_TYPELESS_PACKAGE_JSON') console.warn(warning.stack || String(warning));
});
let i18n;
const sourceLineIn = async (ui) => {
  i18n = i18n || import(pathToFileURL(path.join(__dirname, '..', '..', 'lib', 'i18n.js')).href);
  return (await i18n).translate(ui, 'sourceLine', { source: 'HadeethEnc.com' });
};

// The first hadith of every collection (by id: some have no citable number), and the
// collections' API names for the report.
async function firstHadiths() {
  const books = await api(`/books${loc('en')}`);
  return Promise.all(
    books.map(async (book) => {
      const { chapters } = await api(`/books/${book.slug}${loc('en')}`);
      const list = await api(`/books/${book.slug}/chapters/${chapters[0].chapterNo}${loc('en')}?perPage=1`);
      return { book, path: `/hadiths/${list.hadiths[0].id}` };
    })
  );
}

// What the open page shows that names a source: [] when nothing does.
function namedSources(page, { pattern, codes, sourceLine }) {
  return page.evaluate(
    ({ pattern, codes, sourceLine }) => {
      const bad = new RegExp(pattern, 'i');
      const code = new RegExp(`(^|[^a-z0-9-])(${codes.join('|')})(?![a-z0-9-])`, 'i');
      const names = (text) => bad.test(text) || code.test(text);
      const problems = [];
      const lines = [...document.querySelectorAll('[data-source-line]')];
      lines.forEach((el) => {
        if (el.textContent.trim() !== sourceLine) problems.push(`source line reads "${el.textContent.trim()}"`);
      });
      // every text of the body, shown or not, without the source lines and scripts
      const body = document.body.cloneNode(true);
      body.querySelectorAll('[data-source-line], script, style, noscript, template').forEach((el) => el.remove());
      const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const text = node.textContent.replace(/\s+/g, ' ').trim();
        if (text && names(text)) problems.push(`text: ${text.slice(0, 140)}`);
      }
      if (names(document.title)) problems.push(`title: ${document.title}`);
      const own = (value) => value.startsWith(location.origin) || value.startsWith('/');
      document.querySelectorAll('[title], [aria-label], [alt], [placeholder], meta[content]').forEach((el) => {
        ['title', 'aria-label', 'alt', 'placeholder', 'content'].forEach((name) => {
          const value = el.getAttribute(name);
          if (value && !own(value) && names(value)) problems.push(`${el.tagName.toLowerCase()} ${name}: ${value.slice(0, 140)}`);
        });
      });
      document.querySelectorAll('a[href], link[href]').forEach((el) => {
        const href = el.getAttribute('href');
        if (/^https?:/i.test(href) && !own(href) && names(href)) problems.push(`link: ${href}`);
      });
      return problems;
    },
    { pattern, codes, sourceLine }
  );
}

const linesIn = (page, selector) => page.locator(selector).count();

module.exports = spec(module, 'no source names', (h) => {
  for (const site of SITES) {
    h.test(
      `${site.name}: no page names a source, except HadeethEnc's source line`,
      async (t) => {
        const [editions, first, bukhari1, creed] = await Promise.all([
          api('/editions'),
          firstHadiths(),
          api(`/books/bukhari/hadiths/1${loc(site.lang)}`),
          api(`/categories/the-creed/hadiths${loc(site.lang)}?perPage=20`),
        ]);
        const options = {
          pattern: SOURCE_NAMES,
          codes: editions.map((edition) => edition.code.replace(/[^a-z0-9-]/gi, '')),
          sourceLine: await sourceLineIn(site.ui),
        };
        const topic = first.find((item) => item.book.source === 'hadeethenc');
        assert.ok(topic, 'the API has the topic collection');
        const paths = [
          ...first.map((item) => item.path),
          // the topic collection's translations under Bukhari 3: the primary one (vn) or an extra one
          '/books/sahih-al-bukhari/hadiths/3?tr=vi,bn',
          '/books/sahih-al-bukhari/hadiths/1',
          '/',
          '/books',
          '/books/sahih-al-bukhari',
          '/books/hadeethenc',
          '/books/sahih-al-bukhari/chapters/1?translated=1',
          '/categories',
          '/categories/the-creed',
          '/categories/the-creed/hadiths',
          `/search?q=${encodeURIComponent('انما الاعمال')}`,
          '/sources',
          '/about',
        ];

        const { page } = await h.open(t, null, { context: { locale: site.locale } });
        const report = [];
        for (const pathname of paths) {
          const response = await page.goto(site.base + pathname, { waitUntil: 'domcontentloaded' });
          assert.equal(response.status(), 200, `${site.name} ${pathname}`);
          await h.waitForHydration(page);
          (await namedSources(page, options)).forEach((problem) => report.push(`${pathname}: ${problem}`));

          // where the source line belongs
          const all = await linesIn(page, '[data-source-line]');
          if (pathname === topic.path) {
            if (all !== 1) report.push(`${pathname}: ${all} source lines on a hadith of the topic collection (want 1)`);
          } else if (pathname.startsWith('/books/sahih-al-bukhari/hadiths/3')) {
            const linked = await linesIn(page, 'section[class*="translationBlock"] [class*="linked"] [data-source-line]');
            if (!all || linked !== all) report.push(`${pathname}: ${linked} of ${all} source lines under a linked translation`);
          } else if (pathname === '/books/sahih-al-bukhari/hadiths/1' && !bukhari1.linkedTranslation) {
            if (all) report.push(`${pathname}: ${all} source lines without HadeethEnc's content`);
          } else if (pathname === '/categories/the-creed/hadiths') {
            const cards = await page.locator('article[id^="hadith-"]').count();
            if (cards !== creed.hadiths.length || all !== cards) report.push(`${pathname}: ${all} source lines for ${cards} cards`);
          } else if (pathname === '/sources' && all !== 1) {
            report.push(`${pathname}: ${all} source lines (want 1, with the topic collection)`);
          }
        }
        assert.deepEqual([...new Set(report)], [], `${site.name}: pages naming a source`);
      },
      { only: 'desktop' }
    );
  }
});
