// Keyboard and screen-reader paths (docs/hadith-design-system.md, Accessibility): the
// skip link, the dialogs' focus, the sidebar tree, the chapter select, anchors below the
// reading bar, settings before the first paint, Undo, copy feedback, headings and the
// header's current section.
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
      dialog: titleId ? (document.getElementById(titleId) || {}).textContent || null : null,
    };
  });

// How far below the reading bar an element's top is.
const belowBar = (page, id) =>
  page.evaluate((x) => {
    const bar = document.querySelector('[data-reader-bar]').getBoundingClientRect();
    return Math.round(document.getElementById(x).getBoundingClientRect().top - bar.bottom);
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
    'the phone panels are dialogs: focus goes in, stays, comes back; Esc clears the filter first',
    async (t) => {
      const { page } = await h.open(t, CHAPTER);
      // Settings, from the header
      await page.getByRole('link', { name: 'Cài đặt', exact: true }).focus();
      await page.keyboard.press('Enter');
      await until(async () => {
        const f = await focused(page);
        return f.name === 'Quay lại' && f.dialog === 'Cài đặt';
      }, 'focus on Back, in the Settings dialog');
      for (let i = 1; i <= 30; i += 1) {
        await page.keyboard.press('Tab');
        assert.ok((await focused(page)).dialog, `Tab ${i} stays in the dialog`);
      }
      await page.keyboard.press('Escape');
      await until(async () => (await focused(page)).name === 'Cài đặt', 'closed; focus back on the Settings link');
      assert.ok((await page.locator('[role="dialog"][inert]').count()) >= 1, 'a closed panel is inert');

      // Categories, from the menu drawer (which hands focus back to its button as it closes)
      await page.getByRole('button', { name: 'Mở menu' }).click();
      await page.locator('.MuiDrawer-paper a[href="/categories"]').click();
      await until(async () => {
        const f = await focused(page);
        return f.name === 'Quay lại' && f.dialog === 'Danh mục';
      }, 'focus on Back, in the Categories dialog');
      const filter = page.getByRole('dialog', { name: 'Danh mục' }).getByRole('searchbox');
      await filter.fill('giao ly');
      await page.keyboard.press('Escape');
      assert.equal(await filter.inputValue(), '', 'Esc clears the filter');
      assert.ok((await focused(page)).dialog, 'and the panel stays open');
      await page.keyboard.press('Escape');
      await until(async () => (await focused(page)).name === 'Mở menu', 'closed; focus back on the menu button');
    },
    { only: 'phone' }
  );

  h.test(
    'the sidebar tree: each link, then its own toggle',
    async (t) => {
      const { page } = await h.open(t, CHAPTER);
      const aside = page.locator('aside');
      const chapters = aside.locator(`a[href^="/books/${BUKHARI}/chapters/"]`);
      await until(async () => (await chapters.count()) > 50, 'the sidebar lists the chapters');
      const nested = await page.evaluate(() => document.querySelectorAll('a a, a button, button a, button button').length);
      assert.equal(nested, 0, 'no control inside another');

      await aside.locator(`a[href="/books/${BUKHARI}"]`).focus();
      await page.keyboard.press('Tab');
      const toggle = await page.evaluate(() => ({
        tag: document.activeElement.tagName,
        name: document.activeElement.getAttribute('aria-label'),
        expanded: document.activeElement.getAttribute('aria-expanded'),
      }));
      assert.deepEqual(toggle, { tag: 'BUTTON', name: 'Các chương của Sahih al-Bukhari', expanded: 'true' });
      await page.keyboard.press('Enter');
      await until(async () => (await chapters.count()) === 0, 'Enter closes the branch');
      assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-expanded')), 'false');
      await page.keyboard.press(' ');
      await until(async () => (await chapters.count()) > 50, 'Space opens it again');
    },
    { only: 'desktop' }
  );

  h.test(
    'the chapter select: arrow keys browse, Enter opens, leaving puts the chapter back',
    async (t) => {
      const { page } = await h.open(t, CHAPTER);
      const select = page.getByRole('combobox', { name: 'Chọn chương' });
      const hint = await select.evaluate((el) => document.getElementById(el.getAttribute('aria-describedby')).textContent);
      assert.equal(hint, 'Mở chương bạn chọn. Với bàn phím: phím mũi tên để chọn, Enter để mở.');
      await select.focus();
      await page.keyboard.press('ArrowDown');
      await sleep(500);
      assert.equal(new URL(page.url()).pathname, CHAPTER, 'an arrow key does not leave the page');
      if ((await select.inputValue()) === '1') {
        // an engine where the arrow opens the list (as on macOS): nothing changed
        await page.keyboard.press('Escape');
        return;
      }
      await page.keyboard.press('Tab');
      assert.equal(await select.inputValue(), '1', 'leaving the select puts the current chapter back');
      await select.focus();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await h.waitForPath(page, (url) => url.pathname === `/books/${BUKHARI}/chapters/3`, 'Enter opens the chapter shown');
    },
    { smoke: true }
  );

  h.test('links to a hadith land just below the reading bar: down, up, and from a pin', async (t) => {
    const { page } = await h.open(t, CHAPTER);
    const ids = await page.locator('article[id^="hadith-"]').evaluateAll((cards) => cards.map((card) => card.id));
    for (const id of [ids[ids.length - 1], ids[1]]) {
      await page.evaluate((x) => {
        window.location.hash = x;
      }, id);
      await sleep(700);
      const gap = await belowBar(page, id);
      assert.ok(gap >= 0 && gap <= 24, `#${id}: ${gap}px below the reading bar`);
    }
    // a pin opens its chapter at the card, by a client-side navigation
    await h.goto(page, '/');
    const target = ids[ids.length - 2];
    await page.evaluate((url) => window.next.router.push(url), `${CHAPTER}#${target}`);
    await page.waitForFunction((x) => document.getElementById(x), target);
    await sleep(900);
    const gap = await belowBar(page, target);
    assert.ok(gap >= 0 && gap <= 24, `from a pin: ${gap}px below the reading bar`);
  });

  h.test('saved reading settings are on the page before its scripts run', async (t) => {
    // the scripts are blocked, so their failed loads are expected
    const { page, context } = await h.open(t, '/', { allow: [/Failed to load resource|ERR_FAILED|ChunkLoadError/] });
    await page.evaluate(() =>
      localStorage.setItem(
        'settings',
        JSON.stringify({
          theme: 'dark',
          version: 4,
          fontSize: { arabic: 34, translation: 22 },
          fontFamily: { arabic: 'Amiri', translation: 'TimesNewRoman' },
          reader: { showArabic: false, textOrder: 'translation' },
        })
      )
    );
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
      await page.locator('article[id^="hadith-"]').first().getByRole('button', { name: 'Copy trích dẫn, văn bản hoặc liên kết' }).click();
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

  h.test(
    'the header marks its section: the page itself, and the pages within it',
    async (t) => {
      // the desktop header's own nav (the breadcrumb trail links to /books too)
      const section = (page, href) => page.locator(`nav[class*="Header_nav"] a[href="${href}"]`);
      const { page } = await h.open(t, '/books');
      assert.equal(await section(page, '/books').getAttribute('aria-current'), 'page');
      await h.goto(page, CHAPTER);
      assert.equal(await section(page, '/books').getAttribute('aria-current'), 'true');
      assert.equal(await section(page, '/categories').getAttribute('aria-current'), null);
    },
    { only: 'desktop' }
  );
});
