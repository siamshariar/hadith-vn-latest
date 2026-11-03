// Several translations at once: the translations panel (add languages, order
// them, make one the main language), the hadith_tr cookie and the ?tr= share
// link, the extra languages rendered on the server in lists and on the hadith
// page (the hadith's own translation, the topic collection's translation of
// the same wording labelled as such, or one line saying there is none),
// phones folding them in lists, the copy menu, and translators named only
// when the source names one. Expected texts come from the API's ?translations=.
'use strict';

const {
  BASE,
  api,
  assert,
  cleanText,
  interfaceStrings,
  loc,
  meta,
  norm,
  readClipboard,
  spec,
  translatorOf,
  until,
  viNumber,
  waitForText,
  writeClipboard,
} = require('./harness');

const BUKHARI = 'sahih-al-bukhari';
const squash = (value) => String(value || '').replace(/\s+/g, '');
const withTr = (codes) => `?translations=${codes.join(',')}`;

async function cookie(context, name) {
  const found = (await context.cookies()).find((c) => c.name === name);
  return found ? decodeURIComponent(found.value) : undefined;
}

// The translations chip of the hadith page header ("Bản dịch: Tiếng Việt +2").
const headerChip = (page) => page.locator('article > header').getByRole('button', { name: /^Bản dịch:/ });
// [code, kind] of the extra languages shown in `scope`, in order: own, linked or missing.
const extrasIn = (scope) =>
  scope.locator('[data-language]').evaluateAll((items) =>
    items.map((el) => [el.dataset.language, el.tagName === 'P' ? 'missing' : /linked/.test(el.className) ? 'linked' : 'own'])
  );

// A language as the Vietnamese interface names it in labels: its own
// Vietnamese name for vi/en, else its native name (lib/i18n, LocaleContext).
async function nameOf(code) {
  if (code === 'vi') return 'tiếng Việt';
  if (code === 'en') return 'tiếng Anh';
  const languages = await api('/languages');
  return languages.find((language) => language.code === code).nativeName;
}

// What the API has for one requested language of a hadith: own, linked or missing.
function expectedKind(hadith, code) {
  const entry = (hadith.translations || []).find((item) => item.languageCode === code);
  if (!entry) return 'missing';
  return entry.linked ? 'linked' : 'own';
}

// Checks every extra language of the hadith `scope` shows against the API.
async function checkExtras(scope, hadith, codes, where) {
  const shown = await extrasIn(scope);
  assert.deepEqual(shown, codes.map((code) => [code, expectedKind(hadith, code)]), `${where}: languages and kinds in order`);
  for (const code of codes) {
    const entry = (hadith.translations || []).find((item) => item.languageCode === code);
    if (!entry) {
      const line = scope.locator(`p[data-language="${code}"]`);
      assert.equal(norm(await line.textContent()), `Chưa có bản dịch ${await nameOf(code)} cho hadith này`, `${where}: ${code} missing line`);
      continue;
    }
    const text = scope.locator(`div[data-language="${code}"] div[lang="${code}"]`);
    assert.equal(await text.getAttribute('dir'), entry.direction, `${where}: ${code} direction`);
    assert.equal(squash(await text.textContent()), squash(cleanText(entry.text)), `${where}: ${code} text is the API's`);
  }
}

// The copy menu of `scope`: the clipboard after picking `item`.
async function copyFrom(page, scope, item) {
  const sentinel = `e2e-${Date.now()}-${Math.random()}`;
  await writeClipboard(page, sentinel);
  await scope.getByRole('button', { name: 'Copy trích dẫn, văn bản hoặc liên kết' }).click();
  await page.getByRole('menuitem', { name: item, exact: true }).click();
  return until(async () => {
    const value = await readClipboard(page);
    return value !== sentinel && value;
  }, `"${item}" reaches the clipboard`);
}

module.exports = spec(module, 'translations', (h) => {
  h.test(
    'panel: two more languages, reordered, one made the main one; saved in cookies, kept after a reload',
    async (t) => {
      const { page, context } = await h.open(t, `/books/${BUKHARI}/hadiths/1`);
      await waitForText(headerChip(page), /^Bản dịch: Tiếng Việt$/);
      await headerChip(page).click();
      const dialog = page.getByRole('dialog', { name: 'Bản dịch' });
      const row = (code) => dialog.locator(`li[data-language="${code}"]`);
      const check = (code) => row(code).locator('input[type="checkbox"]');
      await row('bn').waitFor();

      // selected first, then the site's language (here already selected), English, then A–Z
      const listed = await dialog.locator('ul li').evaluateAll((items) => items.map((li) => li.dataset.language));
      assert.equal(listed[0], 'en', 'English first among the others');
      assert.ok(!listed.includes('vi') && !listed.includes('ar'), 'neither the main language nor Arabic is offered');
      // the edition line: the translator when the source names one, and the count for this collection
      const editions = await api('/editions');
      const count = (code) => viNumber(editions.find((e) => e.code === code).totalHadith);
      assert.equal(norm(await row('bn').locator('span[class*="edition"]').textContent()), `${count('ben-bukhari')} hadith`);
      assert.equal(norm(await row('en').locator('span[class*="edition"]').textContent()), `Muhsin Khan · ${count('eng-bukhari')} hadith`);

      await check('bn').check();
      await check('ur').check();
      await waitForText(dialog.locator('p[class*="limit"]'), /^Đã chọn đủ 3 ngôn ngữ/);
      assert.equal(await check('en').isDisabled(), true, 'nothing more can be added');
      await dialog.getByRole('button', { name: 'Đưa اردو lên trên' }).click();
      assert.deepEqual(await dialog.locator('ol li').evaluateAll((items) => items.map((li) => li.dataset.language)), ['vi', 'ur', 'bn']);
      await dialog.getByRole('button', { name: 'Xong' }).click();

      await until(async () => (await cookie(context, 'hadith_tr')) === 'ur,bn', 'hadith_tr saved');
      await until(async () => (await headerChip(page).getAttribute('data-translations')) === 'vi,ur,bn', 'the page shows the new choice');
      const hadith = await api(`/books/bukhari/hadiths/1${loc()}${withTr(['ur', 'bn'])}`);
      await checkExtras(page.locator('section[class*="translationBlock"]'), hadith, ['ur', 'bn'], 'after saving');

      // rendered on the server from the cookie
      await page.reload();
      await h.waitForHydration(page);
      assert.equal(await headerChip(page).getAttribute('data-translations'), 'vi,ur,bn', 'kept after a reload');
      await checkExtras(page.locator('section[class*="translationBlock"]'), hadith, ['ur', 'bn'], 'after a reload');

      // Urdu becomes the main language: hadith_lang, and Vietnamese an extra one
      await headerChip(page).click();
      await row('ur').waitFor();
      await dialog.getByRole('button', { name: 'Đặt اردو làm ngôn ngữ chính' }).click();
      await dialog.getByRole('button', { name: 'Xong' }).click();
      await until(async () => (await cookie(context, 'hadith_lang')) === 'ur', 'hadith_lang saved');
      assert.equal(await cookie(context, 'hadith_tr'), 'vi,bn');
      await until(async () => (await headerChip(page).getAttribute('data-translations')) === 'ur,vi,bn', 'Urdu first');
      const ur = await api(`/books/bukhari/hadiths/1${loc('ur')}${withTr(['vi', 'bn'])}`);
      const primary = page.locator('section[class*="translationBlock"] div[lang="ur"]').first();
      assert.equal(await primary.getAttribute('dir'), 'rtl');
      assert.equal(squash(await primary.textContent()), squash(cleanText(ur.translation.text)), 'the Urdu translation leads');
      await checkExtras(page.locator('section[class*="translationBlock"]'), ur, ['vi', 'bn'], 'Urdu main');
    },
    { smoke: true }
  );

  h.test('?tr= shows the extra languages for that view only; the shared link carries them', async (t) => {
    const { page, context } = await h.open(t, `/books/${BUKHARI}/hadiths/1?tr=bn,ur`);
    assert.equal(await headerChip(page).getAttribute('data-translations'), 'vi,bn,ur');
    const hadith = await api(`/books/bukhari/hadiths/1${loc()}${withTr(['bn', 'ur'])}`);
    await checkExtras(page.locator('section[class*="translationBlock"]'), hadith, ['bn', 'ur'], '?tr=bn,ur');
    assert.equal(await cookie(context, 'hadith_tr'), undefined, 'nothing saved');
    // links to the next hadith keep it; a page opened without it has none
    assert.equal(await page.locator('a[rel="next"]').getAttribute('href'), `/books/${BUKHARI}/hadiths/2?tr=bn,ur`);
    if (h.chromium) {
      const { canonical } = await meta(page);
      assert.equal(await copyFrom(page, page.locator('article > header'), 'Copy liên kết'), `${canonical}?tr=bn,ur`, 'the shared link keeps ?tr=');
    }
    await h.goto(page, `/books/${BUKHARI}/hadiths/2`);
    assert.equal(await headerChip(page).getAttribute('data-translations'), 'vi');
    assert.equal(await page.locator('section[class*="translationBlock"] [data-language]').count(), 0);
  });

  h.test('rendered on the server: lists and hadith pages, own, linked and missing, against the API', async (t) => {
    // without JavaScript: what the server sent
    const { page, context } = await h.open(t, null, { context: { javaScriptEnabled: false } });
    await context.addCookies([{ name: 'hadith_tr', value: encodeURIComponent('bn,ur'), url: BASE }]);
    const open = (path) => page.goto(BASE + path, { waitUntil: 'domcontentloaded' });

    for (const [path, apiPath] of [
      [`/books/${BUKHARI}/hadiths/1`, '/books/bukhari/hadiths/1'],
      ['/books/sahih-muslim/hadiths/8a', '/books/muslim/hadiths/8a'],
      ['/books/40-hadith-nawawi/hadiths/1', '/books/nawawi/hadiths/1'],
      ['/books/hadeethenc/hadiths/4560', '/books/hadeethenc/hadiths/4560'],
    ]) {
      const hadith = await api(`${apiPath}${loc()}${withTr(['bn', 'ur'])}`);
      await open(path);
      await checkExtras(page.locator('section[class*="translationBlock"]'), hadith, ['bn', 'ur'], path);
    }

    for (const [path, apiPath] of [
      [`/books/${BUKHARI}/chapters/1`, `/books/bukhari/chapters/1${loc()}?perPage=20&translations=bn,ur`],
      ['/categories/the-creed/hadiths', `/categories/the-creed/hadiths${loc()}?perPage=20&translated=1&translations=bn,ur`],
      ['/search?q=c%E1%BA%A7u%20nguy%E1%BB%87n', `/search${loc()}?q=c%E1%BA%A7u%20nguy%E1%BB%87n&perPage=20&translations=bn,ur`],
    ]) {
      const list = await api(apiPath);
      await open(path);
      assert.ok(list.hadiths.length > 0, `${path}: hadiths`);
      for (const hadith of list.hadiths) {
        await checkExtras(page.locator(`#hadith-${hadith.id} div[class*="translationCol"]`), hadith, ['bn', 'ur'], `${path} #${hadith.id}`);
      }
    }

    // English asked for while the page shows the English fallback: shown once
    await context.addCookies([{ name: 'hadith_tr', value: encodeURIComponent('en,bn'), url: BASE }]);
    await open(`/books/${BUKHARI}/hadiths/1`);
    assert.equal(await page.locator('section[class*="translationBlock"] div[lang="en"]').count(), 1, 'the English text once');
    assert.deepEqual(await extrasIn(page.locator('section[class*="translationBlock"]')), [['bn', 'own']]);
  });

  h.test(
    'a language with no text gets one line; the topic collection\'s linked translation is labelled as such',
    async (t) => {
      // ?lang=en: English content, so an English interface (it follows the content language)
      const en = await interfaceStrings('en');
      const vietnamese = { language: en.language('vi') };
      // Bukhari 1 has no Vietnamese text of any kind
      const { page } = await h.open(t, `/books/${BUKHARI}/hadiths/1?lang=en&tr=vi`);
      const block = page.locator('section[class*="translationBlock"]');
      await waitForText(block.locator('p[data-language="vi"]'), en('extraMissing', vietnamese));
      assert.equal(await block.locator('div[data-language="vi"]').count(), 0);

      // Bukhari 3: only the topic collection's translation of the same wording
      const three = await api(`/books/bukhari/hadiths/3${loc('en')}${withTr(['vi'])}`);
      const entry = three.translations.find((item) => item.languageCode === 'vi');
      assert.ok(entry && entry.linked, 'the API links Bukhari 3 to the topic collection');
      await h.goto(page, `/books/${BUKHARI}/hadiths/3?lang=en&tr=vi`);
      const linked = page.locator('section[class*="translationBlock"] div[data-language="vi"]');
      await waitForText(linked.locator('span[class*="linkedBadge"]'), en('topicTranslation', vietnamese));
      assert.equal(await linked.getByRole('link', { name: en('linkedTranslationLink') }).getAttribute('href'), `/hadiths/${entry.linked.hadithId}`);
      assert.equal(norm(await linked.locator('p[class*="linkedNote"]').textContent()), norm(en('topicTranslationNote')));
      // the source names no translator; no edition, no link out; its source line closes it
      assert.equal(await linked.locator('[class*="creditName"]').count(), 0);
      assert.equal(await linked.locator('a[href^="http"]').count(), 0);
      assert.deepEqual((await linked.locator('p[data-source-line]').allTextContents()).map(norm), [en('sourceLine', { source: 'HadeethEnc.com' })]);
      // the reference block links to the topic collection's hadith
      const rows = await page.locator(`section[aria-label="${en('refLabel')}"] dl > div`).evaluateAll((items) =>
        items.map((row) => [row.querySelector('dt').textContent.trim(), row.querySelector('dd').textContent.replace(/\s+/g, ' ').trim()])
      );
      assert.deepEqual(rows[rows.length - 1], [en('topicTranslation', vietnamese), `${en('linkedTranslationLink')} →`]);
    },
    { smoke: true }
  );

  h.test(
    'phones: extra languages fold into 44px rows in lists; the hadith page shows them open',
    async (t) => {
      const { page } = await h.open(t, `/books/${BUKHARI}/chapters/1?tr=bn,ur`);
      const extra = page.locator('article[id^="hadith-"]').first().locator('div[data-language="bn"]');
      const toggle = extra.getByRole('button', { name: 'Hiện bản dịch বাংলা' });
      const body = extra.locator('div[class*="extraBody"]');
      assert.equal(await body.isVisible(), false, 'folded');
      const row = await extra.locator('div[class*="labelRow"]').boundingBox();
      assert.ok(row.height >= 44, `row is ${row.height}px tall`);
      await toggle.click();
      await until(() => body.isVisible(), 'opens on a tap');
      assert.equal(await extra.getByRole('button', { name: 'Ẩn bản dịch বাংলা' }).getAttribute('aria-expanded'), 'true');
      // the primary translation is never folded
      assert.equal(await page.locator('article[id^="hadith-"]').first().locator('div[class*="translationCol"] > div > div').first().isVisible(), true);

      await h.goto(page, `/books/${BUKHARI}/hadiths/1?tr=bn,ur`);
      const blocks = page.locator('section[class*="translationBlock"] div[data-language]');
      assert.equal(await blocks.count(), 2);
      assert.equal(await page.locator('section[class*="translationBlock"] button[aria-expanded]').count(), 0, 'nothing to open');
      for (const code of ['bn', 'ur']) {
        assert.equal(await page.locator(`section[class*="translationBlock"] div[data-language="${code}"] div[lang="${code}"]`).isVisible(), true);
      }
    },
    { only: 'phone', smoke: true }
  );

  h.test('wide screens: lists show the extra languages open', async (t) => {
    const { page } = await h.open(t, `/books/${BUKHARI}/chapters/1?tr=bn,ur`);
    const card = page.locator('article[id^="hadith-"]').first();
    for (const code of ['bn', 'ur']) {
      assert.equal(await card.locator(`div[data-language="${code}"] div[lang="${code}"]`).isVisible(), true, `${code} open`);
      assert.equal(await card.locator(`div[data-language="${code}"] button`).isVisible(), false, 'no toggle');
    }
  }, { only: 'desktop' });

  if (h.chromium) {
    h.test('copy: the Arabic, the translations shown, everything; each with the citation and the permalink', async (t) => {
      const hadith = await api(`/books/bukhari/hadiths/1${loc()}${withTr(['bn', 'ur'])}`);
      const { page } = await h.open(t, `/books/${BUKHARI}/hadiths/1?tr=bn,ur`);
      const { canonical } = await meta(page);
      const header = page.locator('article > header');
      const reference = 'Sahih al-Bukhari 1';
      const own = hadith.translation; // the English fallback
      const extra = (code) => hadith.translations.find((item) => item.languageCode === code);
      // the label, then the translator when the source names one
      const label = (text, entry) => [text, translatorOf(entry.author, entry.edition)].filter(Boolean).join(' · ');
      const arabic = `[Nguyên văn tiếng Ả Rập]\n${cleanText(hadith.arabic)}`;
      const translations = [
        `[${label('Bản dịch tiếng Anh', own)}]\n${cleanText(own.text)}`,
        `[${label(`Bản dịch ${await nameOf('bn')}`, extra('bn'))}]\n${cleanText(extra('bn').text)}`,
        `[${label(`Bản dịch ${await nameOf('ur')}`, extra('ur'))}]\n${cleanText(extra('ur').text)}`,
      ];
      assert.equal(translations[0].split('\n')[0], '[Bản dịch tiếng Anh · Muhsin Khan]');

      assert.equal(await copyFrom(page, header, 'Copy tiếng Ả Rập'), [reference, arabic, canonical].join('\n\n'));
      assert.equal(await copyFrom(page, header, 'Copy bản dịch'), [reference, ...translations, canonical].join('\n\n'));
      assert.equal(await copyFrom(page, header, 'Copy tất cả'), [reference, arabic, ...translations, canonical].join('\n\n'));
      const citation = await copyFrom(page, header, 'Copy trích dẫn');
      assert.equal(
        citation,
        [
          reference,
          `Vị trí trong sách: Chương ${hadith.inBookReference.chapterNo}, Hadith ${hadith.inBookReference.position}`,
          label('Bản dịch tiếng Anh', own),
          label(`Bản dịch ${await nameOf('bn')}`, extra('bn')),
          label(`Bản dịch ${await nameOf('ur')}`, extra('ur')),
          canonical,
        ].join('\n')
      );
      // a card copies the same as the page
      await h.goto(page, `/books/${BUKHARI}/chapters/1?tr=bn,ur`);
      assert.equal(await copyFrom(page, page.locator(`#hadith-${hadith.id}`), 'Copy trích dẫn'), citation);
    });
  }

  h.test(
    'translators: named when the source names one, never the compiler (Nawawi) or the publisher',
    async (t) => {
      const referenceRows = (page) =>
        page.locator('section[aria-label="Tham chiếu"] dl > div').evaluateAll((items) =>
          items.map((row) => [row.querySelector('dt').textContent.trim(), row.querySelector('dd').textContent.replace(/\s+/g, ' ').trim()])
        );
      // 40 Hadith Nawawi: the source gives the compiler's name, which is not shown
      const nawawi = await api(`/hadiths/35983${loc()}${withTr(['bn'])}`);
      assert.equal(nawawi.translation.author, 'Imam Nawawi', 'the source gives the compiler');
      const { page } = await h.open(t, '/hadiths/35983?tr=bn');
      assert.ok(!/Imam Nawawi/.test(await page.locator('main').innerText()), 'the compiler is not named as a translator');
      assert.equal(await page.locator('section[class*="translationBlock"] [class*="creditName"]').count(), 0, 'no translator to name');
      // Sahih al-Bukhari: the English edition names Muhsin Khan, the Bengali one nobody
      const bukhari = await api(`/books/bukhari/hadiths/1${loc()}${withTr(['bn'])}`);
      assert.equal(bukhari.translation.author, 'Muhsin Khan');
      assert.equal(bukhari.translations[0].author, null);
      await h.goto(page, `/books/${BUKHARI}/hadiths/1?tr=bn`);
      const block = page.locator('section[class*="translationBlock"]');
      assert.equal(norm(await block.locator('div[class*="labelRow"]').first().textContent()), 'Bản dịch tiếng Anh · Muhsin Khan');
      assert.equal(norm(await block.locator('div[data-language="bn"] div[class*="labelRow"]').textContent()), await nameOf('bn'));
      assert.deepEqual((await referenceRows(page)).slice(2), [['Bản dịch tiếng Anh', 'Muhsin Khan']], 'one translator row');
      // the collection pages
      await h.goto(page, '/books/40-hadith-nawawi');
      assert.ok(!/Imam Nawawi/.test(await page.locator('main').innerText()));
      await h.goto(page, `/books/${BUKHARI}`);
      await page.locator('header details summary').click();
      const english = page.locator('header details li').filter({ hasText: 'Muhsin Khan' });
      assert.equal(await english.count(), 1, 'the English translation names its translator');
      // the data & method page: translators by language, as the API names them
      const editions = await api('/editions');
      const named = [...new Set(editions.map((e) => translatorOf(e.author, e)).filter(Boolean))].sort();
      assert.deepEqual(named, ['Abdul Hamid Siddiqui', 'Abdullah Nirsha And Editors Of Daura.com', 'Muhsin Khan']);
      await h.goto(page, '/sources');
      const table = page.locator('section[aria-labelledby="sources-translators"]');
      assert.deepEqual((await table.locator('thead th').allTextContents()).map(norm), ['Ngôn ngữ', 'Bộ sưu tập', 'Người dịch', 'Số hadith']);
      assert.equal(await table.locator('tbody tr').count(), editions.length, 'one row per translation');
      const cells = await table.locator('tbody tr').evaluateAll((rows) =>
        rows.map((row) => [...row.querySelectorAll('td')][1].textContent.trim())
      );
      assert.deepEqual([...new Set(cells.filter(Boolean))].sort(), named);
      assert.ok(!/Imam Nawawi|Shah Waliullah/.test(await page.locator('main').innerText()));
    },
    { smoke: true }
  );
});
