// Reading settings (the gear of the reader bar): font sizes, hiding the
// Arabic, translation first; the Settings dialog and page (the language, which
// the interface follows, fonts, theme); the theme toggle, and legible text in
// the dark theme. Each takes effect at once and is still there after a reload.
'use strict';

const { BASE, api, assert, interfaceStrings, loc, norm, sleep, stored, spec, until, waitForH1, waitForText } = require('./harness');

const BUKHARI = 'sahih-al-bukhari';
const fontSize = (locator) => locator.first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
const arabicText = (page) => page.locator('section[class*="arabicBlock"] div[lang="ar"]');
const translationText = (page) => page.locator('section[class*="translationBlock"] div[class*="translationText"]');

async function openReaderSettings(page) {
  await page.getByRole('button', { name: 'Cài đặt hiển thị' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Cài đặt hiển thị' });
  await dialog.waitFor();
  return dialog;
}
const stepValue = (dialog, label) => dialog.getByRole('group', { name: label }).locator('output').textContent().then(norm);

// Text a reader cannot read: WCAG contrast of each visible text against
// the colour behind it (backgrounds composited up the tree).
function lowContrast(minimum) {
  const parse = (value) => {
    const m = String(value).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const over = (top, bottom) => ({
    r: top.r * top.a + bottom.r * (1 - top.a),
    g: top.g * top.a + bottom.g * (1 - top.a),
    b: top.b * top.a + bottom.b * (1 - top.a),
    a: 1,
  });
  const luminance = ({ r, g, b }) => {
    const f = (v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const background = (el) => {
    const layers = [];
    for (let node = el; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.backgroundImage && style.backgroundImage !== 'none') return null; // gradients, images: skip
      const color = parse(style.backgroundColor);
      if (color && color.a > 0) {
        layers.push(color);
        if (color.a >= 1) break;
      }
    }
    return layers.reverse().reduce((under, layer) => over(layer, under), { r: 255, g: 255, b: 255, a: 1 });
  };
  const failures = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const el = node.parentElement;
    if (!node.textContent.trim() || !el || seen.has(el)) continue;
    seen.add(el);
    const box = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    if (box.width <= 1 || box.height <= 1 || style.visibility === 'hidden' || Number(style.opacity) === 0) continue;
    if (el.closest('[aria-hidden="true"], svg, option, script, style, noscript, .react-loading-skeleton')) continue;
    if (!node.textContent.replace(/[\u200b-\u200d\u2060\ufeff\s]/g, '')) continue; // zero-width placeholders
    let hiddenAncestor = false;
    for (let a = el; a; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (s.display === 'none' || Number(s.opacity) === 0) hiddenAncestor = true;
    }
    if (hiddenAncestor) continue;
    const bg = background(el);
    const fg = parse(style.color);
    if (!bg || !fg) continue;
    const text = over(fg, bg);
    const [l1, l2] = [luminance(text), luminance(bg)].sort((x, y) => y - x);
    const ratio = (l1 + 0.05) / (l2 + 0.05);
    if (ratio < minimum) {
      failures.push(`${ratio.toFixed(2)}:1 "${node.textContent.trim().slice(0, 40)}" (${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]})`);
    }
  }
  return failures;
}

module.exports = spec(module, 'settings', (h) => {
  h.test(
    'reader settings: sizes, hide Arabic, translation first; at once and after a reload',
    async (t) => {
      const { page } = await h.open(t, `/books/${BUKHARI}/hadiths/1`);
      const arabicBefore = await fontSize(arabicText(page));
      const translationBefore = await fontSize(translationText(page));
      let dialog = await openReaderSettings(page);
      assert.equal(await stepValue(dialog, 'Cỡ chữ tiếng Ả Rập'), '28');
      assert.equal(await stepValue(dialog, 'Cỡ chữ bản dịch'), '18');

      await dialog.getByRole('button', { name: 'Tăng cỡ chữ tiếng Ả Rập' }).click();
      await dialog.getByRole('button', { name: 'Tăng cỡ chữ bản dịch' }).click();
      assert.equal(await stepValue(dialog, 'Cỡ chữ tiếng Ả Rập'), '30');
      assert.equal(await stepValue(dialog, 'Cỡ chữ bản dịch'), '19');
      const arabicAfter = await fontSize(arabicText(page));
      const translationAfter = await fontSize(translationText(page));
      assert.ok(Math.abs(arabicAfter / arabicBefore - 30 / 28) < 0.01, `Arabic ${arabicBefore}px -> ${arabicAfter}px`);
      assert.ok(Math.abs(translationAfter / translationBefore - 19 / 18) < 0.01, `translation ${translationBefore}px -> ${translationAfter}px`);

      // translation first
      await dialog.locator('label', { hasText: 'Bản dịch trước' }).click();
      assert.equal(await dialog.getByRole('radio', { name: 'Bản dịch trước' }).isChecked(), true);
      const order = () =>
        page.evaluate(() => {
          const arabic = document.querySelector('section[class*="arabicBlock"]').getBoundingClientRect();
          const translation = document.querySelector('section[class*="translationBlock"]').getBoundingClientRect();
          return { stacked: Math.abs(arabic.left - translation.left) < 2, translationFirst: translation.top < arabic.top - 1 };
        });
      await until(async () => (await page.evaluate(() => document.documentElement.dataset.textOrder)) === 'translation', 'order set on <html>');
      const layout = await order();
      if (layout.stacked) assert.ok(layout.translationFirst, 'translation above the Arabic');

      // hide the Arabic: gone at once, and the order no longer applies
      const show = dialog.getByRole('switch', { name: 'Hiện nguyên văn tiếng Ả Rập' });
      assert.equal(await show.isChecked(), true);
      await show.uncheck();
      await until(async () => !(await arabicText(page).isVisible()), 'Arabic hidden');
      assert.equal(await dialog.getByRole('radio', { name: 'Bản dịch trước' }).isDisabled(), true);
      await dialog.getByRole('button', { name: 'Đóng' }).click();
      await dialog.waitFor({ state: 'hidden' });

      // all of it after a reload, and on list pages
      await page.reload();
      await h.waitForHydration(page);
      await until(async () => !(await arabicText(page).isVisible()), 'Arabic still hidden after a reload');
      const saved = await stored(page, 'settings');
      assert.deepEqual(saved.fontSize, { arabic: 30, translation: 19 });
      assert.deepEqual(saved.reader, { showArabic: false, textOrder: 'translation' });
      await h.goto(page, `/books/${BUKHARI}/chapters/1`);
      await until(async () => (await page.locator('article[id^="hadith-"] div[lang="ar"]').first().isVisible()) === false, 'card Arabic hidden');

      dialog = await openReaderSettings(page);
      assert.equal(await stepValue(dialog, 'Cỡ chữ tiếng Ả Rập'), '30');
      await dialog.getByRole('switch', { name: 'Hiện nguyên văn tiếng Ả Rập' }).check();
      await until(() => page.locator('article[id^="hadith-"] div[lang="ar"]').first().isVisible(), 'card Arabic back');
      const card = await page.locator('article[id^="hadith-"]').first().evaluate((article) => {
        const arabic = article.querySelector('div[lang="ar"]').getBoundingClientRect();
        const translation = article.querySelector('div[class*="translationCol"]').getBoundingClientRect();
        return { stacked: Math.abs(arabic.left - translation.left) < 40, translationFirst: translation.top < arabic.top - 1 };
      });
      if (card.stacked) assert.ok(card.translationFirst, 'card: translation above the Arabic');

      await dialog.getByRole('button', { name: 'Đặt lại mặc định' }).click();
      assert.equal(await stepValue(dialog, 'Cỡ chữ tiếng Ả Rập'), '28');
      assert.equal(await stepValue(dialog, 'Cỡ chữ bản dịch'), '18');
      assert.equal(await dialog.getByRole('radio', { name: 'Tiếng Ả Rập trước' }).isChecked(), true);
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      assert.deepEqual((await stored(page, 'settings')).reader, { showArabic: true, textOrder: 'arabic' });
    },
    { smoke: true }
  );

  h.test('Settings dialog: font size, Arabic font, theme, reset', async (t) => {
    const { page } = await h.open(t, `/books/${BUKHARI}/hadiths/1`);
    let settings;
    if (h.desktop) {
      await page.getByRole('button', { name: 'Tùy chọn khác' }).click();
      await page.getByRole('menuitem', { name: 'Cài đặt', exact: true }).click();
      settings = page.locator('[role="presentation"]').filter({ has: page.getByText('Ngôn ngữ', { exact: true }) }).last();
    } else {
      // the phone header of content pages
      await page.getByRole('link', { name: 'Cài đặt', exact: true }).click();
      settings = page.locator('div[class*="ModalSecondary_modal"]').filter({ hasText: 'Ngôn ngữ' });
    }
    await settings.getByRole('combobox', { name: 'Ngôn ngữ' }).waitFor({ state: 'visible' });
    assert.equal(new URL(page.url()).pathname, `/books/${BUKHARI}/hadiths/1`, 'opening settings does not leave the page');
    assert.equal(await settings.getByRole('combobox', { name: 'Ngôn ngữ' }).inputValue(), 'vi');

    const before = await fontSize(arabicText(page));
    await settings.getByRole('button', { name: 'Tăng cỡ chữ tiếng Ả Rập' }).click();
    await until(async () => (await fontSize(arabicText(page))) > before, 'Arabic bigger at once');
    assert.equal((await stored(page, 'settings')).fontSize.arabic, 29);

    await settings.getByText('Chọn phông chữ tiếng Ả Rập').click();
    await settings.getByRole('radio', { name: 'PDMS Islamic Font' }).check();
    await until(
      async () => /PDMSIslam/.test(await arabicText(page).evaluate((el) => getComputedStyle(el).fontFamily)),
      'Arabic font applied'
    );
    // the translation's font too (its setter was once missing from the settings context)
    await settings.getByText('Chọn phông chữ bản dịch').click();
    await settings.getByRole('radio', { name: 'Times New Roman' }).check();
    await until(
      async () => /TimesNewRoman/.test(await translationText(page).first().evaluate((el) => getComputedStyle(el).fontFamily)),
      'translation font applied'
    );
    assert.equal((await stored(page, 'settings')).fontFamily.translation, 'TimesNewRoman');

    await settings.getByText('Chọn giao diện').click();
    await settings.getByRole('button', { name: 'Tối', exact: true }).click();
    await until(async () => (await page.evaluate(() => document.body.className)) === 'dark', 'dark theme');
    assert.equal(await settings.getByRole('button', { name: 'Tối', exact: true }).getAttribute('aria-pressed'), 'true');

    await page.reload();
    await h.waitForHydration(page);
    await until(async () => (await page.evaluate(() => document.body.className)) === 'dark', 'dark after a reload');
    await until(async () => /PDMSIslam/.test(await arabicText(page).evaluate((el) => getComputedStyle(el).fontFamily)), 'font after a reload');

    // reset everything
    if (h.desktop) {
      await page.getByRole('button', { name: 'Tùy chọn khác' }).click();
      await page.getByRole('menuitem', { name: 'Cài đặt', exact: true }).click();
      settings = page.locator('[role="presentation"]').filter({ has: page.getByText('Ngôn ngữ', { exact: true }) }).last();
    } else {
      await page.getByRole('link', { name: 'Cài đặt', exact: true }).click();
      settings = page.locator('div[class*="ModalSecondary_modal"]').filter({ hasText: 'Ngôn ngữ' });
    }
    await settings.getByRole('button', { name: 'Đặt lại', exact: true }).click();
    await until(async () => (await page.evaluate(() => document.body.className)) === 'light', 'light again');
    const reset = await stored(page, 'settings');
    assert.equal(reset.fontSize.arabic, 28);
    assert.equal(reset.fontFamily.arabic, 'Amiri');
    assert.equal(reset.fontFamily.translation, 'BeVietnamPro');
    if (h.desktop) {
      await page.keyboard.press('Escape');
    } else {
      await settings.getByRole('button', { name: 'Quay lại' }).click();
    }
    await until(async () => !(await settings.isVisible()), 'settings closed');
  });

  h.test(
    'the /settings page and the menu entry',
    async (t) => {
      const { page, response } = await h.open(t, '/settings');
      assert.equal(response.status(), 200);
      await waitForH1(page, 'Cài đặt');
      await page.getByRole('combobox', { name: 'Ngôn ngữ' }).waitFor();
      await page.getByRole('button', { name: 'Tăng cỡ chữ bản dịch' }).click();
      assert.equal((await stored(page, 'settings')).fontSize.translation, 19);
      if (h.phone) {
        // the menu's "Cài đặt" opens the dialog over the page it was opened on
        await h.goto(page, `/books/${BUKHARI}`);
        await page.getByRole('button', { name: 'Mở menu' }).click();
        await page.locator('.MuiDrawer-paper').getByRole('link', { name: 'Cài đặt', exact: true }).click();
        const dialog = page.locator('div[class*="ModalSecondary_modal"]').filter({ hasText: 'Ngôn ngữ' });
        // the menu closes: while open it hides the rest of the page from
        // assistive technology and keeps the keyboard focus to itself
        await page.locator('.MuiDrawer-paper').waitFor({ state: 'detached' });
        const language = dialog.getByRole('combobox', { name: 'Ngôn ngữ' });
        await language.waitFor({ state: 'visible' });
        await language.focus();
        assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Ngôn ngữ', 'focus reaches the settings');
        assert.equal(new URL(page.url()).pathname, `/books/${BUKHARI}`);
        await dialog.getByRole('button', { name: 'Quay lại' }).click();
        await until(async () => !(await dialog.isVisible()), 'settings dialog closed');
      }
    },
    { smoke: true }
  );

  h.test('the language: saved in a cookie, the pages and their interface follow it', async (t) => {
    const en = await api(`/books/bukhari/hadiths/1${loc('en')}`);
    const tr = await interfaceStrings('en');
    const { page, context } = await h.open(t, '/settings');
    const select = page.getByRole('combobox', { name: 'Ngôn ngữ' });
    // every language of the API, Arabic (the original) included; the list loads in the browser
    const total = (await api('/languages')).length;
    await until(async () => (await select.locator('option').count()) === total, `the ${total} languages listed`);
    await select.selectOption('en');
    await until(async () => (await context.cookies()).some((c) => c.name === 'hadith_lang' && c.value === 'en'), 'cookie saved');
    // the settings page itself, at once
    await waitForH1(page, tr('settingsTitle'));
    assert.equal(await page.evaluate(() => document.documentElement.lang), 'en');
    await h.goto(page, `/books/${BUKHARI}/hadiths/1`);
    // English content, and the English interface (a catalog exists for it)
    const squash = (value) => String(value || '').replace(/\s+/g, '');
    await until(
      async () => squash(await page.locator('section[class*="translationBlock"] div[lang="en"]').first().innerText()) === squash(en.translation.text),
      'the English translation is shown'
    );
    assert.equal(await page.evaluate(() => document.documentElement.lang), 'en');
    assert.ok((await page.title()).endsWith(` | ${tr('siteHeading')} | Hadith.vn`), `English title: ${await page.title()}`);

    await h.goto(page, '/settings');
    await page.getByRole('combobox', { name: tr('language') }).selectOption('vi');
    await until(async () => (await context.cookies()).some((c) => c.name === 'hadith_lang' && c.value === 'vi'), 'cookie back to vi');
    await h.goto(page, '/');
    await waitForH1(page, 'Hadith tiếng Việt');
  });

  h.test(
    'theme toggle: dark and back, kept after a reload',
    async (t) => {
      const { page } = await h.open(t, '/');
      const toDark = page.getByRole('button', { name: 'Chuyển sang giao diện tối' });
      await toDark.click();
      await until(async () => (await page.evaluate(() => document.body.className)) === 'dark', 'dark theme');
      assert.equal((await stored(page, 'settings')).theme, 'dark');
      await page.reload();
      await h.waitForHydration(page);
      await until(async () => (await page.evaluate(() => document.body.className)) === 'dark', 'dark after a reload');
      const toLight = page.getByRole('button', { name: 'Chuyển sang giao diện sáng' });
      await toLight.click();
      await until(async () => (await page.evaluate(() => document.body.className)) === 'light', 'light theme');
      assert.equal((await stored(page, 'settings')).theme, 'light');
    },
    { smoke: true }
  );

  h.test('dark theme: no text is (nearly) invisible', async (t) => {
    const bukhari3 = await api(`/books/bukhari/hadiths/3${loc()}`);
    const darkSettings = JSON.stringify({
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
    const { page } = await h.open(t, null, { allow: [/status of 404/] });
    await page.context().addInitScript((value) => localStorage.setItem('settings', value), darkSettings);
    const report = [];
    for (const path of [
      '/',
      '/books',
      `/books/${BUKHARI}`,
      `/books/${BUKHARI}/chapters/1`,
      `/books/${BUKHARI}/hadiths/3`,
      `/hadiths/${bukhari3.linkedTranslation.hadithId}`,
      '/books/sunan-abu-dawud/hadiths/2',
      '/categories',
      '/categories/the-creed',
      '/categories/the-creed/hadiths',
      '/search?q=c%E1%BA%A7u%20nguy%E1%BB%87n',
      '/bookmarks',
      '/sources',
      '/settings',
      '/no-such-page',
    ]) {
      await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
      await h.waitForHydration(page);
      await until(async () => (await page.evaluate(() => document.body.className)) === 'dark', `${path} in dark`);
      await sleep(300);
      const failures = await page.evaluate(lowContrast, 3);
      failures.forEach((f) => report.push(`${path}: ${f}`));
    }
    assert.deepEqual(report, [], 'text below 3:1 contrast in the dark theme');
  });
});
