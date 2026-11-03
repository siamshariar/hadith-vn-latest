// Plain-text citation and copy texts for a hadith, with the same labels as
// the page: a fallback translation stays marked as such, a translation from
// the topic collection is said to be one, grades keep their grader names, the
// translator is named when the source names one ("Bản dịch tiếng Anh · Muhsin
// Khan"), and a text with HadeethEnc's content ends with its source line. Used
// by the copy menu.

import { server } from "./config";
import { site } from "./sites";
import {
  HADEETHENC_SOURCE,
  UNASSIGNED_CHAPTER,
  citablePath,
  citation,
  cleanText,
  hadithPath,
  isCategoryBook,
  namedGrades,
  shortBookName,
} from "./hadith";
import { extraTranslations, fallbackShownAsExtra, primaryTranslation } from "./translations";

// "Book 1, Hadith 3" (API inBookReference: { chapterNo, position }).
export function inBookText(inBook, t) {
  if (!inBook || inBook.position == null) return null;
  if (inBook.chapterNo === UNASSIGNED_CHAPTER) return t("inBookUnassigned", { position: inBook.position });
  return t("inBookValue", { chapter: inBook.chapterNo, position: inBook.position });
}

// "Sahih al-Bukhari 3"; records without a citable number say so.
export function referenceText(hadith, book, t) {
  if (hadith.referenceNumber) return citation(hadith, book);
  return `${shortBookName(book)} (${t("noReferenceNumber")})`;
}

// Every translation on the page, in the order shown (see
// components/hadith/HadithText): the primary one (the hadith's own, the
// English fallback, or the topic collection's linked one with the
// collection's English folded under it), then the reader's extra languages
// that have a text. Each item: { entry, code, primary, fallback, linked,
// language }, where `language` is the API's { name, nativeName } of an extra
// language.
export function shownTranslations(hadith) {
  const { own, linked, fallback } = primaryTranslation(hadith);
  const items = [];
  if (linked) items.push({ entry: linked, code: linked.languageCode, primary: true, linked: true });
  if (own) items.push({ entry: own, code: own.languageCode, primary: true, fallback: Boolean(own.isFallback) });
  if (linked && fallback && !fallbackShownAsExtra(hadith)) {
    items.push({ entry: fallback, code: fallback.languageCode, primary: true, fallback: true });
  }
  extraTranslations(hadith).forEach((slot) => {
    if (slot.entry) {
      items.push({ entry: slot.entry, code: slot.code, primary: false, linked: Boolean(slot.entry.linked), language: slot });
    }
  });
  return items;
}

// "Bản dịch tiếng Anh" (the English fallback), "Bản dịch বাংলা", "Bản dịch
// tiếng Việt từ bộ hadith theo chủ đề". `languageName(code, fallback)` is the locale's.
export function translationItemLabel(item, t, languageName) {
  const name = item.language ? languageName(item.code, item.language) : languageName(item.code);
  if (item.linked) return t("topicTranslation", { language: name });
  if (item.fallback && item.code === "en") return t("fallbackTranslation");
  return t("translationIn", { language: name });
}

// The translator, when the source names one: `author` as the source gives it
// with `edition` (a translation's { code, source }, or an /editions item),
// unless that name is not a translator's. HadeethEnc gives its own site, and
// the forty-hadith editions give their compiler, whose name is the
// collection's (Imam Nawawi for eng-nawawi).
export function translatorName(author, edition) {
  const { code = "", source } = edition || {};
  if (!author || source === "hadeethenc") return null;
  const collection = String(code).split("-").pop();
  const letters = String(author).toLowerCase().replace(/[^a-z]/g, "");
  return collection && letters.includes(collection) ? null : author;
}

// "Nguồn: HadeethEnc.com", the one line HadeethEnc's terms ask for wherever
// its content is shown (lib/hadith HADEETHENC_SOURCE).
export const sourceLine = (t) => t("sourceLine", { source: HADEETHENC_SOURCE });

// Whether a hadith shows HadeethEnc's content: its own hadith, or its
// translation of the same wording under another collection's hadith.
const showsHadeethEnc = (hadith, book) =>
  isCategoryBook(book || hadith.book) || shownTranslations(hadith).some((item) => item.linked);

// "Bản dịch tiếng Anh · Muhsin Khan": the label, then the translator when the source names one.
function creditText(item, t, languageName) {
  const translator = translatorName(item.entry.author, item.entry.edition);
  return [translationItemLabel(item, t, languageName), translator].filter(Boolean).join(" · ");
}

// The citable URL (/books/{book}/hadiths/{number}), also the canonical one.
export const permalink = (hadith, book) => `${server}${citablePath(hadith, book)}`;

// "Báo lỗi": an e-mail to the site's contact address with the citation and
// permalink already filled in.
export function reportErrorHref(hadith, book, t) {
  const reference = referenceText(hadith, book, t);
  const subject = t("reportErrorSubject", { citation: reference });
  const body = t("reportErrorBody", { citation: reference, url: permalink(hadith, book) });
  return `mailto:${site.contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// Reference, in-book reference, each translation shown with its translator
// (with the topic collection's hadith for a linked one), the source line when
// HadeethEnc's content is among them, and the permalink.
export function buildCitation(hadith, book, { t, languageName }) {
  const lines = [referenceText(hadith, book, t)];
  const inBook = isCategoryBook(book) ? null : inBookText(hadith.inBookReference, t);
  if (inBook) lines.push(t("labelValue", { label: t("inBookReference"), value: inBook }));

  shownTranslations(hadith).forEach((item) => {
    const { entry } = item;
    let line = creditText(item, t, languageName);
    const linkedId = item.linked ? (entry.linked ? entry.linked.hadithId : entry.hadithId) : null;
    if (linkedId) line += ` - ${server}${hadithPath({ id: linkedId })}`;
    lines.push(line);
  });
  if (showsHadeethEnc(hadith, book)) lines.push(sourceLine(t));
  lines.push(permalink(hadith, book));
  return lines.join("\n");
}

function translationParts(hadith, { t, languageName }) {
  return shownTranslations(hadith).map((item) => `[${creditText(item, t, languageName)}]\n${cleanText(item.entry.text)}`);
}

// "Copy tiếng Ả Rập": the reference, the Arabic (with the source line for
// HadeethEnc's hadiths) and the permalink.
export function buildArabic(hadith, book, { t }) {
  const parts = [referenceText(hadith, book, t)];
  if (hadith.arabic) parts.push(`[${t("arabicText")}]\n${cleanText(hadith.arabic)}`);
  if (isCategoryBook(book)) parts.push(sourceLine(t));
  parts.push(permalink(hadith, book));
  return parts.join("\n\n");
}

// "Copy bản dịch": the reference, every translation shown, labelled, the
// source line when HadeethEnc's content is among them, and the permalink.
export function buildTranslations(hadith, book, locale) {
  const parts = [referenceText(hadith, book, locale.t), ...translationParts(hadith, locale)];
  if (showsHadeethEnc(hadith, book)) parts.push(sourceLine(locale.t));
  parts.push(permalink(hadith, book));
  return parts.join("\n\n");
}

// Whether there is any translation to copy.
export const hasTranslations = (hadith) => shownTranslations(hadith).length > 0;

// "Copy tất cả": reference, title, Arabic, the translations, grades, the
// source line when HadeethEnc's content is among them, permalink.
export function buildText(hadith, book, locale) {
  const { t } = locale;
  const parts = [referenceText(hadith, book, t)];
  if (hadith.title) parts.push(cleanText(hadith.title));
  if (hadith.arabic) parts.push(`[${t("arabicText")}]\n${cleanText(hadith.arabic)}`);
  parts.push(...translationParts(hadith, locale));

  const grades = [];
  if (hadith.gradeText) grades.push(hadith.gradeText);
  namedGrades(hadith, book).forEach((grade) => grades.push(`${grade.graderName}: ${grade.grade}`));
  if (grades.length) parts.push(t("labelValue", { label: t("grades"), value: grades.join("; ") }));

  if (showsHadeethEnc(hadith, book)) parts.push(sourceLine(t));
  parts.push(permalink(hadith, book));
  return parts.join("\n\n");
}
