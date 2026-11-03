// Responsive audit of hadith-vn: every page at every viewport, in Chromium and WebKit.
// Usage: node audit.js [outDir] [--engine=chromium|webkit|both] [--vp=phone,tablet] [--pages=/,/books] [--shots]
//          [--locale=vi-VN] [--click=<selector>]
// then: python3 summarize.py outDir/results-<engine>.json
// --locale: the browser's language (Accept-Language), default vi-VN; the international site
// (ac) picks its content and interface from it. --click: a control to click on each page before
// it is inspected (its first visible match; a page without one is inspected as it is, and its
// result says clicked: false), e.g. --click='button[data-language-menu]' opens the language menu.
// playwright-core is not a project dependency: point PLAYWRIGHT_CORE at an installed copy
// (its browsers come from ~/.cache/ms-playwright).
const pw = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const args = process.argv.slice(2);
const OUT = args.find(a => !a.startsWith('--')) || path.join(__dirname, 'out');
// --name=value; the value may itself contain '=' (e.g. a page URL with ?page=2)
const option = (name, fallback) => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.slice(name.length + 3) : fallback;
};
const ENGINE = option('engine', 'chromium');
const LOCALE = option('locale', 'vi-VN');
const CLICK = option('click', '');
const SHOTS = args.includes('--shots');
const pagesArg = args.find(a => a.startsWith('--pages='));
const vpArg = args.find(a => a.startsWith('--vp='));

const PAGES = pagesArg ? option('pages').split(',') : [
  '/', '/books', '/books/bukhari', '/books/muslim', '/books/bukhari/chapters/1',
  '/books/bukhari/hadiths/1', '/books/muslim/hadiths/8a', '/hadiths/1', '/categories',
  '/categories/the-creed', '/categories/the-creed/hadiths', '/search?q=c%E1%BA%A7u%20nguy%E1%BB%87n',
  '/search?q=%D8%A5%D9%86%D9%85%D8%A7%20%D8%A7%D9%84%D8%A3%D8%B9%D9%85%D8%A7%D9%84', '/sources',
  '/bookmarks', '/about', '/no-such-page',
];

const UA_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const UA_ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const UA_IPAD = 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

const touch = (w, h, ua, dpr = 3) => ({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, userAgent: ua, deviceScaleFactor: dpr });
const ALL_VIEWPORTS = {
  'phone-320 (iPhone SE 1)': touch(320, 568, UA_IOS, 2),
  'phone-360 (Galaxy S)': touch(360, 780, UA_ANDROID),
  'phone-375 (iPhone SE 2/3)': touch(375, 667, UA_IOS, 2),
  'phone-390 (iPhone 14)': touch(390, 844, UA_IOS),
  'phone-412 (Pixel 7)': touch(412, 915, UA_ANDROID, 2.6),
  'phone-430 (iPhone Pro Max)': touch(430, 932, UA_IOS),
  'phone-landscape-844': touch(844, 390, UA_IOS),
  'tablet-768 (iPad Mini)': touch(768, 1024, UA_IPAD, 2),
  'tablet-820 (iPad Air)': touch(820, 1180, UA_IPAD, 2),
  'tablet-landscape-1024': touch(1024, 768, UA_IPAD, 2),
  'tablet-1024x1366 (iPad Pro)': touch(1024, 1366, UA_IPAD, 2),
  'laptop-1280': { viewport: { width: 1280, height: 800 } },
  'laptop-1366': { viewport: { width: 1366, height: 768 } },
  'desktop-1440': { viewport: { width: 1440, height: 900 } },
  'desktop-1920': { viewport: { width: 1920, height: 1080 } },
  'desktop-2560': { viewport: { width: 2560, height: 1440 } },
};
const VIEWPORTS = vpArg
  ? Object.fromEntries(Object.entries(ALL_VIEWPORTS).filter(([k]) => option('vp').split(',').some(v => k.startsWith(v))))
  : ALL_VIEWPORTS;

// Runs in the page: layout problems a reader would notice
function inspect() {
  const vw = window.innerWidth;
  const doc = document.scrollingElement || document.documentElement;
  const sel = el => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    const cls = (typeof el.className === 'string' ? el.className : '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
    if (cls.length) s += '.' + cls.join('.');
    const p = el.parentElement;
    if (p && p !== document.body) {
      const pc = (typeof p.className === 'string' ? p.className : '').trim().split(/\s+/)[0];
      s = (p.tagName.toLowerCase() + (pc ? '.' + pc : '')) + ' > ' + s;
    }
    return s;
  };
  const visible = el => {
    const st = getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden' || +st.opacity === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const insideScroller = el => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') return true;
    }
    return false;
  };
  const all = [...document.body.querySelectorAll('*')];
  const overflowing = [];
  for (const el of all) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if ((r.right > vw + 1 || r.left < -1) && !insideScroller(el) && getComputedStyle(el).position !== 'fixed') {
      overflowing.push(`${sel(el)} [${Math.round(r.left)}..${Math.round(r.right)}]`);
    }
  }
  // text clipped inside its own box (e.g. a long word with overflow hidden)
  const clipped = [];
  for (const el of all) {
    if (!visible(el) || !el.childNodes.length) continue;
    const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (!hasText) continue;
    // screen-reader-only text (the 1px visually-hidden pattern) is clipped on purpose
    const box = el.getBoundingClientRect();
    if (box.width <= 1 || box.height <= 1) continue;
    const st = getComputedStyle(el);
    if ((st.overflowX === 'hidden' || st.overflow === 'hidden') && el.scrollWidth > el.clientWidth + 2 && st.textOverflow !== 'ellipsis') {
      clipped.push(`${sel(el)} "${el.textContent.trim().slice(0, 40)}"`);
    }
  }
  const touchTargets = [];
  for (const el of document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab], [tabindex="0"]')) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    // inline links inside running text are exempt (WCAG 2.5.8)
    const inline = el.tagName === 'A' && getComputedStyle(el).display === 'inline' && el.parentElement && el.parentElement.textContent.trim().length > el.textContent.trim().length + 20;
    if (!inline && (r.width < 24 || r.height < 24)) {
      touchTargets.push(`${sel(el)} ${Math.round(r.width)}x${Math.round(r.height)} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30)}"`);
    }
  }
  const smallText = new Map();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const n = walker.currentNode;
    if (!n.textContent.trim()) continue;
    const el = n.parentElement;
    if (!el || !visible(el)) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 12) smallText.set(sel(el), fs);
  }
  const noName = [];
  for (const el of document.querySelectorAll('a[href], button, [role=button]')) {
    // hidden from assistive technology on purpose (decorative icons)
    if (!visible(el) || el.closest('[aria-hidden="true"]')) continue;
    const name = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || '').trim()
      || [...el.querySelectorAll('img[alt], svg title')].map(x => x.getAttribute('alt') || x.textContent).join('').trim();
    if (!name) noName.push(sel(el));
  }
  const imgsNoAlt = [...document.querySelectorAll('img')].filter(i => visible(i) && !i.hasAttribute('alt')).map(sel);
  const arabic = [...document.querySelectorAll('[dir=rtl], [lang=ar]')].filter(visible).slice(0, 1).map(el => {
    const st = getComputedStyle(el);
    return `${st.fontSize}/${st.lineHeight} ${st.fontFamily.split(',')[0]}`;
  });
  const body = getComputedStyle(document.body);
  const fixed = [...document.querySelectorAll('*')].filter(el => visible(el) && ['fixed', 'sticky'].includes(getComputedStyle(el).position))
    .map(el => { const r = el.getBoundingClientRect(); return `${sel(el)} ${getComputedStyle(el).position} h=${Math.round(r.height)}`; });
  return {
    scrollWidth: doc.scrollWidth, innerWidth: vw, hOverflow: doc.scrollWidth > vw + 1,
    pageHeight: doc.scrollHeight,
    overflowing: [...new Set(overflowing)].slice(0, 15),
    clipped: [...new Set(clipped)].slice(0, 10),
    touchTargets: [...new Set(touchTargets)].slice(0, 25), touchTargetCount: touchTargets.length,
    smallText: [...smallText.entries()].slice(0, 15).map(([s, f]) => `${s} ${f}px`),
    noName: [...new Set(noName)].slice(0, 10), imgsNoAlt: imgsNoAlt.slice(0, 10),
    arabic, bodyFont: `${body.fontSize} ${body.fontFamily.split(',')[0]}`, fixed: fixed.slice(0, 6),
    title: document.title, h1: [...document.querySelectorAll('h1')].map(h => h.textContent.trim().slice(0, 60)),
    lang: document.documentElement.lang,
  };
}

async function runEngine(name) {
  const browser = await pw[name].launch();
  const results = [];
  const vpEntries = Object.entries(VIEWPORTS);
  const queue = [];
  for (const [vpName, vp] of vpEntries) for (const p of PAGES) queue.push([vpName, vp, p]);
  const contexts = {};
  async function worker() {
    while (queue.length) {
      const [vpName, vp, p] = queue.shift();
      // WebKit has no isMobile emulation
      const opts = name === 'webkit' ? { ...vp, isMobile: undefined } : vp;
      contexts[vpName] = contexts[vpName] || browser.newContext({ ...opts, locale: LOCALE });
      const ctx = await contexts[vpName];
      const page = await ctx.newPage();
      const errors = [];
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
      page.on('pageerror', e => errors.push('pageerror: ' + String(e).slice(0, 200)));
      page.on('requestfailed', r => errors.push(`requestfailed ${r.url().slice(0, 100)} ${r.failure() && r.failure().errorText}`));
      page.on('response', r => { if (r.status() >= 400 && !r.url().includes('no-such-page')) errors.push(`${r.status()} ${r.url().slice(0, 120)}`); });
      let status = null;
      try {
        const res = await page.goto(BASE + p, { waitUntil: 'networkidle', timeout: 60000 });
        status = res && res.status();
        await page.evaluate(() => document.fonts && document.fonts.ready);
        let clicked;
        if (CLICK) {
          const target = page.locator(CLICK).filter({ visible: true }).first();
          clicked = (await target.count()) > 0;
          if (clicked) {
            await target.click();
            await page.waitForTimeout(600); // the menu's opening transition
            // a list the control loads when it opens (the language menu)
            await page.waitForLoadState('networkidle').catch(() => {});
          }
        }
        const data = { ...(await page.evaluate(inspect)), ...(CLICK ? { clicked } : {}) };
        if (SHOTS) {
          const dir = path.join(OUT, 'shots', name, vpName.split(' ')[0]);
          fs.mkdirSync(dir, { recursive: true });
          const file = p === '/' ? 'home' : p.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '_').slice(0, 60);
          await page.screenshot({ path: path.join(dir, file + '.png'), fullPage: true, clip: undefined, animations: 'disabled' }).catch(() => {});
        }
        results.push({ engine: name, vp: vpName, page: p, status, errors: [...new Set(errors)], ...data });
      } catch (e) {
        results.push({ engine: name, vp: vpName, page: p, status, error: String(e).slice(0, 300), errors });
      }
      await page.close();
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()]);
  await browser.close();
  return results;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const engines = ENGINE === 'both' ? ['chromium', 'webkit'] : [ENGINE];
  let all = [];
  for (const e of engines) all = all.concat(await runEngine(e));
  fs.writeFileSync(path.join(OUT, `results-${ENGINE}.json`), JSON.stringify(all, null, 1));
  // summary
  const bad = all.filter(r => r.error || r.hOverflow || r.overflowing?.length || r.clipped?.length || r.errors?.length);
  console.log(`${all.length} page loads, ${bad.length} with layout or console problems`);
  for (const r of bad) {
    console.log(`\n[${r.engine}] ${r.vp} ${r.page} status=${r.status}${r.hOverflow ? ` H-OVERFLOW scrollWidth=${r.scrollWidth}` : ''}`);
    if (r.error) console.log('  ERROR ' + r.error);
    for (const o of r.overflowing || []) console.log('  overflow ' + o);
    for (const c of r.clipped || []) console.log('  clipped ' + c);
    for (const e of r.errors || []) console.log('  console ' + e);
  }
})();
