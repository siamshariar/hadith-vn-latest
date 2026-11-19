// No page names a data source: the site presents the hadith data as its own. Readers never
// see "HadeethEnc", "Fawaz", "hadith-api", an edition code (eng-bukhari, hadeethenc-vi ...)
// or a link to a source's site or files: not even a credit line under HadeethEnc's content
// (the owner's decision of 2026-11-19).
//
// Checked on the vn site (BASE), and on the bd (BASE_BD) and ac (BASE_AC) sites when they
// are set: a hadith page of every collection, a hadith with linked translations, the home
// page, the collections, two collections, a chapter, the categories, a category and its
// hadiths, search, data & method and about. Covered: the page's text (also what is folded
// or visually hidden), its title, meta tags, the attributes readers meet (title,
// aria-label, alt, placeholder) and links to other sites. The site's own URLs keep the
// API's slugs (/books/hadeethenc/...) and are not checked.
'use strict';

const { BASE, api, assert, loc, spec } = require('./harness');

const SITES = [
  { name: 'vn', base: BASE, locale: 'vi-VN', ui: 'vi', lang: 'vi' },
  { name: 'bd', base: (process.env.BASE_BD || '').replace(/\/+$/, ''), locale: 'bn-BD', ui: 'bn', lang: 'bn' },
  { name: 'ac', base: (process.env.BASE_AC || '').replace(/\/+$/, ''), locale: 'en-US', ui: 'en', lang: 'en' },
].filter((site) => site.base);

// Names and hosts of the sources; edition codes come from the API.
const SOURCE_NAMES = 'hadeeth\\s*enc|fawaz|hadith-api|jsdelivr|sunnah\\.com|↗';

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
function namedSources(page, { pattern, codes }) {
  return page.evaluate(
    ({ pattern, codes }) => {
      const bad = new RegExp(pattern, 'i');
      const code = new RegExp(`(^|[^a-z0-9-])(${codes.join('|')})(?![a-z0-9-])`, 'i');
      const names = (text) => bad.test(text) || code.test(text);
      const problems = [];
      // every text of the body, shown or not, without scripts
      const body = document.body.cloneNode(true);
      body.querySelectorAll('script, style, noscript, template').forEach((el) => el.remove());
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
    { pattern, codes }
  );
}

module.exports = spec(module, 'no source names', (h) => {
  for (const site of SITES) {
    h.test(
      `${site.name}: no page names a source`,
      async (t) => {
        const [editions, first] = await Promise.all([api('/editions'), firstHadiths()]);
        const options = {
          pattern: SOURCE_NAMES,
          codes: editions.map((edition) => edition.code.replace(/[^a-z0-9-]/gi, '')),
        };
        const topic = first.find((item) => item.book.source === 'hadeethenc');
        assert.ok(topic, 'the API has the topic collection');
        const paths = [
          ...first.map((item) => item.path),
          // the topic collection's translation under Bukhari 3 (vn)
          '/books/sahih-al-bukhari/hadiths/3',
          '/books/sahih-al-bukhari/hadiths/1',
          '/',
          '/books',
          '/books/sahih-al-bukhari',
          '/books/hadeethenc',
          '/books/sahih-al-bukhari/chapters/1/translated',
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

        }
        assert.deepEqual([...new Set(report)], [], `${site.name}: pages naming a source`);
      },
      { only: 'desktop' }
    );
  }
});
