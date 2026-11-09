// Citations in the search (the one search field, on the search page the header's icon opens):
// each opens the hadith the API returns for it, or says in Vietnamese what was not found.
'use strict';

const { api, assert, lettered, loc, spec, until, waitForH1, waitForText } = require('./harness');

// [input, API book code, number] for inputs that must open a hadith
const FOUND = [
  ['Bukhari 1', 'bukhari', '1'],
  ['muslim 8a', 'muslim', '8a'],
  ['Muslim 8', 'muslim', '8'],
  ['abu dawud 2', 'abudawud', '2'],
  ['Tirmidhi 3', 'tirmidhi', '3'],
];

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
  await h.waitForPath(page, (url) => url.pathname === '/search' && url.searchParams.get('q') === input.trim(), `"${input}" stays on /search`);
  await waitForText(
    page.getByRole('status'),
    `Không tìm thấy hadith “${input.trim()}”. Gõ tên bộ sưu tập và số hadith, ví dụ “Bukhari 1”, “Muslim 8a”, “Abu Dawud 2”.`
  );
}

// The search field of the search page.
const searchBox = (page) => page.getByRole('search').getByRole('searchbox', { name: 'Tìm kiếm' });

module.exports = spec(module, 'go to hadith', (h) => {
  h.test(
    "the header's search icon opens the search page, ready to type; a citation there opens the hadith",
    async (t) => {
      const { page } = await h.open(t, '/');
      await page.locator('[data-site-header]').getByRole('link', { name: 'Tìm kiếm' }).filter({ visible: true }).first().click();
      await h.waitForPath(page, (url) => url.pathname === '/search', 'the search page');
      await until(async () => searchBox(page).evaluate((field) => field === document.activeElement), 'the field has the focus');

      for (const [input, code, number] of FOUND) {
        const hadith = await api(`/books/${code}/hadiths/${encodeURIComponent(number)}${loc()}`);
        await h.goto(page, '/search');
        await searchBox(page).fill(input);
        await searchBox(page).press('Enter');
        await expectHadith(h, page, hadith, input);
      }
      // a citation of a hadith that is not there says so, and how to write one
      await h.goto(page, '/search');
      await searchBox(page).fill('bukhari 999999');
      await searchBox(page).press('Enter');
      await expectNotFound(h, page, 'bukhari 999999');
    },
    { smoke: true }
  );

  h.test('no other search field: the home page and a collection page have none of their own', async (t) => {
    const { page } = await h.open(t, '/');
    assert.equal(await page.locator('main input[type="search"], main input[name="go"]').count(), 0, 'home');
    await h.goto(page, '/books/sahih-muslim');
    assert.equal(await page.locator('main input[type="search"], main input[name="go"]').count(), 0, 'a collection page');
    if (h.desktop) {
      assert.equal(await page.locator('[data-site-header] input[type="search"]').count(), 0, 'the header has the icon only');
    }
  });
});
