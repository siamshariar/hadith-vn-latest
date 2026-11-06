// Keyboard and screen-reader paths (docs/hadith-design-system.md, Accessibility): the
// skip link, the dialogs' focus, the navigation, anchors below the header, settings before
// the first paint, Undo, copy feedback and headings.
'use strict';

const { BASE, assert, sleep, spec, stored, until, waitForText } = require('./harness');

const BUKHARI = 'sahih-al-bukhari';
const CHAPTER = `/books/${BUKHARI}/chapters/1`;

// What has keyboard focus, and the dialog it is in (by the dialog's name).
const focused = (page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    const dialog = el && el.closest('[role="dialog"]');
    const titleId = dialog && dialog.getAttribute('aria-labelledby');
    return {
      id: el ? el.id : null,
      name: el ? el.getAttribute('aria-label') || el.textContent.trim().slice(0, 60) : null,
      dialog: dialog ? (titleId ? (document.getElementById(titleId) || {}).textContent : dialog.getAttribute('aria-label')) || null : null,
    };
  });

// How far below the header's place an element's top is.
const belowHeader = (page, id) =>
  page.evaluate((x) => {
    const height = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height'), 10);
    return Math.round(document.getElementById(x).getBoundingClientRect().top - height);
  }, id);

module.exports = spec(module, 'keyboard and screen readers', (h) => {
  h.test('the skip link is the first Tab stop and moves focus to the main content', async (t) => {
    const { page } = await h.open(t, '/');
    await page.keyboard.press('Tab');
    const link = await page.evaluate(() => {
      const a = document.activeElement;
      const box = a.getBoundingClientRect();
      return { href: a.getAttribute('href'), text: a.textContent.trim(), top: box.top, height: box.height };
    });
    assert.equal(link.href, '#viewport');
    assert.equal(link.text, 'Chuyển đến nội dung chính');
    assert.ok(link.top >= 0 && link.height >= 44, `on screen, 44px tall: ${JSON.stringify(link)}`);
    await page.keyboard.press('Enter');
    await until(async () => (await focused(page)).id === 'viewport', 'focus on the main content');
  });

  h.test(
    'the phone drawer and the reading settings are dialogs: focus goes in, stays, comes back; Esc clears the filter first',
    async (t) => {
      const { page } = await h.open(t, CHAPTER);
      // the reading settings, from the header
      const tune = page.getByRole('button', { name: 'Cài đặt hiển thị', exact: true });
      await tune.focus();
      await page.keyboard.press('Enter');
      await until(async () => (await focused(page)).dialog === 'Cài đặt hiển thị', 'focus in the Reading settings dialog');
      for (let i = 1; i <= 16; i += 1) {
        await page.keyboard.press('Tab');
        assert.ok((await focused(page)).dialog, `Tab ${i} stays in the dialog`);
      }
      await page.keyboard.press('Escape');
      await until(async () => (await focused(page)).name === 'Cài đặt hiển thị', 'closed; focus back on its button');

      // the navigation, from the title
      const title = page.locator('button[class*="titleButton"]');
      await title.focus();
      await page.keyboard.press('Enter');
      await until(async () => /Danh mục/.test((await focused(page)).dialog || ''), 'focus in the navigation dialog');
      for (let i = 1; i <= 12; i += 1) {
        await page.keyboard.press('Tab');
        assert.ok((await focused(page)).dialog, `Tab ${i} stays in the dialog`);
      }
      const dialog = page.locator('.MuiDrawer-paper[role="dialog"]');
      const filter = dialog.getByRole('searchbox');
      await filter.fill('muslim');
      await page.keyboard.press('Escape');
      assert.equal(await filter.inputValue(), '', 'Esc clears the filter');
      assert.ok((await focused(page)).dialog, 'and the drawer stays open');
      await page.keyboard.press('Escape');
      await until(async () => (await page.evaluate(() => document.activeElement.className)).includes('titleButton'), 'closed; focus back on the title');
    },
    { only: 'phone' }
  );

  h.test(
    'the navigation: no control inside another; going down a level moves focus into it',
    async (t) => {
      const { page } = await h.open(t, CHAPTER);
      const aside = page.locator('aside');
      const nested = await page.evaluate(() => document.querySelectorAll('a a, a button, button a, button button').length);
      assert.equal(nested, 0, 'no control inside another');
      const nav = aside.getByRole('navigation', { name: 'Bộ sưu tập hadith' });
      await until(async () => (await nav.locator('a').count()) > 50, 'the chapters');

      await aside.getByRole('button', { name: 'Quay lại' }).focus();
      await page.keyboard.press('Enter');
      await until(async () => (await nav.getByRole('button').count()) > 5, 'Enter goes up to the collections');
      assert.ok(await page.evaluate(() => document.activeElement.closest('nav') !== null), 'focus on the first row');
      await page.keyboard.press('Enter');
      await until(async () => (await aside.getByRole('button', { name: 'Quay lại' }).count()) === 1, 'Enter goes down into a collection');
      assert.equal((await focused(page)).name, 'Quay lại', 'focus on the way back up');
    },
    { only: 'desktop' }
  );

  h.test('links to a hadith land just below the header: down, up, and from a pin', async (t) => {
    const { page } = await h.open(t, CHAPTER);
    const ids = await page.locator('article[id^="hadith-"]').evaluateAll((cards) => cards.map((card) => card.id));
    for (const id of [ids[ids.length - 1], ids[1]]) {
      await page.evaluate((x) => {
        window.location.hash = x;
      }, id);
      await sleep(700);
      const gap = await belowHeader(page, id);
      assert.ok(gap >= 0 && gap <= 24, `#${id}: ${gap}px below the header`);
    }
    // a pin opens its chapter at the card, by a client-side navigation
    await h.goto(page, '/');
    const target = ids[ids.length - 2];
    await page.evaluate((url) => window.next.router.push(url), `${CHAPTER}#${target}`);
    await page.waitForFunction((x) => document.getElementById(x), target);
    await sleep(900);
    const gap = await belowHeader(page, target);
    assert.ok(gap >= 0 && gap <= 24, `from a pin: ${gap}px below the header`);
  });

  h.test('saved reading settings are on the page before its scripts run', async (t) => {
    // the scripts are blocked, so their failed loads are expected
    const { page, context } = await h.open(t, '/', { allow: [/Failed to load resource|ERR_FAILED|ChunkLoadError/] });
    await page.evaluate(() => {
      localStorage.setItem(
        'settings',
        JSON.stringify({
          theme: 'dark',
          version: 5,
          fontSize: { arabic: 34, translation: 22 },
          fontFamily: { arabic: 'Amiri', translation: 'TimesNewRoman' },
          reader: { showArabic: false, textOrder: 'translation' },
        })
      );
      localStorage.setItem('hadith-nav', 'closed');
    });
    await context.route(/\/_next\/static\/chunks\//, (route) => route.abort());
    await page.goto(BASE + CHAPTER, { waitUntil: 'domcontentloaded' });
    const early = await page.evaluate(() => {
      const html = document.documentElement;
      const style = getComputedStyle(html);
      return {
        theme: html.dataset.theme,
        body: document.body.className,
        arabicSize: style.getPropertyValue('--fs-arabic').trim(),
        translationSize: style.getPropertyValue('--fs-trans').trim(),
        translationFace: /TimesNewRoman/.test(style.getPropertyValue('--font-trans')),
        arabic: html.getAttribute('data-arabic'),
        order: html.getAttribute('data-text-order'),
        nav: html.getAttribute('data-nav'),
      };
    });
    assert.deepEqual(early, {
      theme: 'dark',
      body: 'dark',
      arabicSize: '34px',
      translationSize: '22px',
      translationFace: true,
      arabic: 'hidden',
      order: 'translation',
      nav: 'closed',
    });
  });

  h.test(
    'a settings reset can be undone',
    async (t) => {
      const { page } = await h.open(t, '/settings');
      const size = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--fs-trans').trim());
      const before = await size();
      await page.getByRole('button', { name: 'Tăng cỡ chữ bản dịch', exact: true }).click();
      await until(async () => (await size()) !== before, 'translation size changed');
      const changed = await size();
      await page.getByRole('button', { name: 'Đặt lại', exact: true }).click();
      await waitForText(page.getByRole('status').filter({ hasText: 'Đã đặt lại' }), 'Đã đặt lại cài đặt. Hoàn tác');
      assert.equal(await size(), before, 'reset');
      await page.getByRole('button', { name: 'Hoàn tác', exact: true }).click();
      await until(async () => (await size()) === changed, 'Undo brings the size back');
      assert.equal(`${(await stored(page, 'settings')).fontSize.translation}px`, changed, 'and saves it');
      assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), 'Đặt lại', 'focus back on Reset');
    },
    { smoke: true }
  );

  h.test(
    'a failed copy says so',
    async (t) => {
      const { page } = await h.open(t, CHAPTER, {
        initScript: () => {
          Object.defineProperty(navigator, 'clipboard', {
            value: { writeText: () => Promise.reject(new Error('denied')) },
            configurable: true,
          });
        },
      });
      await page.locator('article[id^="hadith-"]').first().getByRole('button', { name: 'Tùy chọn hadith' }).click();
      await page.getByRole('menuitem', { name: 'Copy liên kết' }).click();
      await waitForText(page.locator('.MuiSnackbar-root'), 'Không copy được');
    },
    { smoke: true }
  );

  h.test(
    'card titles follow the page: h2 under the page title, h3 under a section heading',
    async (t) => {
      const levels = (page) => page.evaluate(() => [...document.querySelectorAll('main h1, main h2, main h3')].map((x) => x.tagName));
      const { page } = await h.open(t, '/categories/the-creed/hadiths');
      const list = await levels(page);
      assert.equal(list[0], 'H1');
      assert.ok(list.includes('H2') && !list.includes('H3'), `a category's list: ${list.slice(0, 5)}`);
      await h.goto(page, '/search?q=c%E1%BA%A7u%20nguy%E1%BB%87n');
      const search = await levels(page);
      assert.ok(search.indexOf('H2') > 0 && search.indexOf('H3') > search.indexOf('H2'), `search results: ${search.slice(0, 5)}`);
    },
    { smoke: true }
  );
});
