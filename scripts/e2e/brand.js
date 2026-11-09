// The brand (docs/hadith-design-system.md), the Quran sites' look: a grey page with a white
// header and white cards on the web, plain white reading pages on phones; the colour logo on
// every page (the dark logo in the dark theme); the band in the site's colours behind the home
// page's two cards, on the web only; the green on the search button; the frame of the reading
// page; and computed colours that keep text readable in both themes. "Báo lỗi" writes to the
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
  fontSize: { arabic: null, translation: null },
  fontFamily: { arabic: 'PDMSIslam', translation: 'Roboto' },
  theme: 'dark',
  reader: { showArabic: true, textOrder: 'arabic' },
  verseMode: 'scroll',
  activeVerse: 1,
  autoScroll: true,
  notification: false,
  version: 5,
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
  const link = hero && [...hero.querySelectorAll('a[class*="more"]')].find(visible);
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
    link: link ? [css(link, 'color'), css(link.parentElement, 'backgroundColor')] : null,
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
    'light: the white header on the grey page, colour logo, the band on the web, the green',
    async (t) => {
      const { page } = await h.open(t, '/');
      await waitForH1(page, 'Hadith tiếng Việt');
      const c = await page.evaluate(brandColours);
      assert.equal(c.body, 'rgb(244, 244, 244)', 'page #F4F4F4');
      assert.equal(c.header, 'rgb(255, 255, 255)', 'a white header');
      assert.equal(c.logo, '/img/logo.png', 'the colour logo');
      assert.equal(c.logoLoaded, true);
      if (h.desktop) assert.match(c.heroImage, /linear-gradient/, 'the band in the site\'s colours');
      else assert.equal(c.heroImage, 'none', 'no band on phones');
      assert.deepEqual(c.link, ['rgb(70, 101, 72)', 'rgb(255, 255, 255)'], 'the cards\' links #466548 on white');
      assert.ok(contrast(c.link[0], c.link[1]) >= 4.5, 'link text readable');

      // the band's cards: three in a row on the web, the hadith of the day first; on phones it alone
      const cards = await page.evaluate(() =>
        [...document.querySelectorAll('section[aria-labelledby="site-heading"] h2')]
          .map((h2) => h2.parentElement.getBoundingClientRect())
          .filter((box) => box.width > 0)
          .map((box) => [Math.round(box.top), Math.round(box.left)])
      );
      if (h.desktop) {
        assert.equal(cards.length, 3, JSON.stringify(cards));
        assert.ok(cards.every((box) => box[0] === cards[0][0]) && cards[0][1] < cards[1][1] && cards[1][1] < cards[2][1], JSON.stringify(cards));
      } else assert.equal(cards.length, 1, JSON.stringify(cards));

      // a reading page: the same header; the reading faces and sizes
      const home = await api(`/home${loc()}`);
      await h.goto(page, `/books/${home.books[0].slug}/chapters/1`);
      const content = await page.evaluate(brandColours);
      assert.equal(content.header, 'rgb(255, 255, 255)');
      assert.equal(content.logo, h.desktop ? '/img/logo.png' : null, 'the reading page\'s phone header has its title instead');
      const reading = await page.evaluate(() => {
        const arabic = getComputedStyle(document.querySelector('article div[lang="ar"]'));
        const card = document.querySelector('main div[class*="Page_page"]');
        return { arabicFace: arabic.fontFamily, arabicSize: arabic.fontSize, arabicLeading: arabic.lineHeight, card: getComputedStyle(card).backgroundColor, bodyBehind: getComputedStyle(card.closest('div[class*="Layout_body"]')).backgroundColor };
      });
      assert.match(reading.arabicFace, /arabicFont/, 'the Arabic in PDMS');
      assert.equal(reading.card, 'rgb(255, 255, 255)');
      assert.equal(reading.bodyBehind, h.desktop ? 'rgba(0, 0, 0, 0)' : 'rgb(255, 255, 255)', 'white to the edges on phones');
    },
    { smoke: true }
  );

  h.test(
    'dark: the Quran sites\' night colours, the dark logo, the light green',
    async (t) => {
      const { page } = await h.open(t, null, { initScript: `localStorage.setItem('settings', ${JSON.stringify(DARK)})` });
      await h.goto(page, '/');
      // set before the first paint (pages/_document.js), on <html> and <body>
      await until(async () => (await page.evaluate(() => document.body.className)) === 'dark', 'dark theme');
      assert.equal(await page.getAttribute('html', 'data-theme'), 'dark');
      await until(async () => /rgb\(168, 213, 176\)/.test(JSON.stringify((await page.evaluate(brandColours)).link)), 'the light green links of the cards');
      const c = await page.evaluate(brandColours);
      assert.equal(c.body, 'rgb(41, 49, 69)', 'page #293145');
      assert.equal(c.header, 'rgb(35, 42, 59)', 'header #232A3B');
      assert.equal(c.logo, '/img/logo_dark.png', 'the dark logo');
      assert.equal(c.logoLoaded, true, 'logo_dark.png is served');
      assert.deepEqual(c.link, ['rgb(168, 213, 176)', 'rgb(35, 42, 59)'], 'the cards\' links #A8D5B0 on #232A3B');
      assert.ok(contrast(c.link[0], c.link[1]) >= 4.5, 'link text readable');

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
    await page.locator('article > header').getByRole('button', { name: 'Tùy chọn hadith' }).click();
    assert.equal(await page.getByRole('menuitem', { name: 'Báo lỗi' }).getAttribute('href'), href, 'the ⋯ menu too');
  });
});

