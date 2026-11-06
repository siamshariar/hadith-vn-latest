// "Đi tới hadith": the home box takes a collection and a number, the box on
// a collection page only the number. Each input opens the hadith the API
// returns for that citation, or says in Vietnamese what was not found.
'use strict';

const { api, assert, lettered, loc, norm, pathOf, sleep, spec, waitForH1, waitForText } = require('./harness');

// [input, API book code, number] for inputs that must open a hadith
const FOUND = [
  ['Bukhari 1', 'bukhari', '1'],
  ['muslim 8a', 'muslim', '8a'],
  ['Muslim 8', 'muslim', '8'],
  ['abu dawud 2', 'abudawud', '2'],
  ['Tirmidhi 3', 'tirmidhi', '3'],
];
const GARBAGE = ['xyz abc', 'bukhari 999999', '!!'];

// The page reached for a hadith: its h1 is the citation (no title outside
// the topic collection).
async function expectHadith(h, page, hadith, input) {
  const citation = `${hadith.book.name} ${lettered(hadith.referenceNumber)}`;
  await h.waitForPath(
    page,
    (url) => url.pathname === `/hadiths/${hadith.id}` || url.pathname === `/books/${hadith.book.slug}/hadiths/${lettered(hadith.referenceNumber)}`,
    `"${input}" opens ${citation}`
  );
  await waitForH1(page, citation);
}

async function expectNotFound(h, page, input) {
  await h.waitForPath(page, (url) => url.pathname === '/search' && url.searchParams.get('go') === input.trim(), `"${input}" goes to /search`);
  await waitForText(
    page.getByRole('status'),
    `Không tìm thấy hadith “${input.trim()}”. Gõ tên bộ sưu tập và số hadith, ví dụ “Bukhari 1”, “Muslim 8a”, “Abu Dawud 2”.`
  );
}

// Submitting nothing stays on the page and says what to type.
async function expectEmptyHint(page, field, before) {
  await sleep(500);
  assert.equal(pathOf(page), before, 'an empty go-to does not navigate');
  const hint = page.locator(`#${await field.getAttribute('id')}-hint`);
  await waitForText(hint, /^Gõ /);
}

module.exports = spec(module, 'go to hadith', (h) => {
  h.test(
    'home box: citations open the hadith, garbage and empty say what to type',
    async (t) => {
      const { page } = await h.open(t, '/');
      const field = page.getByLabel('Đi tới hadith', { exact: true });
      for (const [input, code, number] of FOUND) {
        const hadith = await api(`/books/${code}/hadiths/${encodeURIComponent(number)}${loc()}`);
        await h.goto(page, '/');
        await field.fill(input);
        await field.press('Enter');
        await expectHadith(h, page, hadith, input);
      }
      for (const input of GARBAGE) {
        await h.goto(page, '/');
        await field.fill(input);
        await page.getByRole('button', { name: 'Đi', exact: true }).click();
        await expectNotFound(h, page, input);
      }
      await h.goto(page, '/');
      await field.fill('   ');
      await field.press('Enter');
      await expectEmptyHint(page, field, '/');
    },
    { smoke: true }
  );

  h.test('collection page box: a number in that collection', async (t) => {
    const book = await api(`/books/muslim${loc()}`);
    const path = `/books/${book.slug}`;
    const { page } = await h.open(t, path);
    const field = page.getByLabel('Đi tới số hadith', { exact: true });
    for (const number of ['8a', '8', '8.02']) {
      const hadith = await api(`/books/muslim/hadiths/${number}${loc()}`);
      await h.goto(page, path);
      await field.fill(number);
      await field.press('Enter');
      await expectHadith(h, page, hadith, number);
    }
    for (const input of ['zz', '999999']) {
      await h.goto(page, path);
      await field.fill(input);
      await field.press('Enter');
      await expectNotFound(h, page, input);
    }
    await h.goto(page, path);
    await field.fill('');
    await field.press('Enter');
    await expectEmptyHint(page, field, path);
  });

  h.test('a citation typed in the search box opens the hadith too', async (t) => {
    const hadith = await api(`/books/nawawi/hadiths/5${loc()}`);
    const { page } = await h.open(t, '/');
    const box = page.getByRole('search').getByRole('searchbox', { name: 'Tìm kiếm' });
    await box.fill('Nawawi 5');
    await box.press('Enter');
    await expectHadith(h, page, hadith, 'Nawawi 5');
  });
});
