// Several translations at once, on the international site only (BASE_AC; a country's site reads
// in its own language alone and has no translations chip): the translations panel (add up to
// two languages to the site's English, order them; English stays first), the hadith_tr cookie
// and the ?tr= share link, the extra languages added in the browser to lists and to the hadith
// page (the hadith's own translation, the topic collection's translation of the same wording
// labelled as such, or one line saying there is none), phones folding them in lists, and the
// copy menu. On the vn site: no chip, and translators named only when the source names one.
// Expected texts come from the API's ?translations= and the English catalog.
'use strict';

const {
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
  waitForText,
  writeClipboard,
} = require('./harness');

const BASE_AC = (process.env.BASE_AC || '').replace(/\/+$/, '');
const BUKHARI = 'sahih-al-bukhari';
const squash = (value) => String(value || '').replace(/\s+/g, '');
const withTr = (codes) => `?translations=${codes.join(',')}`;
const strings = () => interfaceStrings('en', { site: 'Hadith.ac', language: 'en' });

async function cookie(context, name) {
  const found = (await context.cookies(BASE_AC)).find((c) => c.name === name);
  return found ? decodeURIComponent(found.value) : undefined;
}

// A page of the ac instance, in a context of its own (h.open opens BASE's).
async function openAc(h, t, pathname, options = {}) {
  const opened = await h.open(t, null, { ...options, context: { locale: 'en-US', ...(options.context || {}) } });
  if (h.chromium) await opened.context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE_AC });
  if (options.cookies) await opened.context.addCookies(options.cookies.map((c) => ({ ...c, url: BASE_AC })));
  await opened.page.goto(BASE_AC + pathname, { waitUntil: 'domcontentloaded' });
  await h.waitForHydration(opened.page);
  return opened;
}
async function gotoAc(h, page, pathname) {
  await page.goto(BASE_AC + pathname, { waitUntil: 'domcontentloaded' });
  await h.waitForHydration(page);
}

// The translations chip of the hadith page header ("Translations: English +2").
const headerChip = (page) => page.locator('article > header button[data-translations]');
// [code, kind] of the extra languages shown in `scope`, in order: own, linked or missing.
const extrasIn = (scope) =>
  scope.locator('[data-language]').evaluateAll((items) =>
    items.map((el) => [el.dataset.language, el.tagName === 'P' ? 'missing' : /linked/.test(el.className) ? 'linked' : 'own'])
  );

// What the API has for one requested language of a hadith: own, linked or missing.
function expectedKind(hadith, code) {
  const entry = (hadith.translations || []).find((item) => item.languageCode === code);
  if (!entry) return 'missing';
  return entry.linked ? 'linked' : 'own';
}

// Checks every extra language of the hadith `scope` shows against the API, once the browser
// has added them.
async function checkExtras(scope, hadith, codes, where) {
  const en = await strings();
  const wanted = codes.map((code) => [code, expectedKind(hadith, code)]);
  await until(async () => JSON.stringify(await extrasIn(scope)) === JSON.stringify(wanted), `${where}: languages and kinds in order`);
  for (const code of codes) {
    const entry = (hadith.translations || []).find((item) => item.languageCode === code);
    if (!entry) {
      const line = scope.locator(`p[data-language="${code}"]`);
      assert.equal(norm(await line.textContent()), en('extraMissing', { language: en.language(code) }), `${where}: ${code} missing line`);
      continue;
    }
    const text = scope.locator(`div[data-language="${code}"] div[lang="${code}"]`);
    assert.equal(await text.getAttribute('dir'), entry.direction, `${where}: ${code} direction`);
    assert.equal(squash(await text.textContent()), squash(cleanText(entry.text)), `${where}: ${code} text is the API's`);
  }
}

// The copy menu of `scope`: the clipboard after picking `item`.
async function copyFrom(page, scope, item, optionsName) {
  const sentinel = `e2e-${Date.now()}-${Math.random()}`;
  await writeClipboard(page, sentinel);
  await scope.getByRole('button', { name: optionsName }).click();
  await page.getByRole('menuitem', { name: item, exact: true }).click();
  return until(async () => {
    const value = await readClipboard(page);
    return value !== sentinel && value;
  }, `"${item}" reaches the clipboard`);
}

module.exports = spec(module, 'translations', (h) => {
  h.test('vn: no translations chip; the page reads in Vietnamese alone', async (t) => {
    const { page } = await h.open(t, `/books/${BUKHARI}/chapters/1`);
    assert.equal(await page.locator('button[data-translations]').count(), 0, 'chapter');
    await h.goto(page, `/books/${BUKHARI}/hadiths/1?tr=bn,ur`);
    assert.equal(await page.locator('button[data-translations]').count(), 0, 'hadith page');
    assert.equal(await page.locator('section[class*="translationBlock"] [data-language]').count(), 0, 'a ?tr= adds nothing');
  });

  if (!BASE_AC) {
    h.test('ac: translations', (t) => t.skip('BASE_AC is not set'), { only: 'desktop' });
    return;
  }

  h.test(
    'ac panel: two more languages, reordered, English kept first; saved in a cookie, kept after a reload',
    async (t) => {
      const en = await strings();
      const name = (code) => {
        const value = en.language(code);
        return value.charAt(0).toLocaleUpperCase() + value.slice(1);
      };
      const { page, context } = await openAc(h, t, `/books/${BUKHARI}/hadiths/1`);
      assert.equal(await headerChip(page).getAttribute('data-translations'), 'en');
      await headerChip(page).click();
      const dialog = page.getByRole('dialog', { name: en('translationsTitle') });
      const row = (code) => dialog.locator(`li[data-language="${code}"]`);
      const check = (code) => row(code).locator('input[type="checkbox"]');
      await row('bn').waitFor();

      const listed = await dialog.locator('ul li').evaluateAll((items) => items.map((li) => li.dataset.language));
      assert.ok(!listed.includes('en') && !listed.includes('ar'), 'neither the main language nor Arabic is offered');
      assert.equal(await check('en').isDisabled(), true, 'English, the site language, stays');
      // the edition line: the translator when the source names one, and the count for this collection
      const editions = await api('/editions');
      const count = (code) => en.number(editions.find((e) => e.code === code).totalHadith);
      assert.equal(norm(await row('bn').locator('span[class*="edition"]').textContent()), en('editionCount', { count: count('ben-bukhari') }));
      assert.equal(norm(await row('en').locator('span[class*="edition"]').textContent()), `Muhsin Khan · ${en('editionCount', { count: count('eng-bukhari') })}`);

      await check('bn').check();
      await check('ur').check();
      await waitForText(dialog.locator('p[class*="limit"]'), /^3 languages chosen/);
      assert.equal(await check('fr').isDisabled(), true, 'nothing more can be added');
      await dialog.getByRole('button', { name: en('moveUp', { language: name('ur') }) }).click();
      assert.deepEqual(await dialog.locator('ol li').evaluateAll((items) => items.map((li) => li.dataset.language)), ['en', 'ur', 'bn']);
      await dialog.getByRole('button', { name: en('translationsDone') }).click();

      await until(async () => (await cookie(context, 'hadith_tr')) === 'ur,bn', 'hadith_tr saved');
      await until(async () => (await headerChip(page).getAttribute('data-translations')) === 'en,ur,bn', 'the page shows the new choice');
      const hadith = await api(`/books/bukhari/hadiths/1${loc('en')}${withTr(['ur', 'bn'])}`);
      await checkExtras(page.locator('section[class*="translationBlock"]'), hadith, ['ur', 'bn'], 'after saving');

      await page.reload();
      await h.waitForHydration(page);
      await until(async () => (await headerChip(page).getAttribute('data-translations')) === 'en,ur,bn', 'kept after a reload');
      await checkExtras(page.locator('section[class*="translationBlock"]'), hadith, ['ur', 'bn'], 'after a reload');
    },
    { smoke: true }
  );

  h.test('ac ?tr= shows the extra languages for that visit, not saved; the shared link carries them', async (t) => {
    const en = await strings();
    const { page, context } = await openAc(h, t, `/books/${BUKHARI}/hadiths/1?tr=bn,ur`);
    await until(async () => (await headerChip(page).getAttribute('data-translations')) === 'en,bn,ur', 'the link\'s languages');
    const hadith = await api(`/books/bukhari/hadiths/1${loc('en')}${withTr(['bn', 'ur'])}`);
    await checkExtras(page.locator('section[class*="translationBlock"]'), hadith, ['bn', 'ur'], '?tr=bn,ur');
    assert.equal(await cookie(context, 'hadith_tr'), undefined, 'nothing saved');
    if (h.chromium) {
      const { canonical } = await meta(page);
      assert.equal(
        await copyFrom(page, page.locator('article > header'), en('copyLink'), en('hadithOptions')),
        `${canonical}?tr=bn,ur`,
        'the shared link keeps ?tr='
      );
    }
    // another page opened afresh shows none: the link's choice was for that visit
    await gotoAc(h, page, `/books/${BUKHARI}/hadiths/2`);
    assert.equal(await headerChip(page).getAttribute('data-translations'), 'en');
    assert.equal(await page.locator('section[class*="translationBlock"] [data-language]').count(), 0);
  });

  h.test('ac: added in the browser to lists and hadith pages, own, linked and missing, against the API', async (t) => {
    const { page } = await openAc(h, t, '/about', { cookies: [{ name: 'hadith_tr', value: encodeURIComponent('bn,ur') }] });
    for (const [path, apiPath] of [
      [`/books/${BUKHARI}/hadiths/1`, '/books/bukhari/hadiths/1'],
      ['/books/sahih-muslim/hadiths/8a', '/books/muslim/hadiths/8a'],
      ['/books/40-hadith-nawawi/hadiths/1', '/books/nawawi/hadiths/1'],
      ['/books/hadeethenc/hadiths/4560', '/books/hadeethenc/hadiths/4560'],
    ]) {
      const hadith = await api(`${apiPath}${loc('en')}${withTr(['bn', 'ur'])}`);
      await gotoAc(h, page, path);
      await checkExtras(page.locator('section[class*="translationBlock"]'), hadith, ['bn', 'ur'], path);
    }

    for (const [path, apiPath] of [
      [`/books/${BUKHARI}/chapters/1`, `/books/bukhari/chapters/1${loc('en')}?perPage=20&translations=bn,ur`],
      ['/categories/the-creed/hadiths', `/categories/the-creed/hadiths${loc('en')}?perPage=20&translated=1&translations=bn,ur`],
    ]) {
      const list = await api(apiPath);
      await gotoAc(h, page, path);
      assert.ok(list.hadiths.length > 0, `${path}: hadiths`);
      for (const hadith of list.hadiths) {
        await checkExtras(page.locator(`#hadith-${hadith.id} div[class*="translationCol"]`), hadith, ['bn', 'ur'], `${path} #${hadith.id}`);
      }
    }
  });

  h.test(
    'ac: a language with no text gets one line; the topic collection\'s linked translation is labelled as such',
    async (t) => {
      const en = await strings();
      const vietnamese = { language: en.language('vi') };
      // Bukhari 1 has no Vietnamese text of any kind
      const { page } = await openAc(h, t, `/books/${BUKHARI}/hadiths/1?tr=vi`);
      const block = page.locator('section[class*="translationBlock"]');
      await waitForText(block.locator('p[data-language="vi"]'), en('extraMissing', vietnamese));
      assert.equal(await block.locator('div[data-language="vi"]').count(), 0);

      // Bukhari 3: only the topic collection's translation of the same wording
      const three = await api(`/books/bukhari/hadiths/3${loc('en')}${withTr(['vi'])}`);
      const entry = three.translations.find((item) => item.languageCode === 'vi');
      assert.ok(entry && entry.linked, 'the API links Bukhari 3 to the topic collection');
      await gotoAc(h, page, `/books/${BUKHARI}/hadiths/3?tr=vi`);
      const linked = page.locator('section[class*="translationBlock"] div[data-language="vi"]');
      await waitForText(linked.locator('span[class*="linkedBadge"]'), en('topicTranslation', vietnamese));
      assert.equal(await linked.getByRole('link', { name: en('linkedTranslationLink') }).getAttribute('href'), `/hadiths/${entry.linked.hadithId}`);
      assert.equal(norm(await linked.locator('p[class*="linkedNote"]').textContent()), norm(en('topicTranslationNote')));
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
    'ac phones: extra languages fold into 44px rows in lists; the hadith page shows them open',
    async (t) => {
      const en = await strings();
      const { page } = await openAc(h, t, `/books/${BUKHARI}/chapters/1?tr=bn,ur`);
      const extra = page.locator('article[id^="hadith-"]').first().locator('div[data-language="bn"]');
      await extra.waitFor();
      const toggle = extra.getByRole('button', { name: en('showExtra', { language: en.language('bn') }) });
      const body = extra.locator('div[class*="extraBody"]');
      assert.equal(await body.isVisible(), false, 'folded');
      const row = await extra.locator('div[class*="labelRow"]').boundingBox();
      assert.ok(row.height >= 44, `row is ${row.height}px tall`);
      await toggle.click();
      await until(() => body.isVisible(), 'opens on a tap');
      assert.equal(await extra.getByRole('button', { name: en('hideExtra', { language: en.language('bn') }) }).getAttribute('aria-expanded'), 'true');

      await gotoAc(h, page, `/books/${BUKHARI}/hadiths/1?tr=bn,ur`);
      const blocks = page.locator('section[class*="translationBlock"] div[data-language]');
      await until(async () => (await blocks.count()) === 2, 'both languages');
      assert.equal(await page.locator('section[class*="translationBlock"] button[aria-expanded]').count(), 0, 'nothing to open');
    },
    { only: 'phone', smoke: true }
  );

  h.test('ac wide screens: lists show the extra languages open', async (t) => {
    const { page } = await openAc(h, t, `/books/${BUKHARI}/chapters/1?tr=bn,ur`);
    const card = page.locator('article[id^="hadith-"]').first();
    for (const code of ['bn', 'ur']) {
      await card.locator(`div[data-language="${code}"] div[lang="${code}"]`).waitFor();
      assert.equal(await card.locator(`div[data-language="${code}"] div[lang="${code}"]`).isVisible(), true, `${code} open`);
      assert.equal(await card.locator(`div[data-language="${code}"] button`).isVisible(), false, 'no toggle');
    }
  }, { only: 'desktop' });

  if (h.chromium) {
    h.test('ac copy: the Arabic, the translations shown, everything; each with the citation and the permalink', async (t) => {
      const en = await strings();
      const hadith = await api(`/books/bukhari/hadiths/1${loc('en')}${withTr(['bn', 'ur'])}`);
      const { page } = await openAc(h, t, `/books/${BUKHARI}/hadiths/1?tr=bn,ur`);
      await checkExtras(page.locator('section[class*="translationBlock"]'), hadith, ['bn', 'ur'], 'before copying');
      const { canonical } = await meta(page);
      const header = page.locator('article > header');
      const reference = 'Sahih al-Bukhari 1';
      const own = hadith.translation;
      const extra = (code) => hadith.translations.find((item) => item.languageCode === code);
      const label = (text, entry) => [text, translatorOf(entry.author, entry.edition)].filter(Boolean).join(' · ');
      const arabic = `[${en('arabicText')}]\n${cleanText(hadith.arabic)}`;
      const translations = [
        `[${label(en('translationIn', { language: en.language('en') }), own)}]\n${cleanText(own.text)}`,
        `[${label(en('translationIn', { language: en.language('bn') }), extra('bn'))}]\n${cleanText(extra('bn').text)}`,
        `[${label(en('translationIn', { language: en.language('ur') }), extra('ur'))}]\n${cleanText(extra('ur').text)}`,
      ];
      const copy = (item) => copyFrom(page, header, en(item), en('hadithOptions'));
      assert.equal(await copy('copyArabic'), [reference, arabic, canonical].join('\n\n'));
      assert.equal(await copy('copyTranslations'), [reference, ...translations, canonical].join('\n\n'));
      assert.equal(await copy('copyAll'), [reference, arabic, ...translations, canonical].join('\n\n'));
      const citation = await copy('copyCitation');
      assert.ok(citation.startsWith(`${reference}\n`) && citation.endsWith(`\n${canonical}`), 'the citation, then its permalink');
      assert.ok(citation.includes(label(en('translationIn', { language: en.language('bn') }), extra('bn'))), 'the Bengali translation named');
    });
  }

  h.test(
    'vn: translators named when the source names one, never the compiler (Nawawi) or the publisher',
    async (t) => {
      const referenceRows = (page) =>
        page.locator('section[aria-label="Tham chiếu"] dl > div').evaluateAll((items) =>
          items.map((row) => [row.querySelector('dt').textContent.trim(), row.querySelector('dd').textContent.replace(/\s+/g, ' ').trim()])
        );
      // 40 Hadith Nawawi: the source gives the compiler's name, which is not shown
      const nawawi = await api(`/hadiths/35983${loc()}`);
      assert.equal(nawawi.translation.author, 'Imam Nawawi', 'the source gives the compiler');
      const { page } = await h.open(t, '/hadiths/35983');
      assert.ok(!/Imam Nawawi/.test(await page.locator('main').innerText()), 'the compiler is not named as a translator');
      assert.equal(await page.locator('section[class*="translationBlock"] [class*="creditName"]').count(), 0, 'no translator to name');
      // Sahih al-Bukhari: the English edition names Muhsin Khan
      const bukhari = await api(`/books/bukhari/hadiths/1${loc()}`);
      assert.equal(bukhari.translation.author, 'Muhsin Khan');
      await h.goto(page, `/books/${BUKHARI}/hadiths/1`);
      const block = page.locator('section[class*="translationBlock"]');
      assert.equal(norm(await block.locator('div[class*="labelRow"]').first().textContent()), 'Bản dịch tiếng Anh · Muhsin Khan');
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
