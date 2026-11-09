// Reading settings (the navigation's gear, the phone header's): font sizes, hiding the
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
  // the web: "Cài đặt" at the foot of the navigation; phones: the header's button
  await page.getByRole('button', { name: /^Cài đặt( hiển thị)?$/ }).first().click();
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
    'reader settings: sizes, hide Arabic; the translation first, the Arabic under it; at once and after a reload',
    async (t) => {
      const { page } = await h.open(t, `/books/${BUKHARI}/hadiths/1`);
      // until the reader chooses, the Quran sites' sizes, on every screen
      const [arabicStart, translationStart] = [36, 18];
      const arabicBefore = await fontSize(arabicText(page));
      const translationBefore = await fontSize(translationText(page));
      assert.deepEqual([arabicBefore, translationBefore], [arabicStart, translationStart]);
      let dialog = await openReaderSettings(page);
      await until(async () => (await stepValue(dialog, 'Cỡ chữ tiếng Ả Rập')) === String(arabicStart), 'the Arabic size shown');
      assert.equal(await stepValue(dialog, 'Cỡ chữ bản dịch'), String(translationStart));

      await dialog.getByRole('button', { name: 'Tăng cỡ chữ tiếng Ả Rập' }).click();
      await dialog.getByRole('button', { name: 'Tăng cỡ chữ bản dịch' }).click();
      assert.equal(await stepValue(dialog, 'Cỡ chữ tiếng Ả Rập'), String(arabicStart + 2));
      assert.equal(await stepValue(dialog, 'Cỡ chữ bản dịch'), String(translationStart + 1));
      assert.equal(await fontSize(arabicText(page)), arabicStart + 2);
      assert.equal(await fontSize(translationText(page)), translationStart + 1);

      // the translation first, then the Arabic (no setting for the order)
      const order = await page.evaluate(() => {
        const arabic = document.querySelector('section[class*="arabicBlock"]').getBoundingClientRect();
        const translation = document.querySelector('section[class*="translationBlock"]').getBoundingClientRect();
        return translation.top < arabic.top;
      });
      assert.ok(order, 'translation above the Arabic');
      assert.equal(await dialog.getByRole('radio', { name: 'Bản dịch trước' }).count(), 0, 'no order to choose');

      // hide the Arabic: gone at once
      const show = dialog.getByRole('switch', { name: 'Hiện nguyên văn tiếng Ả Rập' });
      assert.equal(await show.isChecked(), true);
      await show.uncheck();
      await until(async () => !(await arabicText(page).isVisible()), 'Arabic hidden');
      await dialog.getByRole('button', { name: 'Đóng' }).click();
      await dialog.waitFor({ state: 'hidden' });

      // all of it after a reload, and on list pages
      await page.reload();
      await h.waitForHydration(page);
      await until(async () => !(await arabicText(page).isVisible()), 'Arabic still hidden after a reload');
      const saved = await stored(page, 'settings');
      assert.deepEqual(saved.fontSize, { arabic: arabicStart + 2, translation: translationStart + 1 });
      assert.equal(saved.reader.showArabic, false);
      await h.goto(page, `/books/${BUKHARI}/chapters/1`);
      const fold = page.locator('article[id^="hadith-"] details').first();
      await until(async () => (await fold.isVisible()) === false, 'card Arabic hidden');

      dialog = await openReaderSettings(page);
      assert.equal(await stepValue(dialog, 'Cỡ chữ tiếng Ả Rập'), String(arabicStart + 2));
      await dialog.getByRole('switch', { name: 'Hiện nguyên văn tiếng Ả Rập' }).check();
      await until(() => fold.isVisible(), 'card Arabic back, folded under the translation');
      const card = await page.locator('article[id^="hadith-"]').first().evaluate((article) => {
        const arabic = article.querySelector('details').getBoundingClientRect();
        const translation = article.querySelector('div[class*="translationCol"]').getBoundingClientRect();
        return translation.top < arabic.top;
      });
      assert.ok(card, 'card: translation above the Arabic');

      await dialog.getByRole('button', { name: 'Đặt lại mặc định' }).click();
      await until(async () => (await stepValue(dialog, 'Cỡ chữ tiếng Ả Rập')) === String(arabicStart), 'the default size again');
      assert.equal(await stepValue(dialog, 'Cỡ chữ bản dịch'), String(translationStart));
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      assert.equal((await stored(page, 'settings')).reader.showArabic, true);
    },
    { smoke: true }
  );

  h.test('Settings: font size, Arabic font, theme, reset', async (t) => {
    const { page } = await h.open(t, `/books/${BUKHARI}/hadiths/1`);
    // the web: the site's dialog from the ⋮ menu, over the page. Phones: the settings page, from the reading settings.
    const openSettings = async () => {
      if (h.desktop) {
        await page.getByRole('button', { name: 'Tùy chọn khác' }).click();
        await page.getByRole('menuitem', { name: 'Cài đặt', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: 'Cài đặt', exact: true });
        await dialog.waitFor();
        return dialog;
      }
      await page.getByRole('button', { name: 'Cài đặt hiển thị', exact: true }).click();
      await page.getByRole('dialog', { name: 'Cài đặt hiển thị' }).getByRole('link', { name: /Cài đặt/ }).click();
      await h.waitForPath(page, (url) => url.pathname === '/settings', 'to the settings page');
      return page.locator('main');
    };
    const before = await fontSize(arabicText(page));
    let settings = await openSettings();
    // the faces in view, each a radio button, the default one chosen
    await settings.getByRole('radio', { name: 'PDMS Islamic Font' }).waitFor({ state: 'visible' });
    assert.equal(await settings.getByRole('radio', { name: 'PDMS Islamic Font' }).isChecked(), true);
    if (h.desktop) assert.equal(new URL(page.url()).pathname, `/books/${BUKHARI}/hadiths/1`, 'opening settings does not leave the page');
    assert.equal(await settings.getByRole('combobox', { name: 'Ngôn ngữ' }).count(), 0, 'no language to choose');

    await settings.getByRole('button', { name: 'Tăng cỡ chữ tiếng Ả Rập' }).click();
    await until(async () => (await stored(page, 'settings')).fontSize.arabic === before + 2, 'Arabic size saved, a step up from the default');
    if (h.desktop) await until(async () => (await fontSize(arabicText(page))) > before, 'Arabic bigger at once');

    await settings.getByRole('radio', { name: 'Amiri (Naskh)' }).check();
    // the translation's font too (its setter was once missing from the settings context)
    await settings.getByRole('radio', { name: 'Times New Roman' }).check();
    await until(async () => (await stored(page, 'settings')).fontFamily.translation === 'TimesNewRoman', 'translation font saved');
    assert.equal((await stored(page, 'settings')).fontFamily.arabic, 'Amiri');

    await settings.getByRole('radio', { name: 'Tối', exact: true }).check();
    await until(async () => (await page.evaluate(() => document.body.className)) === 'dark', 'dark theme');
    assert.equal(await settings.getByRole('radio', { name: 'Tối', exact: true }).isChecked(), true);

    await h.goto(page, `/books/${BUKHARI}/hadiths/1`);
    await until(async () => (await page.evaluate(() => document.body.className)) === 'dark', 'dark after a reload');
    await until(async () => /amiri/i.test(await arabicText(page).evaluate((el) => getComputedStyle(el).fontFamily)), 'Arabic font applied');
    await until(async () => /TimesNewRoman/.test(await translationText(page).first().evaluate((el) => getComputedStyle(el).fontFamily)), 'translation font applied');
    assert.equal(await fontSize(arabicText(page)), before + 2, 'the saved size');

    // reset everything: the screen's sizes and the default faces
    settings = await openSettings();
    await settings.getByRole('button', { name: 'Đặt lại', exact: true }).click();
    await until(async () => (await page.evaluate(() => document.body.className)) === 'light', 'light again');
    const reset = await stored(page, 'settings');
    assert.equal(reset.fontSize.arabic, null);
    assert.equal(reset.fontFamily.arabic, 'PDMSIslam');
    assert.equal(reset.fontFamily.translation, 'Roboto');
    if (h.desktop) {
      await page.keyboard.press('Escape');
      await until(async () => !(await settings.isVisible()), 'settings closed');
    }
  });

  h.test(
    'an old reader\'s settings follow the new defaults; what they chose themselves stays',
    async (t) => {
      const old = JSON.stringify({ theme: 'light', version: 4, fontSize: { arabic: 28, translation: 22 }, fontFamily: { arabic: 'Amiri', translation: 'TimesNewRoman' }, reader: { showArabic: true, textOrder: 'arabic' } });
      const { page } = await h.open(t, `/books/${BUKHARI}/hadiths/1`, { initScript: `if (!localStorage.getItem('settings')) localStorage.setItem('settings', ${JSON.stringify(old)})` });
      await until(async () => (await stored(page, 'settings')).version === 5, 'migrated');
      const saved = await stored(page, 'settings');
      assert.deepEqual(saved.fontSize, { arabic: null, translation: 22 }, 'the old default follows the screen; the 22 was chosen');
      assert.deepEqual(saved.fontFamily, { arabic: 'PDMSIslam', translation: 'TimesNewRoman' });
    },
    { only: 'desktop' }
  );

  h.test(
    'the /settings page and the way there',
    async (t) => {
      const { page, response } = await h.open(t, '/settings');
      assert.equal(response.status(), 200);
      await waitForH1(page, 'Cài đặt');
      assert.equal(await page.getByRole('combobox', { name: 'Ngôn ngữ' }).count(), 0, 'no language section');
      const start = 18;
      await page.getByRole('button', { name: 'Tăng cỡ chữ bản dịch' }).click();
      await until(async () => (await stored(page, 'settings')).fontSize.translation === start + 1, 'one up from the default size');
    },
    { smoke: true }
  );

  h.test(
    'theme toggle: dark and back, kept after a reload',
    async (t) => {
      const { page } = await h.open(t, '/');
      // the web's header has a toggle; on phones the theme is in the reading settings
      const choose = async (toggle, radio) => {
        if (h.desktop) {
          await page.getByRole('button', { name: toggle }).click();
          return;
        }
        await page.getByRole('button', { name: 'Cài đặt hiển thị', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: 'Cài đặt hiển thị' });
        await dialog.locator('label', { hasText: radio }).click();
        await page.keyboard.press('Escape');
        await dialog.waitFor({ state: 'hidden' });
      };
      await choose('Chuyển sang giao diện tối', 'Tối');
      await until(async () => (await page.evaluate(() => document.body.className)) === 'dark', 'dark theme');
      assert.equal((await stored(page, 'settings')).theme, 'dark');
      await page.reload();
      await h.waitForHydration(page);
      await until(async () => (await page.evaluate(() => document.body.className)) === 'dark', 'dark after a reload');
      await choose('Chuyển sang giao diện sáng', 'Sáng');
      await until(async () => (await page.evaluate(() => document.body.className)) === 'light', 'light theme');
      assert.equal((await stored(page, 'settings')).theme, 'light');
    },
    { smoke: true }
  );

  h.test('dark theme: no text is (nearly) invisible', async (t) => {
    const bukhari3 = await api(`/books/bukhari/hadiths/3${loc()}`);
    const darkSettings = JSON.stringify({
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
