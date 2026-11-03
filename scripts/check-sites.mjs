#!/usr/bin/env node
// Checks config/countries.json against a running Quran API, for every country or the
// ones named:
//
//   npm run check:sites                 every country
//   npm run check:sites -- bd vn        only these
//   API=https://api.alquranarabia.com/api npm run check:sites
//
// For each country:
//   - the entry has name, localization, language, ui and ogLocale (ll_CC);
//   - /api/localizations maps its `localization` to this country (country.code);
//   - /api/hadith/home/localizations/{localization} answers in its `language`, and so
//     does /home/localizations/{language} (what the site sends);
//   - which interface it gets for its own language: its `ui` catalog (lib/locales), or
//     English. A reader who picks another language gets that language's catalog when there
//     is one (lib/language.js interfaceFor).
// An international entry (ac: "international": true) has no localization and no country in
// the Quran database: only its default `language` is checked, and its interface follows the
// reader's language among the catalogs.
// Exits 1 on any mismatch, 2 when the API cannot be reached.
//
// API: the Quran API base (default NEXT_PUBLIC_API_BASE_URL, else
// http://127.0.0.1:8090/api); a value ending in /hadith (the e2e suite's) is accepted.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

process.removeAllListeners("warning");
process.on("warning", (warning) => {
  if (warning.code !== "MODULE_TYPELESS_PACKAGE_JSON") console.warn(warning.stack || String(warning));
});

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const countries = JSON.parse(readFileSync(path.join(root, "config", "countries.json"), "utf8"));
const { RTL_INTERFACES, hasCatalog, interfaceLanguageFor, interfaceLanguages, isRtlLanguage } = await import(
  pathToFileURL(path.join(root, "lib", "i18n.js")).href
);

const API = (process.env.API || process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8090/api")
  .replace(/\/+$/, "")
  .replace(/\/hadith$/, "");
const TIMEOUT = 20000;
const FIELDS = ["name", "localization", "language", "ui", "ogLocale"];
const INTERNATIONAL_FIELDS = ["name", "language", "ui", "ogLocale"];

const all = Object.keys(countries).filter((key) => key !== "_comment");
const wanted = process.argv.slice(2);
const unknown = wanted.filter((code) => !all.includes(code));
if (unknown.length) {
  console.error(`Not in config/countries.json: ${unknown.join(", ")}. Countries: ${all.join(", ")}.`);
  process.exit(1);
}

class Unreachable extends Error {}

async function getJson(pathname) {
  const url = `${API}${pathname}`;
  let response;
  try {
    response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT) });
  } catch (error) {
    throw new Unreachable(`${url}: ${error.cause ? error.cause.code || error.cause.message : error.message}`);
  }
  if (!response.ok) throw new Error(`${url} answered HTTP ${response.status}`);
  return response.json();
}

function interfaceNote(ui) {
  const used = interfaceLanguageFor(ui);
  if (used === ui) return ui;
  if (isRtlLanguage(ui) && !RTL_INTERFACES) return `en (no right-to-left interface yet${hasCatalog(ui) ? "" : `; no ${ui} catalog`})`;
  return `en (no ${ui} catalog)`;
}

async function checkCountry(code, localizations) {
  const entry = countries[code];
  const international = entry.international === true;
  const problems = [];
  const missing = (international ? INTERNATIONAL_FIELDS : FIELDS).filter((field) => !entry[field]);
  if (missing.length) problems.push(`no ${missing.join(", ")}`);
  if (entry.ogLocale && !/^[a-z]{2,3}_[A-Z]{2}$/.test(entry.ogLocale)) problems.push(`ogLocale "${entry.ogLocale}" is not ll_CC`);

  if (international && entry.localization) problems.push("an international entry has no localization");
  if (entry.localization && !international) {
    const localization = localizations.find((item) => item.code === entry.localization);
    const country = localization && localization.country ? localization.country.code : null;
    if (!localization) problems.push(`/localizations has no "${entry.localization}"`);
    else if (country !== code) problems.push(`/localizations maps "${entry.localization}" to country "${country}", not "${code}"`);
  }

  if (entry.language) {
    const segments = [...new Set([entry.localization, entry.language].filter(Boolean))];
    for (const segment of segments) {
      try {
        const home = await getJson(`/hadith/home/localizations/${encodeURIComponent(segment)}`);
        const answered = home && home.language ? home.language.code : null;
        if (answered !== entry.language) {
          problems.push(`/hadith/home/localizations/${segment} answers in "${answered}", not "${entry.language}"`);
        }
      } catch (error) {
        if (error instanceof Unreachable) throw error;
        problems.push(error.message);
      }
    }
  }

  const ui = international ? `the reader's language (${interfaceLanguages.join(", ")})` : entry.ui ? interfaceNote(entry.ui) : "?";
  return { code, entry, problems, ui };
}

let localizations;
try {
  localizations = await getJson("/localizations");
} catch (error) {
  console.error(`The API cannot be reached: ${error.message}`);
  process.exit(2);
}

console.log(`API ${API}\n`);
const rows = [];
try {
  for (const code of wanted.length ? wanted : all) rows.push(await checkCountry(code, localizations));
} catch (error) {
  console.error(`The API cannot be reached: ${error.message}`);
  process.exit(2);
}

const header = ["country", "localization", "language", "interface", "result"];
const table = rows.map((row) => [
  row.code,
  row.entry.international === true ? "(international)" : row.entry.localization || "?",
  row.entry.language || "?",
  row.ui,
  row.problems.length ? "MISMATCH" : "ok",
]);
const widths = header.map((title, i) => Math.max(title.length, ...table.map((cells) => cells[i].length)));
const line = (cells) => cells.map((cell, i) => cell.padEnd(widths[i])).join("  ").trimEnd();
console.log(line(header));
table.forEach((cells) => console.log(line(cells)));

const failed = rows.filter((row) => row.problems.length);
failed.forEach((row) => row.problems.forEach((problem) => console.log(`\n${row.code}: ${problem}`)));

const withCatalog = rows
  .filter((row) => row.entry.international !== true && interfaceLanguageFor(row.entry.ui) === row.entry.ui)
  .map((row) => row.code);
console.log(`\nInterface catalog of their own: ${withCatalog.length ? withCatalog.join(", ") : "none"}; the others use English.`);
console.log(`A reader who picks another language gets its interface on every site: ${interfaceLanguages.join(", ")}.`);
if (failed.length) {
  console.log(`${failed.length === 1 ? "1 country does" : `${failed.length} countries do`} not match the API.`);
  process.exit(1);
}
console.log(rows.length === 1 ? "It matches the API." : `All ${rows.length} countries match the API.`);
