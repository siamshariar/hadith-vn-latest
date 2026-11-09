// The hadith page: in the site's one language (an old ?lang= changes nothing), the translation
// then the Arabic (open here), grades, "Cũng có trong", the reference block and "Báo lỗi",
// canonical and og:url, the legacy per-language URL, and the texts shown against the API.
'use strict';

const { BASE, BREADCRUMB_NAV, api, assert, bookName, cleanText, interfaceStrings, lettered, loc, meta, norm, spec, until, waitForH1, waitForText } = require('./harness');

// Translations are compared without whitespace: the English narrator line
// ("Narrated 'Umar:") is set on its own line, which adds or removes a space
// at that point; every other character must be the API's, in order.
const squash = (value) => String(value || '').replace(/\s+/g, '');

const BUKHARI = 'sahih-al-bukhari';
const translationBlock = (page, code) => page.locator(`section[class*="translationBlock"] div[lang="${code}"]`).first();
const arabicBlock = (page) => page.locator('section[class*="arabicBlock"] div[lang="ar"]');
const languageCookie = async (context) => (await context.cookies()).find((c) => c.name === 'hadith_lang');
// The translations chip of the page header ("Bản dịch: Tiếng Việt").
const chip = (page) => page.locator('article > header').getByRole('button', { name: /^Bản dịch:/ });
// The same in any interface.
const anyChip = (page) => page.locator('article > header button[data-translations]');

// The site URL the app builds permalinks from: the canonical of a page we
// know, checked against the citable path below.
async function siteOf(page) {
  const { canonical } = await meta(page);
  return canonical.replace(/\/books\/.*$/, '');
}

module.exports = spec(module, 'hadith page', (h) => {
  h.test(
    'the Vietnamese page: the English fallback labelled, the topic collection\'s translation said so; the Arabic under it, open',
    async (t) => {
      const vi = await api(`/books/bukhari/hadiths/1${loc()}`);
      const { page, context } = await h.open(t, `/books/${BUKHARI}/hadiths/1?lang=en`);
      // one language: an old ?lang= changes nothing, and there is no translations chip
      assert.equal((await meta(page)).lang, 'vi');
      assert.equal(await anyChip(page).count(), 0, 'no translations chip on a country\'s site');
      assert.equal(squash(await translationBlock(page, 'en').innerText()), squash(cleanText(vi.translation.text)), 'Vietnamese page shows the English fallback');
      await waitForText(page.locator('section[class*="translationBlock"] span[class*="fallbackBadge"]'), 'Bản dịch tiếng Anh');
      // the Arabic, after the translation, open on this page
      const order = await page.evaluate(() => {
        const t = document.querySelector('section[class*="translationBlock"]');
        const a = document.querySelector('section[class*="arabicBlock"]');
        return t && a ? t.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING : 0;
      });
      assert.ok(order, 'the translation first, then the Arabic');
      assert.equal(await page.locator('section[class*="arabicBlock"] details').getAttribute('open'), '', 'open on the hadith page');
      assert.equal(norm(await arabicBlock(page).innerText()), norm(cleanText(vi.arabic)));
      assert.equal(await languageCookie(context), undefined);
      // a hadith read through the topic collection's translation says so
      await h.goto(page, `/books/${BUKHARI}/hadiths/3`);
      await waitForText(page.locator('section[class*="translationBlock"] span[class*="linkedBadge"]').first(), 'Bản dịch tiếng Việt từ bộ hadith theo chủ đề');
    },
    { smoke: true }
  );

  h.test('grades: the badge and the table are the API grades', async (t) => {
    const [abuDawud, bukhari, bukhari3] = await Promise.all([
      api(`/books/abudawud/hadiths/2${loc()}`),
      api(`/books/bukhari/hadiths/1${loc()}`),
      api(`/books/bukhari/hadiths/3${loc()}`),
    ]);
    const henc = await api(`/hadiths/${bukhari3.linkedTranslation.hadithId}${loc()}`);
    const { page } = await h.open(t, `/books/${abuDawud.book.slug}/hadiths/2`);
    const badge = page.locator('header span[class*="gradeBadge"]').first();
    const [first, ...rest] = abuDawud.grades;
    assert.equal(await badge.getAttribute('title'), `Đánh giá độ xác thực: ${abuDawud.grades.map((g) => `${g.graderName}: ${g.grade}`).join('; ')}`);
    assert.equal(norm(await badge.locator('bdi').textContent()), first.grade);
    assert.equal(norm(await badge.locator('span[class*="gradeBadgeGrader"]').textContent()), `· ${first.graderName}`);
    if (rest.length) assert.equal(norm(await badge.locator('span[aria-hidden="true"]').textContent()), `+${rest.length}`);
    const rows = await page.locator('table tbody tr').evaluateAll((trs) => trs.map((tr) => [...tr.cells].map((td) => td.textContent.trim())));
    assert.deepEqual(rows, abuDawud.grades.map((g) => [g.graderName, g.grade]), 'one row per grader');

    // Bukhari: the source gives no per-hadith grade, so none is shown
    assert.deepEqual(bukhari.grades, []);
    await h.goto(page, `/books/${BUKHARI}/hadiths/1`);
    assert.equal(await page.locator('span[class*="gradeBadge"]').count(), 0, 'no badge');
    assert.equal(await page.locator('table').count(), 0, 'no grades table');

    // the topic collection: its own grade text, shown without a source name (the API
    // gives it under HadeethEnc's name), and no grader table
    await h.goto(page, `/hadiths/${henc.id}`);
    const hencBadge = page.locator('header span[class*="gradeBadge"]').first();
    assert.equal(norm(await hencBadge.locator('bdi').textContent()), henc.gradeText);
    assert.equal(await hencBadge.locator('span[class*="gradeBadgeGrader"]').count(), 0, 'no grader on the badge');
    assert.equal(await hencBadge.getAttribute('title'), 'Đánh giá độ xác thực');
    assert.equal(await page.locator('table').count(), 0, 'no grader table');
    assert.equal(
      norm(await page.locator('section[aria-label="Tham chiếu"] p[class*="gradeText"]').textContent()),
      `Đánh giá độ xác thực: ${henc.gradeText}`
    );
  });

  h.test(
    '"Cũng có trong" links resolve in both directions',
    async (t) => {
      const bukhari3 = await api(`/books/bukhari/hadiths/3${loc()}`);
      const henc = await api(`/hadiths/${bukhari3.linkedTranslation.hadithId}${loc()}`);
      assert.ok(henc.related.some((r) => r.id === bukhari3.id), 'the API relates them');
      const { page } = await h.open(t, `/hadiths/${henc.id}`);
      const alsoIn = page.locator('p[class*="alsoIn"]');
      await waitForText(alsoIn, `Cũng có trong: ${henc.related.map((r) => `${r.bookName} ${lettered(r.referenceNumber)}`).join(', ')}`);
      await alsoIn.getByRole('link', { name: 'Sahih al-Bukhari 3' }).click();
      await h.waitForPath(page, (url) => url.pathname === `/books/${BUKHARI}/hadiths/3`, 'related hadith');
      await waitForH1(page, 'Sahih al-Bukhari 3');

      // the topic collection is named by the interface, never by its source
      const vi = await interfaceStrings('vi');
      const back = page.locator('p[class*="alsoIn"]').getByRole('link', { name: `${bookName('vi', henc.book, vi)} ${henc.referenceNumber}` });
      assert.equal(await back.getAttribute('href'), `/books/hadeethenc/hadiths/${henc.referenceNumber}`);
      await back.click();
      await h.waitForPath(page, (url) => url.pathname === `/books/hadeethenc/hadiths/${henc.referenceNumber}`, 'back to the topic collection');
      await waitForH1(page, norm(cleanText(henc.title)));
      // the same links in the "same wording" section
      const chips = page.locator('section[aria-labelledby="hadith-related"] a');
      assert.deepEqual(
        await chips.evaluateAll((links) => links.map((a) => a.getAttribute('href'))),
        henc.related.map((r) => `/books/${r.bookSlug}/hadiths/${lettered(r.referenceNumber)}`)
      );
    },
    { smoke: true }
  );

  h.test('"Báo lỗi": a mailto with the citation and the permalink', async (t) => {
    const hadith = await api(`/books/muslim/hadiths/8a${loc()}`);
    const { page } = await h.open(t, `/hadiths/${hadith.id}`);
    const { canonical } = await meta(page);
    const link = page.locator('section[aria-label="Tham chiếu"] a[href^="mailto:"]');
    await waitForText(link, 'Báo lỗi');
    const href = await link.getAttribute('href');
    const url = new URL(href);
    assert.equal(url.protocol, 'mailto:');
    assert.equal(url.pathname, 'quran.vn@gmail.com');
    assert.equal(url.searchParams.get('subject'), 'Báo lỗi: Sahih Muslim 8a');
    const body = url.searchParams.get('body');
    assert.ok(body.startsWith(`Hadith: Sahih Muslim 8a\nLiên kết: ${canonical}\n`), `body: ${JSON.stringify(body)}`);
    // the same address in the ⋯ menu
    await page.locator('article > header').getByRole('button', { name: 'Tùy chọn hadith' }).click();
    assert.equal(await page.getByRole('menuitem', { name: 'Báo lỗi' }).getAttribute('href'), href);
  });

  h.test(
    'canonical and og:url are the citable URL, whichever URL was opened',
    async (t) => {
      const hadith = await api(`/books/muslim/hadiths/8a${loc()}`);
      const { page } = await h.open(t, `/hadiths/${hadith.id}`);
      const site = await siteOf(page);
      assert.match(site, /^https?:\/\/[^/]+$/, 'canonical is absolute');
      for (const path of [`/hadiths/${hadith.id}`, '/books/sahih-muslim/hadiths/8', '/books/muslim/hadiths/8.01', '/books/sahih-muslim/hadiths/8a?tr=en']) {
        await h.goto(page, path);
        const info = await meta(page);
        assert.equal(info.canonical, `${site}/books/sahih-muslim/hadiths/8a`, `canonical of ${path}`);
        assert.equal(info.ogUrl, `${site}/books/sahih-muslim/hadiths/8a`, `og:url of ${path}`);
      }
    },
    { smoke: true }
  );

  h.test('legacy URLs (/translations/{lang}, /books?book=) redirect permanently', async (t) => {
    for (const [path, location] of [
      // each site reads in one language: the hadith page
      [`/books/${BUKHARI}/hadiths/1/translations/en`, `/books/${BUKHARI}/hadiths/1`],
      [`/books/${BUKHARI}/hadiths/1/translations/BN`, `/books/${BUKHARI}/hadiths/1`],
      ['/books/sahih-muslim/hadiths/8a/translations/vi', '/books/sahih-muslim/hadiths/8a'],
      [`/books/${BUKHARI}/hadiths/1/translations/not-a-language`, `/books/${BUKHARI}/hadiths/1`],
    ]) {
      const res = await fetch(BASE + path, { redirect: 'manual' });
      assert.ok([301, 308].includes(res.status), `${path}: permanent redirect (got ${res.status})`);
      assert.equal(new URL(res.headers.get('location'), BASE).pathname + new URL(res.headers.get('location'), BASE).search, location, `${path} -> ${location}`);
    }
    // the old collection link /books?book={slug} too
    const old = await fetch(`${BASE}/books?book=${BUKHARI}`, { redirect: 'manual' });
    assert.ok([301, 308].includes(old.status), `/books?book= permanent redirect (got ${old.status})`);
    assert.equal(new URL(old.headers.get('location'), BASE).pathname, `/books/${BUKHARI}`);

    // in the browser too: the hadith page in the site's language
    const { page } = await h.open(t, `/books/${BUKHARI}/hadiths/1/translations/en`);
    await h.waitForPath(page, (url) => url.pathname === `/books/${BUKHARI}/hadiths/1` && !url.search, 'followed the redirect');
    await waitForH1(page, 'Sahih al-Bukhari 1');
  });

  h.test(
    'texts are exactly the API: Arabic, translation, Muslim 8a, the linked translation of the topic collection',
    async (t) => {
      const [one, muslim, three] = await Promise.all([
        api(`/books/bukhari/hadiths/1${loc()}`),
        api(`/books/muslim/hadiths/8a${loc()}`),
        api(`/books/bukhari/hadiths/3${loc()}`),
      ]);
      const { page } = await h.open(t, `/books/${BUKHARI}/hadiths/1`);
      assert.equal(norm(await arabicBlock(page).innerText()), norm(cleanText(one.arabic)), 'Arabic text');
      assert.equal(squash(await translationBlock(page, one.translation.languageCode).innerText()), squash(cleanText(one.translation.text)), 'translation text');
      const reference = await page.locator('section[aria-label="Tham chiếu"] dl > div').evaluateAll((rows) =>
        rows.map((row) => [row.querySelector('dt').textContent.trim(), row.querySelector('dd').textContent.replace(/\s+/g, ' ').trim()])
      );
      assert.deepEqual(reference, [
        ['Tham chiếu', 'Sahih al-Bukhari 1'],
        ['Vị trí trong sách', `Chương ${one.inBookReference.chapterNo}, Hadith ${one.inBookReference.position}`],
        // the translator, as the source names them (no edition, no link to it)
        ['Bản dịch tiếng Anh', one.translation.author],
      ]);

      // Muslim's 8.01 is cited 8a everywhere on its page
      await h.goto(page, `/hadiths/${muslim.id}`);
      assert.equal(muslim.referenceNumber, '8.01');
      await waitForH1(page, 'Sahih Muslim 8a');
      const crumbs = await page.locator(BREADCRUMB_NAV).locator('li').allTextContents();
      assert.equal(norm(crumbs[crumbs.length - 1]), 'Hadith 8a');
      assert.equal(norm(await arabicBlock(page).innerText()), norm(cleanText(muslim.arabic)));

      // Bukhari 3: the topic collection's Vietnamese translation, labelled as such,
      // its source line closing the box
      const linked = three.linkedTranslation;
      await h.goto(page, `/books/${BUKHARI}/hadiths/3`);
      const block = page.locator('section[class*="translationBlock"] div[class*="linked"]').first();
      await waitForText(block.locator('span[class*="linkedBadge"]'), 'Bản dịch tiếng Việt từ bộ hadith theo chủ đề');
      assert.ok(norm(await block.locator('p[class*="linkedNote"]').textContent()).startsWith('Hadith này chưa có bản dịch riêng bằng ngôn ngữ này.'));
      assert.equal(norm(await block.locator('div[lang="vi"]').innerText()), norm(cleanText(linked.text)), 'linked text is the API text');
      assert.deepEqual((await block.locator('p[data-source-line]').allTextContents()).map(norm), ['Nguồn: HadeethEnc.com']);
      assert.equal(await block.getByRole('link', { name: /Xem giải thích đầy đủ/ }).getAttribute('href'), `/hadiths/${linked.hadithId}`);
      // the collection's own (English) translation stays available, folded
      const details = page.locator('section[class*="translationBlock"] details');
      await waitForText(details.locator('summary'), 'Xem bản dịch tiếng Anh');
      await details.locator('summary').click();
      assert.equal(squash(await details.locator('div[lang="en"]').innerText()), squash(cleanText(three.translation.text)));
      const credit = await page.locator('section[aria-label="Tham chiếu"] dl > div').evaluateAll((rows) =>
        rows.map((row) => row.querySelector('dt').textContent.trim())
      );
      assert.ok(credit.includes('Bản dịch tiếng Việt từ bộ hadith theo chủ đề') && credit.includes('Bản dịch tiếng Anh'), `credits: ${credit}`);
    },
    { smoke: true }
  );

  h.test('a record the source does not number (Muslim, Introduction)', async (t) => {
    const intro = await api(`/books/muslim/chapters/0${loc()}?perPage=20`);
    const [first, second, third] = intro.hadiths;
    assert.equal(second.referenceNumber, null);
    const hadith = await api(`/hadiths/${second.id}${loc()}`);
    const { page } = await h.open(t, `/hadiths/${second.id}`);
    const reference = 'Sahih Muslim (nguồn không đánh số tham chiếu)';
    await waitForH1(page, reference);
    const info = await meta(page);
    assert.equal(norm(info.title), `${reference} | Hadith tiếng Việt | Hadith.vn`, 'the title names the record, not just the collection');
    assert.ok(info.canonical.endsWith(`/hadiths/${second.id}`), `canonical by id: ${info.canonical}`);
    assert.equal(await page.getByText('Số hadith:').count(), 0, 'no number to show');
    const crumbs = await page.locator(BREADCRUMB_NAV).locator('li').allTextContents();
    assert.equal(norm(crumbs[crumbs.length - 1]), 'Hadith');
    const rows = await page.locator('section[aria-label="Tham chiếu"] dl > div').evaluateAll((items) =>
      items.map((row) => [row.querySelector('dt').textContent.trim(), row.querySelector('dd').textContent.trim()])
    );
    assert.deepEqual(rows.slice(0, 2), [
      ['Tham chiếu', reference],
      ['Vị trí trong sách', `Chương ${hadith.inBookReference.chapterNo}, Hadith ${hadith.inBookReference.position}`],
    ]);
    // previous / next by id; the numbered neighbour by its citation
    assert.equal(await page.locator('a[rel="prev"]').getAttribute('href'), `/hadiths/${first.id}`);
    assert.equal(await page.locator('a[rel="next"]').getAttribute('href'), `/hadiths/${third.id}`);
    await page.locator('a[rel="next"]').click();
    await h.waitForPath(page, (url) => url.pathname === `/hadiths/${third.id}`, 'next record');
    // (same h1 as the previous record: wait for the new page's links)
    await until(
      async () => (await page.locator('a[rel="next"]').getAttribute('href')) === '/books/sahih-muslim/hadiths/8a',
      'the last introduction record links on to Sahih Muslim 8a'
    );
    assert.equal(await page.locator('a[rel="prev"]').getAttribute('href'), `/hadiths/${second.id}`);
  });

  h.test('topic collection details: explanation, benefits, word meanings, sources, categories, source line', async (t) => {
    const bukhari3 = await api(`/books/bukhari/hadiths/3${loc()}`);
    const henc = await api(`/hadiths/${bukhari3.linkedTranslation.hadithId}${loc()}`);
    const d = henc.details;
    const { page } = await h.open(t, `/hadiths/${henc.id}`);
    if (d.explanation) {
      assert.equal(norm(await page.locator('section[aria-labelledby="hadith-explanation"] div').innerText()), norm(cleanText(d.explanation)));
    }
    if (d.hints && d.hints.length) {
      assert.deepEqual(
        (await page.locator('section[aria-labelledby="hadith-benefits"] li').allTextContents()).map(norm),
        d.hints.map((x) => norm(cleanText(x))).filter(Boolean)
      );
    }
    if (d.wordsMeanings && d.wordsMeanings.length) {
      assert.equal(await page.locator('section[aria-labelledby="hadith-words"] dt').count(), d.wordsMeanings.length);
    }
    if (d.reference) {
      assert.equal(norm(await page.locator('section[aria-labelledby="hadith-sources"] div').innerText()), norm(cleanText(d.reference)));
    }
    const categories = await page.locator('section[aria-labelledby="hadith-categories"] a').evaluateAll((links) => links.map((a) => decodeURIComponent(a.getAttribute('href'))));
    assert.deepEqual(categories, henc.categories.map((c) => `/categories/${c.slug}`));
    // HadeethEnc's content, so one source line on the page, under the translations
    assert.deepEqual((await page.locator('article [data-source-line]').allTextContents()).map(norm), ['Nguồn: HadeethEnc.com']);
    assert.equal(await page.locator('section[class*="translationBlock"] [data-source-line]').count(), 1);
  });
});
