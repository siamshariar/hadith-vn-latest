// What a reader does with a hadith (the ⋮ menu on cards and on the hadith page): copy the
// text, the citation or the link; share; bookmark into a folder; pin; and the last-read
// history behind "Tiếp tục đọc". The saved lists live in localStorage and must survive a reload.
'use strict';

const {
  api,
  assert,
  bookName,
  cleanText,
  interfaceStrings,
  lettered,
  loc,
  meta,
  readClipboard,
  sleep,
  spec,
  stored,
  translatorOf,
  until,
  waitForH1,
  waitForText,
  writeClipboard,
} = require('./harness');

const BUKHARI = 'sahih-al-bukhari';

// The copied texts, from the API data, in the format the site promises
// (lib/citation): labels as on the page, the translator when the source names
// one, grades with their grader names (the topic collection's own grade
// without one), and HadeethEnc's source line when its content is copied.
const SOURCE_LINE = 'Nguồn: HadeethEnc.com';
const HADITH_OPTIONS = 'Tùy chọn hadith';
const label = (text, entry) => [text, translatorOf(entry.author, entry.edition)].filter(Boolean).join(' · ');

function expectedCitation(hadith, permalink, site, name = hadith.book.name) {
  const book = hadith.book;
  const topic = book.source === 'hadeethenc';
  const lines = [`${name} ${lettered(hadith.referenceNumber)}`];
  if (!topic && hadith.inBookReference) {
    lines.push(`Vị trí trong sách: Chương ${hadith.inBookReference.chapterNo}, Hadith ${hadith.inBookReference.position}`);
  }
  const own = hadith.translation;
  const linked = own && !own.isFallback ? null : hadith.linkedTranslation;
  if (linked) lines.push(`${label('Bản dịch tiếng Việt từ bộ hadith theo chủ đề', linked)} - ${site}/hadiths/${linked.hadithId}`);
  if (own) {
    const text = own.isFallback ? 'Bản dịch tiếng Anh' : `Bản dịch ${own.languageCode === 'vi' ? 'tiếng Việt' : own.languageCode}`;
    lines.push(label(text, own));
  }
  if (topic || linked) lines.push(SOURCE_LINE);
  lines.push(permalink);
  return lines.join('\n');
}

function expectedText(hadith, permalink, name = hadith.book.name) {
  const book = hadith.book;
  const topic = book.source === 'hadeethenc';
  const parts = [`${name} ${lettered(hadith.referenceNumber)}`];
  if (hadith.title) parts.push(cleanText(hadith.title));
  parts.push(`[Nguyên văn tiếng Ả Rập]\n${cleanText(hadith.arabic)}`);
  const own = hadith.translation;
  const linked = own && !own.isFallback ? null : hadith.linkedTranslation;
  if (linked) parts.push(`[${label('Bản dịch tiếng Việt từ bộ hadith theo chủ đề', linked)}]\n${cleanText(linked.text)}`);
  if (own) parts.push(`[${label(own.isFallback ? 'Bản dịch tiếng Anh' : 'Bản dịch tiếng Việt', own)}]\n${cleanText(own.text)}`);
  const grades = [];
  if (hadith.gradeText) grades.push(hadith.gradeText);
  if (!topic) hadith.grades.forEach((g) => grades.push(`${g.graderName}: ${g.grade}`));
  if (grades.length) parts.push(`Đánh giá độ xác thực: ${grades.join('; ')}`);
  if (topic || linked) parts.push(SOURCE_LINE);
  parts.push(permalink);
  return parts.join('\n\n');
}

// Picks an item of the copy menu of `scope` (the page header or a card) and
// returns what reached the clipboard.
async function copyFrom(page, scope, item) {
  const sentinel = `e2e-${Date.now()}-${Math.random()}`;
  await writeClipboard(page, sentinel);
  await scope.getByRole('button', { name: HADITH_OPTIONS }).click();
  await page.getByRole('menuitem', { name: item, exact: true }).click();
  const copied = await until(async () => {
    const value = await readClipboard(page);
    return value !== sentinel && value;
  }, `"${item}" reaches the clipboard`);
  await waitForText(page.locator('.MuiSnackbarContent-message'), 'Đã được copy');
  return copied;
}

module.exports = spec(module, 'hadith actions', (h) => {
  if (h.chromium) {
    h.test('copy text, citation and link (with grader names and labels)', async (t) => {
      const cases = await Promise.all([
        api(`/books/abudawud/hadiths/2${loc()}`),
        api(`/books/bukhari/hadiths/3${loc()}`),
      ]);
      const henc = await api(`/hadiths/${cases[1].linkedTranslation.hadithId}${loc()}`);
      cases.push(henc);
      const { page } = await h.open(t, null);
      const vi = await interfaceStrings('vi');
      for (const hadith of cases) {
        const name = bookName('vi', hadith.book, vi); // the topic collection: by the interface
        const citable = `/books/${hadith.book.slug}/hadiths/${lettered(hadith.referenceNumber)}`;
        await h.goto(page, citable);
        const { canonical } = await meta(page);
        const site = canonical.slice(0, canonical.length - citable.length);
        assert.equal(canonical, `${site}${citable}`, 'canonical is the citable URL');
        const header = page.locator('article > header');
        assert.equal(await copyFrom(page, header, 'Copy tất cả'), expectedText(hadith, canonical, name), `${citable}: copied text`);
        await sleep(300);
        assert.equal(await copyFrom(page, header, 'Copy trích dẫn'), expectedCitation(hadith, canonical, site, name), `${citable}: copied citation`);
        await sleep(300);
        assert.equal(await copyFrom(page, header, 'Copy liên kết'), canonical, `${citable}: copied link`);
      }
    });

    h.test('a card copies the same citation as the hadith page', async (t) => {
      const hadith = await api(`/books/bukhari/hadiths/1${loc()}`);
      const { page } = await h.open(t, `/books/${BUKHARI}/chapters/1`);
      const card = page.locator(`#hadith-${hadith.id}`);
      const fromCard = await copyFrom(page, card, 'Copy trích dẫn');
      await h.goto(page, `/books/${BUKHARI}/hadiths/1`);
      const fromPage = await copyFrom(page, page.locator('article > header'), 'Copy trích dẫn');
      assert.equal(fromCard, fromPage);
      const { canonical } = await meta(page);
      assert.equal(fromPage, expectedCitation(hadith, canonical, canonical.replace(/\/books\/.*$/, '')));
    });
  }

  h.test(
    'share: without navigator.share the share dialog opens and closes',
    async (t) => {
      const { page } = await h.open(t, `/books/${BUKHARI}/hadiths/1`, {
        // desktop browsers have no Web Share API; make sure of it everywhere
        initScript: () => {
          try {
            delete Navigator.prototype.share;
            delete Navigator.prototype.canShare;
          } catch (_) {
            /* not there */
          }
        },
      });
      assert.equal(await page.evaluate(() => typeof navigator.share), 'undefined');
      const share = async () => {
        await page.locator('article > header').getByRole('button', { name: HADITH_OPTIONS }).click();
        await page.getByRole('menuitem', { name: 'Chia sẻ', exact: true }).click();
      };
      await share();
      const dialog = page.locator('[role="presentation"]').filter({ has: page.locator('#share-title') });
      await waitForText(dialog.locator('#share-title'), 'Chia sẻ hadith');
      for (const name of ['Email', 'Facebook', 'X (Twitter)', 'WhatsApp', 'Telegram']) {
        assert.equal(await dialog.getByRole('button', { name }).count(), 1, `${name} share button`);
      }
      await dialog.getByRole('button', { name: 'Đóng' }).click();
      await dialog.waitFor({ state: 'detached' });
      await share();
      await dialog.locator('#share-title').waitFor();
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'detached' });
    },
    { smoke: true }
  );

  h.test(
    'share: navigator.share gets the citation and the permalink',
    async (t) => {
      const { page } = await h.open(t, `/books/${BUKHARI}/hadiths/1`, {
        initScript: () => {
          Object.defineProperty(Navigator.prototype, 'share', {
            configurable: true,
            value(data) {
              window.__shared = data;
              return Promise.resolve();
            },
          });
        },
      });
      const { canonical } = await meta(page);
      await page.locator('article > header').getByRole('button', { name: HADITH_OPTIONS }).click();
      await page.getByRole('menuitem', { name: 'Chia sẻ', exact: true }).click();
      const shared = await until(() => page.evaluate(() => window.__shared), 'navigator.share called');
      assert.deepEqual(shared, { title: 'Sahih al-Bukhari 1 | Hadith.vn', url: canonical });
      assert.equal(await page.locator('#share-title').count(), 0, 'no fallback dialog when the browser shares');
    },
    { only: 'phone' }
  );

  h.test(
    'bookmark into a folder, see it in /bookmarks, survive a reload, remove it',
    async (t) => {
      const hadith = await api(`/books/bukhari/hadiths/1${loc()}`);
      const { page } = await h.open(t, `/books/${BUKHARI}/hadiths/1`);
      const header = page.locator('article > header');
      await header.getByRole('button', { name: HADITH_OPTIONS }).click();
      await page.getByRole('menuitem', { name: 'Lưu dấu trang', exact: true }).click();
      const dialog = page.locator('[role="presentation"]').filter({ has: page.locator('h2', { hasText: 'Lưu dấu trang' }) });
      await dialog.waitFor();
      const folder = dialog.getByRole('combobox', { name: 'Chọn thư mục' });
      assert.deepEqual(
        await folder.locator('option').evaluateAll((options) => options.map((o) => [o.value, o.textContent.trim()])),
        [['favorites', 'Yêu thích'], ['create', 'Tạo thư mục mới']]
      );
      await dialog.getByRole('button', { name: 'Thêm', exact: true }).click();
      await dialog.waitFor({ state: 'detached' });
      await until(async () => (await header.getByRole('button', { name: 'Bỏ dấu trang' }).count()) === 1, 'button shows the bookmark');
      const saved = await stored(page, 'bookmarks');
      assert.deepEqual(saved.favorites.entry.map((e) => e.id), [hadith.id]);

      await page.reload();
      await h.waitForHydration(page);
      await until(async () => (await page.locator('article > header').getByRole('button', { name: 'Bỏ dấu trang' }).count()) === 1, 'still bookmarked after a reload');

      // the folder in the saved lists, then the folder page with the hadith
      await h.goto(page, '/bookmarks');
      const folderLink = page.locator('main').getByRole('tabpanel').getByRole('link', { name: /Yêu thích/ });
      await waitForText(folderLink, /^Yêu thích\s*1 hadith$/);
      await folderLink.click();
      await h.waitForPath(page, (url) => url.pathname === '/bookmarks' && url.searchParams.get('key') === 'favorites', 'folder page');
      await waitForH1(page, 'Yêu thích');
      const card = page.locator(`#hadith-${hadith.id}`);
      await waitForText(card.locator('a[class*="citation"]'), 'Sahih al-Bukhari 1');

      await card.getByRole('button', { name: 'Bỏ dấu trang' }).click();
      const confirm = page.locator('[role="presentation"]').filter({ has: page.locator('h2', { hasText: 'Bỏ dấu trang?' }) });
      await confirm.getByRole('button', { name: 'Xoá', exact: true }).click();
      await card.waitFor({ state: 'detached' });
      await waitForText(page.getByText('Thư mục này chưa có dấu trang.'), 'Thư mục này chưa có dấu trang.');
      await page.reload();
      await h.waitForHydration(page);
      await waitForText(page.getByText('Thư mục này chưa có dấu trang.'), 'Thư mục này chưa có dấu trang.');
      assert.deepEqual((await stored(page, 'bookmarks')).favorites.entry, []);
    },
    { smoke: true }
  );

  h.test('bookmark folders: create one, empty name refused, delete it', async (t) => {
    const hadith = await api(`/books/bukhari/hadiths/3${loc()}`);
    const { page } = await h.open(t, `/books/${BUKHARI}/hadiths/3`);
    await page.locator('article > header').getByRole('button', { name: HADITH_OPTIONS }).click();
    await page.getByRole('menuitem', { name: 'Lưu dấu trang', exact: true }).click();
    const dialog = page.locator('[role="presentation"]').filter({ has: page.locator('h2', { hasText: 'Lưu dấu trang' }) });
    await dialog.getByRole('combobox', { name: 'Chọn thư mục' }).selectOption('create');
    const name = dialog.getByRole('textbox', { name: 'Tên thư mục' });
    await name.waitFor({ state: 'visible' });
    await dialog.getByRole('button', { name: 'Thêm', exact: true }).click();
    await waitForText(dialog.getByRole('alert'), 'Hãy nhập tên thư mục.');
    await name.fill('Học tập');
    await dialog.getByRole('button', { name: 'Thêm', exact: true }).click();
    await dialog.waitFor({ state: 'detached' });
    const saved = await stored(page, 'bookmarks');
    const key = Object.keys(saved).find((k) => saved[k].name === 'Học tập');
    assert.ok(key, 'folder saved');
    assert.deepEqual(saved[key].entry.map((e) => e.id), [hadith.id]);

    await h.goto(page, '/bookmarks');
    const panel = page.locator('main').getByRole('tabpanel');
    await waitForText(panel.getByRole('link', { name: /Học tập/ }), /^Học tập\s*1 hadith$/);
    // on desktop the delete button shows on hover or when the folder has keyboard focus
    await panel.getByRole('link', { name: /Học tập/ }).focus();
    await panel.getByRole('button', { name: 'Xoá thư mục Học tập' }).click();
    const confirm = page.locator('[role="presentation"]').filter({ has: page.locator('h2', { hasText: 'Xoá thư mục?' }) });
    await confirm.getByRole('button', { name: 'Xoá', exact: true }).click();
    await until(async () => (await panel.getByRole('link', { name: /Học tập/ }).count()) === 0, 'folder removed');
    await page.reload();
    await h.waitForHydration(page);
    await waitForText(page.locator('main').getByRole('tabpanel').getByRole('link').first(), /Yêu thích/);
    assert.equal(await page.locator('main').getByRole('tabpanel').getByRole('link', { name: /Học tập/ }).count(), 0, 'still gone after a reload');
  });

  h.test(
    'pin and unpin; pins and the reading history survive a reload; "Tiếp tục đọc"',
    async (t) => {
      const [three, chapter] = await Promise.all([api(`/books/bukhari/hadiths/3${loc()}`), api(`/books/bukhari/chapters/1${loc()}?perPage=20`)]);
      const { page } = await h.open(t, '/');
      assert.equal(await page.getByText('Tiếp tục đọc').count(), 0, 'nothing to continue in a new browser');

      // pin from the hadith page
      await h.goto(page, `/books/${BUKHARI}/hadiths/3`);
      await page.locator('article > header').getByRole('button', { name: HADITH_OPTIONS }).click();
      await page.getByRole('menuitem', { name: 'Ghim', exact: true }).click();
      await until(async () => ((await stored(page, 'pin')) || []).some((p) => p.id === three.id), 'pin saved');

      // continue reading on the home page
      await h.goto(page, '/');
      const resume = page.getByRole('link', { name: /Tiếp tục đọc/ });
      await waitForText(resume, /^Tiếp tục đọc\s*Sahih al-Bukhari 3\s*→$/);
      await page.reload();
      await h.waitForHydration(page);
      await waitForText(page.getByRole('link', { name: /Tiếp tục đọc/ }), /^Tiếp tục đọc\s*Sahih al-Bukhari 3\s*→$/);
      await page.getByRole('link', { name: /Tiếp tục đọc/ }).click();
      await h.waitForPath(page, (url) => url.pathname === `/hadiths/${three.id}`, 'continue reading');
      await waitForH1(page, 'Sahih al-Bukhari 3');

      // the saved lists: pins and recently read
      await h.goto(page, '/bookmarks');
      await page.getByRole('tab', { name: 'Đã ghim' }).click();
      const pinned = page.locator('main').getByRole('tabpanel').getByRole('link', { name: 'Sahih al-Bukhari 3' });
      await pinned.waitFor();
      await page.getByRole('tab', { name: 'Đọc gần đây' }).click();
      await page.locator('main').getByRole('tabpanel').getByRole('link', { name: /Sahih al-Bukhari 3/ }).waitFor();
      await page.reload();
      await h.waitForHydration(page);
      // the last tab is remembered, and the history is still there
      await until(async () => (await page.getByRole('tab', { name: 'Đọc gần đây' }).getAttribute('aria-selected')) === 'true', 'tab remembered');
      await page.locator('main').getByRole('tabpanel').getByRole('link', { name: /Sahih al-Bukhari 3/ }).waitFor();
      await page.getByRole('tab', { name: 'Đã ghim' }).click();
      await page.locator('main').getByRole('tabpanel').getByRole('link', { name: 'Sahih al-Bukhari 3' }).click();
      await h.waitForPath(page, (url) => url.pathname === `/books/${BUKHARI}/hadiths/3`, 'pin opens where it was made');
      await waitForH1(page, 'Sahih al-Bukhari 3');

      // unpin
      await page.locator('article > header').getByRole('button', { name: HADITH_OPTIONS }).click();
      await page.getByRole('menuitem', { name: 'Bỏ ghim', exact: true }).click();
      await until(async () => ((await stored(page, 'pin')) || []).length === 0, 'pin removed');
      await h.goto(page, '/bookmarks');
      await page.getByRole('tab', { name: 'Đã ghim' }).click();
      await waitForText(page.locator('main').getByRole('tabpanel'), 'Chưa có hadith nào được ghim.');

      // a pin made on a chapter page goes back to the card there
      const first = chapter.hadiths[1];
      await h.goto(page, `/books/${BUKHARI}/chapters/1`);
      await page.locator(`#hadith-${first.id}`).getByRole('button', { name: HADITH_OPTIONS }).click();
      await page.getByRole('menuitem', { name: 'Ghim', exact: true }).click();
      await until(async () => ((await stored(page, 'pin')) || []).some((p) => p.id === first.id), 'card pin saved');
      await h.goto(page, '/bookmarks');
      await page.getByRole('tab', { name: 'Đã ghim' }).click();
      await page.locator('main').getByRole('tabpanel').getByRole('link', { name: `Sahih al-Bukhari ${first.referenceNumber}` }).click();
      await h.waitForPath(page, (url) => url.pathname === `/books/${BUKHARI}/chapters/1` && url.hash === `#hadith-${first.id}`, 'back to the card');
      await until(async () => {
        const box = await page.locator(`#hadith-${first.id}`).boundingBox();
        return box && box.y >= 0 && box.y < 400;
      }, 'scrolled to the pinned card');
    },
    { smoke: true }
  );

  h.test(
    'desktop "Tùy chọn khác" menu: bookmarks, pins and history dialogs',
    async (t) => {
      const { page } = await h.open(t, `/books/${BUKHARI}/hadiths/1`);
      await page.locator('article > header').getByRole('button', { name: HADITH_OPTIONS }).click();
      await page.getByRole('menuitem', { name: 'Ghim', exact: true }).click();
      for (const [item, expected] of [
        ['Dấu trang', /Yêu thích\s*0 hadith/],
        ['Đã ghim', /Sahih al-Bukhari 1/],
        ['Đọc gần đây', /Sahih al-Bukhari 1/],
      ]) {
        await page.getByRole('button', { name: 'Tùy chọn khác' }).click();
        await page.getByRole('menuitem', { name: item, exact: true }).click();
        const dialog = page.getByRole('dialog').or(page.locator('[role="presentation"]').filter({ hasText: item })).last();
        await waitForText(dialog, expected);
        await page.keyboard.press('Escape');
        await sleep(300);
      }
      // a pin opens its hadith and closes the dialog
      await page.getByRole('button', { name: 'Tùy chọn khác' }).click();
      await page.getByRole('menuitem', { name: 'Đã ghim', exact: true }).click();
      await page.locator('[role="presentation"]').getByRole('link', { name: 'Sahih al-Bukhari 1' }).click();
      await h.waitForPath(page, (url) => url.pathname === `/books/${BUKHARI}/hadiths/1`, 'pin from the dialog');
      await until(async () => (await page.locator('[role="presentation"]').filter({ hasText: 'Đã ghim' }).count()) === 0, 'dialog closed');
    },
    { only: 'desktop' }
  );
});
