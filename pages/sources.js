import Link from "next/link";
import { server, shareImage } from "../lib/config";
import { getBooks, getEditions, getLanguages, loadStatic } from "../lib/api";
import { translatorName } from "../lib/citation";
import { bookPath, booksBySlug, shortBookName } from "../lib/hadith";
import { DEFAULT_LANGUAGE, compareLanguages, interfaceFor } from "../lib/language";
import { site } from "../lib/sites";
import { useLocale } from "../contexts/LocaleContext";
import Meta from "../components/core/meta";
import Breadcrumbs from "../components/core/breadcrumbs";
import { SourceLine } from "../components/hadith/HadithText";
import Layout from "../components/layouts/LayoutSecondary";
import { sidebarCategoriesData } from "../components/sidebar/data";
import styles from "../components/content/Page.module.scss";

// The site's data & method page (still at /sources): its collections, how much of them
// reads in the deployment's content language (on an international site the reader's), how
// translations and grades are shown, and the translators by language. It names no source:
// the topic collection's description carries HadeethEnc's source line, as its terms ask.
// Prose in each interface language with a catalog (English when there is none); figures
// come from the API. {site} is the site's name, {language} the language described.
const COPY = {
  vi: {
    title: "Dữ liệu & phương pháp",
    intro:
      "Những gì {site} có và cách hiển thị: các bộ sưu tập, mức độ đã được dịch, cách chọn bản dịch và đánh giá độ xác thực, và người dịch.",
    collectionsTitle: "Các bộ sưu tập",
    canonicalTitle: "Các bộ sưu tập kinh điển",
    canonical:
      "Văn bản tiếng Ả Rập của từng hadith, đánh số theo cách trích dẫn, kèm bản dịch và, khi có, đánh giá độ xác thực của các học giả có tên.",
    topics:
      "Hadith được sắp xếp theo chủ đề trong một cây danh mục, mỗi hadith kèm giải thích, bài học và nghĩa của từ, được dịch sang nhiều ngôn ngữ, gồm {language}.",
    topicLanguages: (count) => `Bản dịch bằng ${count} ngôn ngữ.`,
    rulesTitle: "Phương pháp",
    rules: [
      "Không dùng máy dịch. Mọi bản dịch hiển thị đều là bản dịch đã công bố, giữ nguyên văn, và ghi tên người dịch khi ấn phẩm có ghi.",
      "Khi một hadith chưa có bản dịch bằng ngôn ngữ bạn chọn, bản dịch tiếng Anh được hiển thị kèm nhãn rõ ràng; nếu không có cả bản tiếng Anh, chỉ hiển thị nguyên văn tiếng Ả Rập.",
      "Liên kết giữa các bộ sưu tập chỉ được tạo khi lời văn tiếng Ả Rập trùng khớp chính xác. Hadith chưa có bản dịch riêng có thể được đọc qua bản dịch của bộ hadith theo chủ đề cho cùng lời văn; bản dịch đó được ghi nhãn riêng, không bao giờ trình bày như bản dịch của chính hadith.",
      "Đánh giá độ xác thực chỉ hiển thị kèm tên người đánh giá, đúng như đã được đưa ra. Sahih al-Bukhari, Sahih Muslim và ba bộ 40 hadith không có đánh giá theo từng hadith, nên ở đó không có đánh giá nào. Mỗi hadith của bộ hadith theo chủ đề mang một đánh giá do chính bộ này đưa ra.",
      "Số hadith là số tham chiếu dùng để trích dẫn; với Sahih Muslim là số Abdul-Baqi (8, 8a, 8.01 …). “Vị trí trong sách” là thứ tự của hadith trong chương, theo thứ tự của bộ sưu tập.",
    ],
    coverageTitle: "Mức độ có {language}",
    coverage: ({ language, topic, topicOwn, topicTotal, bookOwn, linked, readable, total, linkedBooks }) =>
      [
        `${topicOwn} trong ${topicTotal} hadith của ${topic} có bản dịch ${language}.`,
        linked && `Thêm ${linked} hadith trong các bộ sưu tập khác đọc được qua bản dịch của bộ này cho phần lời văn trùng khớp${linkedBooks ? ` (${linkedBooks})` : ""}.`,
        bookOwn
          ? `Các bộ sưu tập khác có ${bookOwn} hadith bằng ${language} từ bản dịch riêng của chúng.`
          : `Các bộ sưu tập kinh điển chưa có bản dịch ${language} riêng: với các hadith đó, nguyên văn tiếng Ả Rập và bản dịch tiếng Anh được hiển thị, có ghi nhãn.`,
        `Tổng cộng ${readable} trong ${total} hadith đọc được bằng ${language}.`,
      ]
        .filter(Boolean)
        .join(" "),
    translatorsTitle: "Người dịch theo ngôn ngữ",
    translatorsIntro: "Mọi bản dịch theo ngôn ngữ: bộ sưu tập, người dịch khi ấn phẩm có ghi tên, và số hadith đã dịch.",
    language: "Ngôn ngữ",
    collection: "Bộ sưu tập",
    translator: "Người dịch",
    count: "Số hadith",
    unavailable: "Không tải được danh sách bản dịch lúc này.",
  },
  en: {
    title: "Data & method",
    intro:
      "What {site} contains and how it is shown: its collections, how much of them is translated, how translations and grades are chosen, and who translated them.",
    collectionsTitle: "Collections",
    canonicalTitle: "The canonical collections",
    canonical:
      "The Arabic text of every hadith, numbered as it is cited, with translations and, where they exist, grades by named scholars.",
    topics:
      "Hadiths arranged by topic in a tree of categories, each with its explanation, benefits and word meanings, translated into many languages, {language} included.",
    topicLanguages: (count) => `Translations in ${count} languages.`,
    rulesTitle: "Method",
    rules: [
      "No machine translation. Every translation shown is a published one, taken word for word, and its translator is named when the publication names one.",
      "When a hadith has no translation in the chosen language, the English translation is shown and clearly labelled; without English either, only the Arabic is shown.",
      "Collections are linked only when the Arabic wording matches exactly. A hadith with no translation of its own can be read through the topic collection's translation of the same wording, labelled as such and never presented as the hadith's own translation.",
      "Grades are shown only with the grader's name, exactly as they were given. Sahih al-Bukhari, Sahih Muslim and the three forty-hadith books have no per-hadith grades, so none are shown there. Each hadith of the topic collection carries the one grade the collection gives it.",
      "Hadith numbers are the reference numbers people cite; for Sahih Muslim the Abdul-Baqi numbers (8, 8a, 8.01 …). The in-book reference is the hadith's position in its book, in the collection's order.",
    ],
    coverageTitle: "{language} coverage",
    coverage: ({ language, topic, topicOwn, topicTotal, bookOwn, linked, readable, total, linkedBooks }) =>
      [
        `${topicOwn} of the ${topicTotal} hadiths in ${topic} have a ${language} translation.`,
        linked && `Another ${linked} hadiths in other collections can be read through its translation of a matching wording${linkedBooks ? ` (${linkedBooks})` : ""}.`,
        bookOwn
          ? `The other collections have ${bookOwn} hadiths in ${language} from translations of their own.`
          : `The canonical collections have no ${language} translation of their own: for those hadiths the Arabic and the labelled English translation are shown.`,
        `In all, ${readable} of ${total} hadiths can be read in ${language}.`,
      ]
        .filter(Boolean)
        .join(" "),
    translatorsTitle: "Translators by language",
    translatorsIntro: "Every translation by language: the collection, its translator when the publication names one, and the number of hadiths translated.",
    language: "Language",
    collection: "Collection",
    translator: "Translator",
    count: "Hadiths",
    unavailable: "The list of translations could not be loaded right now.",
  },
  // Drafted by Claude (AI), needs review by a native Bengali speaker before
  // launch, like lib/locales/bn.js (same terms).
  bn: {
    title: "তথ্য ও পদ্ধতি",
    intro:
      "{site}-এ কী আছে এবং তা কীভাবে দেখানো হয়: গ্রন্থসমূহ, এগুলোর কতটা অনূদিত, অনুবাদ ও হাদিসের মান কীভাবে বাছাই করা হয় এবং কারা অনুবাদ করেছেন।",
    collectionsTitle: "গ্রন্থসমূহ",
    canonicalTitle: "প্রধান হাদিস গ্রন্থসমূহ",
    canonical:
      "প্রতিটি হাদিসের আরবি পাঠ, উদ্ধৃতিতে ব্যবহৃত নম্বরসহ, সঙ্গে অনুবাদ এবং যেখানে আছে সেখানে নামসহ আলেমদের দেওয়া মান।",
    topics:
      "বিষয় অনুযায়ী শ্রেণিবিন্যাসে সাজানো হাদিস, প্রতিটির ব্যাখ্যা, শিক্ষা ও শব্দার্থসহ, {language}সহ বহু ভাষায় অনূদিত।",
    topicLanguages: (count) => `${count}টি ভাষায় অনুবাদ।`,
    rulesTitle: "পদ্ধতি",
    rules: [
      "কোনো যন্ত্র-অনুবাদ নেই। দেখানো প্রতিটি অনুবাদ প্রকাশিত অনুবাদ থেকে হুবহু নেওয়া, এবং প্রকাশনায় অনুবাদকের নাম থাকলে তা উল্লেখ করা হয়।",
      "কোনো হাদিসের অনুবাদ বাছাই করা ভাষায় না থাকলে ইংরেজি অনুবাদ স্পষ্ট লেবেলসহ দেখানো হয়; ইংরেজিও না থাকলে শুধু আরবি পাঠ দেখানো হয়।",
      "আরবি শব্দাবলি হুবহু মিললেই কেবল গ্রন্থগুলোর মধ্যে সংযোগ করা হয়। নিজস্ব অনুবাদ নেই এমন হাদিস একই শব্দাবলির বিষয়ভিত্তিক সংকলনের অনুবাদের মাধ্যমে পড়া যায়; তা আলাদা লেবেলসহ দেখানো হয়, কখনো হাদিসটির নিজস্ব অনুবাদ হিসেবে নয়।",
      "হাদিসের মান কেবল মান-নির্ধারকের নামসহ দেখানো হয়, ঠিক যেভাবে তা দেওয়া হয়েছে। Sahih al-Bukhari, Sahih Muslim এবং চল্লিশ হাদিসের তিনটি সংকলনে প্রতিটি হাদিসের আলাদা মান নেই, তাই সেখানে কোনো মান দেখানো হয় না। বিষয়ভিত্তিক সংকলনের প্রতিটি হাদিসে সংকলনটির দেওয়া একটি মান থাকে।",
      "হাদিস নম্বর হলো উদ্ধৃতিতে ব্যবহৃত রেফারেন্স নম্বর; Sahih Muslim-এর ক্ষেত্রে আবদুল বাকির নম্বর (8, 8a, 8.01 …)। “গ্রন্থে অবস্থান” হলো গ্রন্থের ক্রম অনুযায়ী অধ্যায়ে হাদিসটির অবস্থান।",
    ],
    coverageTitle: "{language} ভাষায় প্রাপ্যতা",
    coverage: ({ language, topic, topicOwn, topicTotal, bookOwn, linked, readable, total, linkedBooks }) =>
      [
        `${topic}-এর ${topicTotal}টি হাদিসের মধ্যে ${topicOwn}টির ${language} অনুবাদ আছে।`,
        linked && `অন্যান্য গ্রন্থের আরও ${linked}টি হাদিস মিলে যাওয়া শব্দাবলির এই সংকলনের অনুবাদের মাধ্যমে পড়া যায়${linkedBooks ? ` (${linkedBooks})` : ""}।`,
        bookOwn
          ? `অন্যান্য গ্রন্থের ${bookOwn}টি হাদিস সেগুলোর নিজস্ব ${language} অনুবাদে পড়া যায়।`
          : `প্রধান গ্রন্থগুলোর নিজস্ব কোনো ${language} অনুবাদ নেই: সেসব হাদিসে আরবি পাঠ ও লেবেলসহ ইংরেজি অনুবাদ দেখানো হয়।`,
        `সব মিলিয়ে ${total}টি হাদিসের মধ্যে ${readable}টি ${language} ভাষায় পড়া যায়।`,
      ]
        .filter(Boolean)
        .join(" "),
    translatorsTitle: "ভাষা অনুযায়ী অনুবাদক",
    translatorsIntro: "ভাষা অনুযায়ী প্রতিটি অনুবাদ: গ্রন্থ, প্রকাশনায় নাম থাকলে অনুবাদক, এবং অনূদিত হাদিসের সংখ্যা।",
    language: "ভাষা",
    collection: "গ্রন্থ",
    translator: "অনুবাদক",
    count: "হাদিস",
    unavailable: "এই মুহূর্তে অনুবাদের তালিকা লোড করা যায়নি।",
  },
};

export default function Sources({ books, coverage, translators, topicLanguages }) {
  const { t, ui, formatNumber, languageName } = useLocale();
  const base = COPY[ui] || COPY.en;
  // the language described (the deployment's), as the interface names it in a sentence
  const language = languageName((coverage && coverage.language && coverage.language.code) || DEFAULT_LANGUAGE, coverage && coverage.language);
  const copy = {
    ...base,
    intro: base.intro.replace("{site}", site.siteName),
    topics: base.topics.replace("{language}", language),
    // capitalized only where it opens the title ("Vietnamese coverage")
    coverageTitle: base.coverageTitle.replace("{language}", (_, offset) =>
      offset === 0 ? language.charAt(0).toUpperCase() + language.slice(1) : language
    ),
  };
  const canonicalBooks = (books || []).filter((book) => book.source !== "hadeethenc");
  const topic = (books || []).find((book) => book.source === "hadeethenc");

  return (
    <>
      <Meta
        title={copy.title}
        description={copy.intro}
        url={`${server}/sources`}
        image={shareImage}
        type="website"
      />

      <div className={`${styles.page} ${styles.prosePage}`}>
        <Breadcrumbs items={[{ href: "/", label: t("home") }, { label: copy.title }]} />

        <header className={styles.header}>
          <h1 className={styles.title}>{copy.title}</h1>
          <p className={styles.subtitle}>{copy.intro}</p>
        </header>

        <section className={styles.section} aria-labelledby="sources-data">
          <h2 id="sources-data" className={styles.sectionTitle}>
            {copy.collectionsTitle}
          </h2>
          <div className={styles.sourceList}>
            <article className={styles.sourceItem}>
              <h3>{copy.canonicalTitle}</h3>
              <p>{copy.canonical}</p>
              {canonicalBooks.length > 0 && (
                <ul className={styles.inlineList} aria-label={copy.collectionsTitle}>
                  {canonicalBooks.map((book) => (
                    <li key={book.slug}>
                      <Link href={bookPath(book)}>{book.name}</Link> ({formatNumber(book.totalHadith)})
                    </li>
                  ))}
                </ul>
              )}
            </article>
            {topic && (
              <article className={styles.sourceItem}>
                <h3>
                  <Link href={bookPath(topic)}>{shortBookName(topic)}</Link>
                </h3>
                <p>{copy.topics}</p>
                <ul className={styles.inlineList}>
                  <li>
                    {formatNumber(topic.totalHadith)} {t("hadiths")}
                  </li>
                  {topicLanguages > 0 && <li>{copy.topicLanguages(formatNumber(topicLanguages))}</li>}
                </ul>
                <SourceLine />
              </article>
            )}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="sources-rules">
          <h2 id="sources-rules" className={styles.sectionTitle}>
            {copy.rulesTitle}
          </h2>
          <ol className={styles.rules}>
            {copy.rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ol>
        </section>

        {coverage && (
          <section className={styles.section} aria-labelledby="sources-coverage">
            <h2 id="sources-coverage" className={styles.sectionTitle}>
              {copy.coverageTitle}
            </h2>
            <p className={`${styles.notice} ${styles.warning}`}>
              {copy.coverage({
                language,
                topic: topic ? shortBookName(topic) : "",
                topicOwn: formatNumber(coverage.topicOwn),
                topicTotal: formatNumber(coverage.topicTotal),
                bookOwn: coverage.bookOwn > 0 ? formatNumber(coverage.bookOwn) : null,
                linked: coverage.linked > 0 ? formatNumber(coverage.linked) : null,
                readable: formatNumber(coverage.own + coverage.linked),
                total: formatNumber(coverage.total),
                linkedBooks: coverage.linkedBooks.map((item) => `${item.name} ${formatNumber(item.count)}`).join(", "),
              })}
            </p>
          </section>
        )}

        <section className={styles.section} aria-labelledby="sources-translators">
          <h2 id="sources-translators" className={styles.sectionTitle}>
            {copy.translatorsTitle}
          </h2>
          <p className={styles.subtitle}>{copy.translatorsIntro}</p>
          {translators && translators.length > 0 ? (
            <div className={styles.tableWrap}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th scope="col">{copy.language}</th>
                    <th scope="col">{copy.collection}</th>
                    <th scope="col">{copy.translator}</th>
                    <th scope="col" className={styles.tableNumber}>
                      {copy.count}
                    </th>
                  </tr>
                </thead>
                {/* One group of rows per language, one row per collection. */}
                {translators.map((row) => (
                  <tbody key={row.code}>
                    {row.editions.map((item, index) => (
                        <tr key={item.slug}>
                          {index === 0 && (
                            <th scope="rowgroup" rowSpan={row.editions.length}>
                              <bdi>{row.nativeName}</bdi>
                              {row.nativeName !== row.name ? <span className={styles.tableNote}> ({row.name})</span> : null}
                            </th>
                          )}
                          <td>
                            <Link href={bookPath(item)}>{item.name}</Link>
                          </td>
                          <td>{item.translator && <bdi>{item.translator}</bdi>}</td>
                          <td className={styles.tableNumber}>{formatNumber(item.count)}</td>
                        </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </div>
          ) : (
            <p className={styles.notice}>{copy.unavailable}</p>
          )}
        </section>
      </div>
    </>
  );
}

Sources.getLayout = function getLayout(page) {
  return <Layout title={({ t }) => t("dataAndMethod")}>{page}</Layout>;
};

// Translators by language from /hadith/editions: one row per language, one entry per
// collection (its name as the site shows it, its translator when the source names one,
// the number of hadiths).
function translatorsByLanguage(editions, books) {
  const bySlug = booksBySlug(books);
  const byCode = new Map();
  (editions || []).forEach((edition) => {
    if (!byCode.has(edition.languageCode)) {
      byCode.set(edition.languageCode, {
        code: edition.languageCode,
        name: edition.languageName || edition.languageCode,
        nativeName: edition.languageNativeName || edition.languageName || edition.languageCode,
        editions: [],
      });
    }
    const book = bySlug[edition.bookSlug];
    byCode.get(edition.languageCode).editions.push({
      slug: edition.bookSlug,
      name: book ? shortBookName(book) : edition.bookName,
      translator: translatorName(edition.author, edition),
      count: edition.totalHadith || 0,
    });
  });
  // the deployment's language first, then English, then by name
  return [...byCode.values()].sort(compareLanguages);
}

export async function getStaticProps() {
  return loadStatic(async (lang) => {
    // Coverage of the site's content language (none for Arabic, the original).
    const described = lang;
    const [books, languages, siteBooks] = await Promise.all([
      getBooks(lang),
      getLanguages().catch(() => []),
      described === "ar" ? Promise.resolve([]) : getBooks(described).catch(() => []),
    ]);

    let coverage = null;
    if (siteBooks.length) {
      const topic = siteBooks.find((book) => book.source === "hadeethenc");
      const info = languages.find((item) => item.code === described);
      coverage = {
        language: info ? { code: info.code, name: info.name, nativeName: info.nativeName } : null,
        own: siteBooks.reduce((sum, book) => sum + (book.totalTranslated || 0), 0),
        topicOwn: topic ? topic.totalTranslated || 0 : 0,
        bookOwn: siteBooks
          .filter((book) => book.source !== "hadeethenc")
          .reduce((sum, book) => sum + (book.totalTranslated || 0), 0),
        linked: siteBooks.reduce((sum, book) => sum + (book.totalLinkedTranslated || 0), 0),
        total: siteBooks.reduce((sum, book) => sum + (book.totalHadith || 0), 0),
        topicTotal: topic ? topic.totalHadith : 0,
        linkedBooks: siteBooks
          .filter((book) => book.totalLinkedTranslated > 0)
          .map((book) => ({ name: shortBookName(book), count: book.totalLinkedTranslated })),
      };
    }

    const editions = await getEditions().catch(() => null);
    const translators = editions ? translatorsByLanguage(editions, books) : null;

    return {
      props: {
        books: books.map(({ slug, code, name, source, totalHadith }) => ({ slug, code, name, source, totalHadith })),
        coverage,
        translators,
        // the topic collection's languages, Arabic (its original) aside
        topicLanguages: editions
          ? editions.filter((edition) => edition.source === "hadeethenc" && edition.languageCode !== "ar").length
          : languages.filter((language) => language.code !== "ar").length,
        contentTitle: (COPY[interfaceFor(lang)] || COPY.en).title,
        sidebarData: await sidebarCategoriesData(lang),
        backLink: "/",
      },
    };
  });
}
