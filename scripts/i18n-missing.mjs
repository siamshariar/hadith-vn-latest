#!/usr/bin/env node
// Lists the interface strings missing from each catalog (every one registered in
// lib/locales/index.js, and English), the empty ones, and the ones whose {placeholders}
// differ from the English string. Plural forms (`${key}_one`, `${key}_few` ...: lib/i18n
// translate) are optional, but a key that has some needs one for each plural category of
// the catalog's locale but "other", which the key itself gives. Exits 1 when it finds any.
//
//   npm run i18n:missing            every catalog
//   npm run i18n:missing -- bn      only bn
//
// The keys expected are those of every catalog together, so a key added to one catalog
// only is reported as missing from the others. Needs Node 20.19+ or 22.12+ (it imports
// lib/i18n.js, an ES module in a package without "type": "module").
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Node detects lib/*.js as ES modules from their syntax and warns about it; that warning
// says nothing about the catalogs.
process.removeAllListeners("warning");
process.on("warning", (warning) => {
  if (warning.code !== "MODULE_TYPELESS_PACKAGE_JSON") console.warn(warning.stack || String(warning));
});

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { PLURAL_FORMS, loadCatalogs } = await import(pathToFileURL(path.join(root, "lib", "i18n.js")).href);
const loaded = await loadCatalogs();
const catalogs = Object.fromEntries(Object.entries(loaded).map(([code, catalog]) => [code, catalog.strings]));

const codes = Object.keys(catalogs);
const wanted = process.argv.slice(2);
const unknown = wanted.filter((code) => !codes.includes(code));
if (unknown.length) {
  console.error(`No catalog for ${unknown.join(", ")}. Catalogs: ${codes.join(", ")}.`);
  process.exit(2);
}

const PLURAL = new RegExp(`^(.+)_(${PLURAL_FORMS.join("|")})$`);
const everyKey = [...new Set(codes.flatMap((code) => Object.keys(catalogs[code])))];
// "hadithCount_one" -> "hadithCount" when that key exists; null for an ordinary key
const pluralOf = (key) => {
  const match = key.match(PLURAL);
  return match && everyKey.includes(match[1]) ? match[1] : null;
};
const allKeys = everyKey.filter((key) => !pluralOf(key));
const placeholders = (text) => [...new Set(String(text).match(/\{[A-Za-z0-9_]+\}/g) || [])].sort().join(" ");
const reference = catalogs.en;

let problems = 0;
for (const code of wanted.length ? wanted : codes) {
  const catalog = catalogs[code];
  const missing = allKeys.filter((key) => !Object.prototype.hasOwnProperty.call(catalog, key));
  const empty = Object.keys(catalog).filter((key) => typeof catalog[key] !== "string" || !catalog[key].trim());
  const mismatched = Object.keys(catalog).filter((key) => {
    const base = pluralOf(key) || key;
    if (code === "en" && base === key) return false;
    return base in reference && typeof catalog[key] === "string" && placeholders(catalog[key]) !== placeholders(reference[base]);
  });
  // keys with plural forms: one for each category of the locale but "other"
  const categories = new Intl.PluralRules(loaded[code].locale).resolvedOptions().pluralCategories.filter((form) => form !== "other");
  const forms = [...new Set(Object.keys(catalog).map(pluralOf).filter(Boolean))];
  const plurals = forms
    .map((key) => [key, categories.filter((form) => !(`${key}_${form}` in catalog))])
    .filter(([, lacking]) => lacking.length);
  problems += missing.length + empty.length + mismatched.length + plurals.length;

  const total = Object.keys(catalog).filter((key) => !pluralOf(key)).length;
  const status = missing.length + empty.length + mismatched.length + plurals.length ? "" : " - complete";
  console.log(`${code}: ${total} of ${allKeys.length} keys${forms.length ? `, plural forms for ${forms.length}` : ""}${status}`);
  missing.forEach((key) => {
    const example = reference[key] ?? catalogs[codes.find((other) => key in catalogs[other])][key];
    console.log(`  missing      ${key}  (en: ${JSON.stringify(example)})`);
  });
  empty.forEach((key) => console.log(`  empty        ${key}`));
  mismatched.forEach((key) =>
    console.log(`  placeholders ${key}: has "${placeholders(catalog[key])}", en has "${placeholders(reference[pluralOf(key) || key])}"`)
  );
  plurals.forEach(([key, lacking]) => console.log(`  plural forms ${key}: no ${lacking.map((form) => `${key}_${form}`).join(", ")}`));
}

if (problems) {
  console.log(`\n${problems} problem(s). Missing strings fall back to English in the interface.`);
  process.exit(1);
}
