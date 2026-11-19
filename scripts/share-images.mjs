// The share cards (og:image) of the editions: 1200 x 630 PNG, the size Facebook, X, Zalo,
// Telegram and WhatsApp show large. Each is the edition's logo (else its name as a wordmark),
// its heading and tagline from its interface catalog, and its accent ribbon at the foot, on
// white. Drawn by Chromium with the site's own fonts, so every script shapes right.
//   PLAYWRIGHT_CORE=<path to playwright-core> node scripts/share-images.mjs [vn bd ac default]
// Writes public/img/share/<code>.png ("default": the edition-less card, lib/sites DEFAULTS: the
// name only). An edition gets its own card when it launches: add it here and its shareImage.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const pw = require(process.env.PLAYWRIGHT_CORE || "playwright-core");
process.removeAllListeners("warning");
const i18n = await import(pathToFileURL(path.join(root, "lib", "i18n.js")).href);
await i18n.loadCatalogs();
const countries = JSON.parse(fs.readFileSync(path.join(root, "config", "countries.json"), "utf8"));

const NEUTRAL_RIBBON = ["#466548", "#7c9a6e"];
const font = (file) => `data:font/woff2;base64,${fs.readFileSync(path.join(root, "styles", "fonts", file)).toString("base64")}`;
const image = (file) => `data:image/png;base64,${fs.readFileSync(path.join(root, "public", file)).toString("base64")}`;
const escape = (text) => String(text).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function card(code) {
  const entry = code === "default" ? { ui: "en", language: "en" } : countries[code];
  if (!entry) throw new Error(`no edition "${code}" in config/countries.json`);
  const ui = i18n.interfaceLanguageFor(entry.ui || "en");
  const siteName = entry.siteName || "Hadith";
  const heading = entry.international
    ? i18n.translate(ui, "homeTitleAll", { site: siteName }).replace(`${siteName} – `, "")
    : i18n.translate(ui, "siteHeading", { siteLanguage: i18n.languageName(ui, entry.language) });
  const tagline = i18n.translate(ui, "siteTagline");
  const stops = Array.isArray(entry.accent) && entry.accent.length > 1 ? entry.accent : NEUTRAL_RIBBON;
  // the edition-less card names no language: it stands in for any edition without its own
  const text = code === "default" ? "" : `<h1>${escape(heading)}</h1><p>${escape(tagline)}</p>`;
  const mark = entry.logo
    ? `<img class="logo" src="${image(entry.logo)}" alt="">`
    : `<div class="wordmark">${escape(siteName)}</div>`;
  return {
    ui,
    html: `<!doctype html><meta charset="utf-8"><style>
@font-face { font-family: Roboto; font-weight: 400; src: url(${font("roboto/Roboto-Regular.woff2")}); }
@font-face { font-family: Roboto; font-weight: 500; src: url(${font("roboto/Roboto-Medium.woff2")}); }
@font-face { font-family: Roboto; font-weight: 700; src: url(${font("roboto/Roboto-Bold.woff2")}); }
@font-face { font-family: Bengali; font-weight: 400 700; src: url(${font("noto-sans-bengali/NotoSansBengali-Variable.woff2")}); }
html, body { margin: 0; }
body { width: 1200px; height: 630px; display: flex; flex-direction: column; background: #ffffff; color: #2e3031;
  font-family: Roboto, Bengali, sans-serif; }
main { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 36px; padding: 0 120px; text-align: center; }
.logo { width: 600px; height: auto; }
.wordmark { color: #1a3a1f; font-size: 120px; font-weight: 700; line-height: 1; }
h1 { margin: 0; color: #2e3031; font-size: 44px; font-weight: 500; line-height: 1.25; }
p { margin: 0; max-width: 900px; color: #5f666d; font-size: 30px; font-weight: 400; line-height: 1.45; }
.ribbon { height: 14px; background: linear-gradient(90deg, ${stops.join(", ")}); }
</style><body><main>${mark}${text}</main><div class="ribbon"></div></body>`,
  };
}

const codes = process.argv.slice(2).length ? process.argv.slice(2) : ["vn", "bd", "ac", "default"];
const out = path.join(root, "public", "img", "share");
fs.mkdirSync(out, { recursive: true });
const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const code of codes) {
  const { html, ui } = card(code);
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const file = path.join(out, `${code}.png`);
  await page.screenshot({ path: file });
  console.log(`${path.relative(root, file)} (${ui}, ${Math.round(fs.statSync(file).size / 1024)} KB)`);
}
await browser.close();
