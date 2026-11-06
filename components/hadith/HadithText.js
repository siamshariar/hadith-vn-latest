import { Fragment, useId, useState } from "react";
import Link from "next/link";
import { useLocale } from "../../contexts/LocaleContext";
import { languageName as catalogName } from "../../lib/i18n";
import { sourceLine, translatorName } from "../../lib/citation";
import { cleanText, hadithPath, isCategoryBook } from "../../lib/hadith";
import { extraTranslations, fallbackShownAsExtra, primaryTranslation } from "../../lib/translations";
import ChevronDownIcon from "../icons/ChevronDown";
import { Highlighted } from "./Highlight";
import styles from "./hadith.module.scss";

// Arabic is always present and always rendered right-to-left. It is the original:
// a browser's page translation must never replace it (translate="no").
export function ArabicText({ text, clamped = false }) {
  if (!text) return null;
  return (
    <div className={`${styles.arabic} ${clamped ? styles.clampArabic : ""}`} dir="rtl" lang="ar" translate="no">
      <Highlighted text={cleanText(text)} field="arabic" />
    </div>
  );
}

// English translations open with the narrator ("Narrated 'Umar bin
// Al-Khattab:"); like sunnah.com, that line is set apart in bold. Only the
// layout changes: the words are the source's.
const NARRATOR = /^(Narrated\s[^:\n]{1,160}):\s*/;

function TranslationText({ text, code }) {
  const clean = cleanText(text);
  const match = code === "en" ? clean.match(NARRATOR) : null;
  if (!match) return <Highlighted text={clean} field={code} />;
  return (
    <>
      <strong className={styles.narrator}>
        <Highlighted text={`${match[1]}:`} field={code} />
      </strong>
      <Highlighted text={clean.slice(match[0].length)} field={code} />
    </>
  );
}

// The name of an extra language ({ code, name, nativeName } from lib/api):
// the interface's own name for it when the catalog has one, else the API's,
// in English for an English interface and in the language itself otherwise.
export function useExtraLanguageName() {
  const { ui } = useLocale();
  return (language) => catalogName(ui, language.code, ui === "en" ? language.name : language.nativeName || language.name);
}

// A sentence of the catalog with a language name in it, the name isolated
// (<bdi>) so a right-to-left name keeps its place in a left-to-right line.
function WithLanguage({ text, name }) {
  const parts = text.split("{language}");
  return parts.map((part, index) => (
    <Fragment key={index}>
      {index > 0 && <bdi>{name}</bdi>}
      {part}
    </Fragment>
  ));
}

const SEPARATOR = (
  <span className={styles.creditSep} aria-hidden="true">
    {" · "}
  </span>
);

// " · Muhsin Khan" after the language: the translator, when the source names
// one (lib/citation translatorName); nothing otherwise.
export function Translator({ entry, first = false }) {
  const name = entry ? translatorName(entry.author, entry.edition) : null;
  if (!name) return null;
  return (
    <>
      {!first && SEPARATOR}
      <bdi className={styles.creditName}>{name}</bdi>
    </>
  );
}

// "Nguồn: HadeethEnc.com": one small line under HadeethEnc's content, as its
// terms ask (lib/citation sourceLine): under the translations of its own
// hadiths, and under its translation shown with another collection's hadith.
export function SourceLine() {
  const { t } = useLocale();
  return (
    <p className={styles.sourceLine} data-source-line="">
      {sourceLine(t)}
    </p>
  );
}

// A translation as returned by the API: { languageCode, text, author, edition, isFallback }.
// - isFallback: the English text, labelled so it never passes for the reader's language.
// - null: no translation at all; say so, the Arabic above stands alone (or
//   the extra translations below it, when the reader added some).
export function Translation({ translation, clamped = false, showNote = false, othersShown = false }) {
  const { t, lang, languageName, directionOf } = useLocale();

  if (!translation || !translation.text) {
    return (
      <p className={styles.missing} role="note">
        {othersShown ? <WithLanguage text={t("extraMissing")} name={languageName(lang)} /> : t("noTranslation")}
      </p>
    );
  }

  const code = translation.languageCode;
  const isFallback = Boolean(translation.isFallback);
  // The reader's own language, alone on the page, needs no label: only a translator, if named.
  const named = isFallback || code !== lang || othersShown;
  const credit = translation ? translatorName(translation.author, translation.edition) : null;

  return (
    <div className={styles.translation}>
      {(named || credit) && (
        <div className={styles.labelRow}>
          {isFallback ? (
            <span className={styles.fallbackBadge}>
              {code === "en" ? t("fallbackTranslation") : t("translationIn", { language: languageName(code) })}
            </span>
          ) : named ? (
            <span className={styles.label}>
              <bdi>{languageName(code)}</bdi>
            </span>
          ) : null}
          <Translator entry={translation} first={!named} />
        </div>
      )}
      {isFallback && showNote && (
        <p className={styles.fallbackNote}>{t("fallbackNote", { language: languageName(lang) })}</p>
      )}
      <div
        className={`${styles.translationText} ${clamped ? styles.clampTranslation : ""}`}
        lang={code}
        dir={directionOf(code)}
      >
        <TranslationText text={translation.text} code={code} />
      </div>
    </div>
  );
}

// What a reader sees as the primary translation (see lib/translations).
export function shownTranslation(hadith) {
  const { own, linked, fallback } = primaryTranslation(hadith);
  return linked ? { linked, own: fallback } : { linked: null, own };
}

// The topic collection's translation of wording that appears verbatim in this
// hadith (API `linkedTranslation`, from HadeethEnc). It is a different text
// from the hadith's own translation, usually shorter and without the chain of
// narrators, so it has its own block, label, note and source line, and is
// never merged with anything else. `compact` (lists): the label and a link
// only; the list says once what the label means (LinkedTranslationNote).
export function LinkedTranslation({ linked, clamped = false, compact = false }) {
  const { t, languageName, directionOf } = useLocale();
  const code = linked.languageCode;
  const label = t("topicTranslation", { language: languageName(code) });
  const source = hadithPath({ id: linked.hadithId });

  return (
    <div className={styles.linked}>
      <div className={styles.labelRow}>
        <span className={styles.linkedBadge}>{label}</span>
        {compact && (
          <Link href={source} className={styles.linkedLink}>
            {t("linkedTranslationLink")} <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>
      {/* Said before the text, so it is read as what it is. */}
      {!compact && (
        <p className={styles.linkedNote}>
          {t("topicTranslationNote")}{" "}
          <Link href={source}>
            {t("linkedTranslationLink")} <span aria-hidden="true">→</span>
          </Link>
        </p>
      )}
      <div
        className={`${styles.translationText} ${clamped ? styles.clampTranslation : ""}`}
        lang={code}
        dir={directionOf(code)}
      >
        {cleanText(linked.text)}
      </div>
      <SourceLine />
    </div>
  );
}

// One extra language under the primary translation: its own translation, the
// topic collection's translation of the same wording (labelled as such, linked
// to that hadith, with its source line), or one muted line when there is neither.
// `collapsible` (lists): on phones the text folds into a 44px row that opens
// on a tap; wider screens always show it.
export function ExtraTranslation({ slot, collapsible = false, compact = false }) {
  const { t } = useLocale();
  const nameOf = useExtraLanguageName();
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  const name = nameOf(slot);
  const entry = slot.entry;

  if (!entry) {
    return (
      <p className={styles.extraMissing} data-language={slot.code}>
        <WithLanguage text={t("extraMissing")} name={name} />
      </p>
    );
  }

  const linked = entry.linked;
  const direction = entry.direction || slot.direction || "auto";
  const source = linked ? hadithPath({ id: linked.hadithId }) : null;

  return (
    <div
      className={`${styles.extra} ${linked ? styles.linked : ""} ${collapsible ? styles.collapsible : ""}`}
      data-language={slot.code}
      data-open={open ? "true" : "false"}
    >
      <div className={styles.labelRow}>
        {linked ? (
          <span className={styles.linkedBadge}>
            {/* one inline run: as flex items, the words around the name would lose their spaces */}
            <span>
              <WithLanguage text={t("topicTranslation")} name={name} />
            </span>
          </span>
        ) : (
          <span className={styles.label}>
            <bdi>{name}</bdi>
          </span>
        )}
        <Translator entry={entry} />
        {linked && (
          <Link href={source} className={styles.linkedLink}>
            {t("linkedTranslationLink")} <span aria-hidden="true">→</span>
          </Link>
        )}
        {collapsible && (
          <button
            type="button"
            className={styles.extraToggle}
            aria-expanded={open ? "true" : "false"}
            aria-controls={bodyId}
            aria-label={open ? t("hideExtra", { language: name }) : t("showExtra", { language: name })}
            onClick={() => setOpen((value) => !value)}
          >
            <ChevronDownIcon />
          </button>
        )}
      </div>
      <div id={bodyId} className={styles.extraBody}>
        {linked && !compact && <p className={styles.linkedNote}>{t("topicTranslationNote")}</p>}
        <div className={styles.translationText} lang={slot.code} dir={direction}>
          <TranslationText text={entry.text} code={slot.code} />
        </div>
        {linked && <SourceLine />}
      </div>
    </div>
  );
}

// Said once above a list whose cards show the topic collection's linked
// translations (as the primary translation or as an extra one).
export function LinkedTranslationNote({ hadiths }) {
  const { t, languageName } = useLocale();
  const nameOf = useExtraLanguageName();
  const linked = new Map();
  (hadiths || []).forEach((hadith) => {
    const primary = shownTranslation(hadith).linked;
    if (primary && !linked.has(primary.languageCode)) linked.set(primary.languageCode, languageName(primary.languageCode));
    extraTranslations(hadith).forEach((slot) => {
      if (slot.entry && slot.entry.linked && !linked.has(slot.code)) linked.set(slot.code, nameOf(slot));
    });
  });
  if (!linked.size) return null;
  if (linked.size > 1) {
    return (
      <p className={styles.linkedListNote} role="note">
        {t("topicListNoteAny")}
      </p>
    );
  }
  const language = [...linked.values()][0];
  return (
    <p className={styles.linkedListNote} role="note">
      {t("topicListNote", { label: t("topicTranslation", { language }), language })}
    </p>
  );
}

// Cards, the detail page and the daily hadith all render translations here:
// the primary translation (own, the topic collection's linked one, or the
// labelled English fallback), then the reader's extra languages in their
// order. A hadith of the topic collection ends with its source line (`book`:
// the hadith's collection, when the hadith does not carry it); a linked
// translation carries its own.
// `compact`: the short linked-translation label of the cards;
// `collapsible`: extra languages fold on phones (lists).
export function HadithTranslations({ hadith, book, clamped = false, showNote = false, compact = false, collapsible = false }) {
  const { t, languageName } = useLocale();
  const { own, linked, fallback } = primaryTranslation(hadith);
  const extras = extraTranslations(hadith);
  const othersShown = extras.some((slot) => slot.entry);
  const source = isCategoryBook(book || hadith.book);

  const primary = linked ? (
    <div className={styles.translations}>
      <LinkedTranslation linked={linked} clamped={clamped} compact={compact} />
      {fallback && !fallbackShownAsExtra(hadith) && (
        <details className={styles.fallbackDetails}>
          <summary>{t("showFallbackTranslation", { language: languageName(fallback.languageCode) })}</summary>
          <Translation translation={fallback} />
        </details>
      )}
    </div>
  ) : (
    <Translation translation={own} clamped={clamped} showNote={showNote} othersShown={othersShown} />
  );

  if (!extras.length && !source) return primary;

  return (
    <div className={styles.stack}>
      {primary}
      {extras.map((slot) => (
        <ExtraTranslation key={slot.code} slot={slot} collapsible={collapsible} compact={compact} />
      ))}
      {source && <SourceLine />}
    </div>
  );
}
