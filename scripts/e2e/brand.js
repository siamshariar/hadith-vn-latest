// The brand (docs/hadith-design-system.md): the header on the page's own paper,
// closed by a hairline, with the colour logo on every page (the dark logo in the
// dark theme) and no ribbon; the masthead on the same paper, its heading in the
// display serif, no texture or ornament; the brand green on the search button;
// the hadith of the day and the figures right after the search; and computed
// colours that keep text readable in both themes. "Báo lỗi" writes to the
// site's contact address.
'use strict';

const path = require('node:path');
const { api, assert, loc, spec, until, waitForH1 } = require('./harness');

// The deployment's contact address (config/countries.json, lib/sites.js).
const countries = require(path.join(__dirname, '../../config/countries.json'));
const COUNTRY = (process.env.NEXT_PUBLIC_COUNTRY_CODE || 'vn').toLowerCase();
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || (countries[COUNTRY] && countries[COUNTRY].contactEmail) || 'deeniinfotech@gmail.com';

const DARK = JSON.stringify({
  view: { arabic: true, translation: true, tafseer: true },
  fontSize: { arabic: 28, translation: 18 },
  fontFamily: { arabic: 'Amiri', translation: 'BeVietnamPro' },
  theme: 'dark',
  reader: { showArabic: true, textOrder: 'arabic' },
  verseMode: 'scroll',
  activeVerse: 1,
  autoScroll: true,
  notification: false,
  version: 4,
});

// Computed colours of the visible header, its logo and the hero.
function brandColours() {
  const visible = (el) => el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const header = [...document.querySelectorAll('div[class*="Header_header"]')].find(visible);
  const logo = header && [...header.querySelectorAll('a[aria-label] img, a[aria-label] span[class*="wordmark"]')].find(visible);
  const h1 = document.querySelector('#site-heading');
  const hero = h1 && h1.closest('section');
  const tagline = hero && hero.querySelector('p');
  const bar = hero && hero.querySelector('span[class*="titleBar"]');
  const button = hero && hero.querySelector('form[role="search"] button[type="submit"]');
  // a computed property, null when the element is not on this page
  const css = (el, name, pseudo) => (el ? getComputedStyle(el, pseudo)[name] : null);
  return {
    body: css(document.body, 'backgroundColor'),
    header: css(header, 'backgroundColor'),
    headerRule: header ? `${css(header, 'borderBottomWidth')} ${css(header, 'borderBottomColor')}` : null,
    ribbon: css(header, 'backgroundImage', '::after'),
    h1Font: css(h1, 'fontFamily'),
    logo: logo ? (logo.tagName === 'IMG' ? new URL(logo.currentSrc || logo.src).pathname : `wordmark:${logo.textContent}`) : null,
    logoLoaded: logo && logo.tagName === 'IMG' ? logo.complete && logo.naturalWidth > 0 : null,
    heroImage: css(hero, 'backgroundImage'),
    h1: css(h1, 'color'),
    tagline: css(tagline, 'color'),
    bar: css(bar, 'backgroundImage'),
    barSize: bar ? `${bar.getBoundingClientRect().width}x${bar.getBoundingClientRect().height}` : null,
    button: button ? [css(button, 'backgroundColor'), css(button, 'color')] : null,
  };
}

// WCAG contrast of two "rgb(r, g, b)" colours.
function contrast(a, b) {
  const lum = (value) => {
    const [r, g, bl] = value.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
    const f = (v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bl);
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

module.exports = spec(module, 'brand', (h) => {
  h.test(
    'light: header on the paper, colour logo, hairline; masthead in the display serif, the brand green',
    async (t) => {
      const { page } = await h.open(t, '/');
      await waitForH1(page, 'Hadith tiếng Việt');
      const c = await page.evaluate(brandColours);
      assert.equal(c.body, 'rgb(245, 246, 241)', 'page #F5F6F1');
      assert.equal(c.header, 'rgb(245, 246, 241)', 'the header on the page colour');
      assert.equal(c.headerRule, '1px rgb(220, 222, 212)', 'closed by the #DCDED4 hairline');
      assert.equal(c.ribbon, 'none', 'no ribbon under the header');
      assert.equal(c.logo, '/img/logo.png', 'the colour logo');
      assert.equal(c.logoLoaded, true);
      assert.equal(c.heroImage, 'none', 'no texture or gradient behind the masthead');
      assert.equal(c.bar, null, 'no ornament under the heading');
      assert.equal(c.h1, 'rgb(20, 20, 19)', 'heading in ink #141413');
      assert.match(c.h1Font, /displayFont/, 'heading in the display serif');
      assert.equal(c.tagline, 'rgb(85, 87, 79)', 'tagline #55574F');
      assert.deepEqual(c.button, ['rgb(23, 58, 29)', 'rgb(245, 246, 241)'], 'button #173A1D, #F5F6F1 text');
      assert.ok(contrast(c.h1, c.body) >= 4.5 && contrast(c.tagline, c.body) >= 4.5, 'masthead text readable');
      assert.ok(contrast(c.button[0], c.button[1]) >= 4.5, 'button text readable');

      // the hadith of the day and the figures come right after the search
      const order = await page.evaluate(() => {
        const top = (el) => (el ? el.getBoundingClientRect().top + window.scrollY : null);
        return {
          hero: top(document.querySelector('#site-heading')),
          daily: top(document.querySelector('#daily-hadith')),
          stats: top(document.querySelector('main dl')),
          books: top(document.querySelector('#home-books')),
        };
      });
      assert.ok(order.hero < order.daily && order.daily < order.stats && order.stats < order.books, JSON.stringify(order));

      // the same header on a content page
      const home = await api(`/home${loc()}`);
      await h.goto(page, `/books/${home.books[0].slug}`);
      const content = await page.evaluate(brandColours);
      assert.equal(content.header, 'rgb(245, 246, 241)');
      assert.equal(content.headerRule, '1px rgb(220, 222, 212)');
      assert.equal(content.logo, '/img/logo.png');
    },
    { smoke: true }
  );

  h.test(
    'dark: the paper at night, the dark logo, the light brand green',
    async (t) => {
      const { page } = await h.open(t, null, { initScript: `localStorage.setItem('settings', ${JSON.stringify(DARK)})` });
      await h.goto(page, '/');
      // set before the first paint (pages/_document.js), on <html> and <body>
      await until(async () => (await page.evaluate(() => document.body.className)) === 'dark', 'dark theme');
      assert.equal(await page.getAttribute('html', 'data-theme'), 'dark');
      await until(async () => /rgb\(168, 213, 176\)/.test(JSON.stringify((await page.evaluate(brandColours)).button)), 'the dark button');
      const c = await page.evaluate(brandColours);
      assert.equal(c.body, 'rgb(24, 26, 23)', 'page #181A17');
      assert.equal(c.header, 'rgb(24, 26, 23)', 'the header on the page colour');
      assert.equal(c.headerRule, '1px rgb(53, 56, 49)', 'closed by the #353831 hairline');
      assert.equal(c.logo, '/img/logo_dark.png', 'the dark logo');
      assert.equal(c.logoLoaded, true, 'logo_dark.png is served');
      assert.equal(c.heroImage, 'none', 'no texture or gradient behind the masthead');
      assert.equal(c.h1, 'rgb(241, 242, 236)', 'heading #F1F2EC');
      assert.equal(c.tagline, 'rgb(191, 194, 183)', 'tagline #BFC2B7');
      assert.deepEqual(c.button, ['rgb(168, 213, 176)', 'rgb(16, 38, 26)'], 'button #A8D5B0 with #10261A');
      assert.ok(contrast(c.h1, c.body) >= 4.5 && contrast(c.tagline, c.body) >= 4.5, 'masthead text readable');
      assert.ok(contrast(c.button[0], c.button[1]) >= 4.5, 'button text readable');

      // links on cards and the page
      const links = await page.evaluate(() => {
        const out = [];
        document.querySelectorAll('main a[href]').forEach((a) => {
          const style = getComputedStyle(a);
          if (!a.getClientRects().length || style.visibility === 'hidden' || !a.textContent.trim()) return;
          let node = a;
          let bg = 'rgba(0, 0, 0, 0)';
          while (node && /rgba\(0, 0, 0, 0\)|transparent/.test(bg)) {
            const s = getComputedStyle(node);
            if (s.backgroundImage !== 'none') return; // the hero gradient: checked above
            bg = s.backgroundColor;
            node = node.parentElement;
          }
          out.push([a.textContent.trim().slice(0, 30), style.color, bg]);
        });
        return out;
      });
      const low = links.filter(([, fg, bg]) => !/rgba\(0, 0, 0, 0\)/.test(bg) && contrast(fg, bg) < 4.5);
      assert.deepEqual(low, [], 'links below 4.5:1');
    },
    { smoke: true }
  );

  h.test('"Báo lỗi" writes to the site\'s contact address', async (t) => {
    const { page } = await h.open(t, '/books/sahih-muslim/hadiths/8a');
    const href = await page.locator('section[aria-label="Tham chiếu"] a[href^="mailto:"]').getAttribute('href');
    assert.equal(new URL(href).pathname, CONTACT_EMAIL);
    await page.locator('article > header').getByRole('button', { name: 'Thêm thao tác' }).click();
    assert.equal(await page.getByRole('menuitem', { name: 'Báo lỗi' }).getAttribute('href'), href, 'the ⋯ menu too');
  });
});

