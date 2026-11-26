import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { SITE_LANGUAGE, getHadith } from "../../../../lib/api";
import { referenceText } from "../../../../lib/citation";
import { shareImage, SHARE_IMAGE_SIZE } from "../../../../lib/config";
import { loadCatalog, translate } from "../../../../lib/i18n";
import { SITE_INTERFACE } from "../../../../lib/language";
import { accentGradient, site } from "../../../../lib/sites";

// /api/og/hadith/{id}: a hadith's share card (og:image of its page), 1200 x 630:
// the site's logo and the reference above, the hadith's own translation in the site's language
// in the middle, the site's address and accent ribbon at the foot. Everything on it comes from
// the API and the site (the reference by the page's own code, lib/citation), never from the
// address: a card carries the site's name, so nobody may put other words on one.
// Satori draws text without shaping, so a card is drawn only for a text in Latin, Cyrillic or
// Greek letters (Noto Sans; ﷺ from Noto Naskh Arabic, public/fonts/og). For anything else, or
// A Node.js function, not an Edge one: with Next 16's card renderer the Edge function is over
// Vercel's 1 MB limit, and Next 16 deprecates the Edge runtime. The fonts and the logo are read
// from the function's own files (next.config.js outputFileTracingIncludes), not fetched: no
// network, and nothing depends on the address the card was asked for at.

const { width, height } = SHARE_IMAGE_SIZE;
const DRAWABLE = /^[\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}\p{Script=Common}\p{Script=Inherited}ﷺ]*$/u;
const LOGO_RATIO = 2020 / 343; // the logos' size (public/img/logo*.png)
const t = (key, vars) => translate(SITE_INTERFACE, key, vars);

const publicFile = (file) => readFile(path.join(process.cwd(), "public", file));

let fonts = null;
const loadFonts = () => {
  if (!fonts) {
    const font = (file) => publicFile(`fonts/og/${file}`);
    fonts = Promise.all([font("NotoSans-Regular.ttf"), font("NotoSans-Bold.ttf"), font("NotoNaskhArabic-Regular.ttf")]).catch((error) => {
      fonts = null;
      throw error;
    });
  }
  return fonts;
};

// The logo as a data URI, so the card's renderer has nothing to fetch (it refuses images at
// private addresses, and a picture it cannot load breaks the whole card). No logo: the site's
// name in letters.
let logo = null;
const loadLogo = () => {
  if (!site.logo) return Promise.resolve(null);
  if (!logo) {
    logo = publicFile(site.logo.replace(/^\/+/, ""))
      .then((bytes) => `data:image/png;base64,${bytes.toString("base64")}`)
      .catch(() => {
        logo = null;
        return null;
      });
  }
  return logo;
};

// The source text as the page shows it (lib/hadith cleanText): line breaks and tags out,
// the entities the API leaves, spaces folded.
const plain = (text) =>
  String(text || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/[\u0000-\u001f\u007f​-‍⁠﻿]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// The hadith's own translation in the site's language. Not the English fallback, and not the
// topic collection's text of the same wording, which the page shows only under its label.
function readableText(hadith, lang) {
  const own = hadith.translation;
  return own && own.text && own.languageCode === lang && !own.isFallback ? plain(own.text) : "";
}

// At most five or six lines (about 52 letters a line at 40px): cut at a word, with an ellipsis.
function fit(text) {
  const size = text.length <= 110 ? 52 : text.length <= 180 ? 44 : 40;
  const max = size === 52 ? 110 : size === 44 ? 180 : 230;
  if (text.length <= max) return { text, size };
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return { text: `${(space > max * 0.7 ? cut.slice(0, space) : cut).replace(/[\s,;:.–-]+$/, "")}…`, size };
}

export default async function handler(req, res) {
  const fallback = () => {
    res.setHeader("Cache-Control", "public, max-age=300");
    res.redirect(307, shareImage);
  };
  const id = String(req.query.id || "");
  if (!/^\d{1,9}$/.test(id)) return fallback();

  let hadith;
  try {
    [hadith] = await Promise.all([getHadith(id, SITE_LANGUAGE), loadCatalog(SITE_INTERFACE).catch(() => null)]);
  } catch (_) {
    return fallback();
  }
  const text = hadith && readableText(hadith, SITE_LANGUAGE);
  if (!text || !DRAWABLE.test(text)) return fallback();

  const named = referenceText(hadith, hadith.book, t);
  const reference = DRAWABLE.test(named) ? named : "";
  const { text: shown, size } = fit(text);
  const ribbon = accentGradient() || "linear-gradient(90deg, #466548, #7c9a6e)";
  const host = new URL(shareImage).host;

  let fontData;
  let logoData;
  try {
    [fontData, logoData] = await Promise.all([loadFonts(), loadLogo()]);
  } catch (_) {
    return fallback();
  }
  const [regular, bold, naskh] = fontData;
  const logoHeight = 52;

  const card = new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width, height, background: "#ffffff", fontFamily: "Noto Sans" }}>
        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, padding: "56px 72px 40px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {logoData ? (
              <img src={logoData} width={Math.round(logoHeight * LOGO_RATIO)} height={logoHeight} alt="" />
            ) : (
              <div style={{ display: "flex", color: "#1a3a1f", fontSize: 48, fontWeight: 700 }}>{site.siteName}</div>
            )}
            {reference && <div style={{ display: "flex", color: "#466548", fontSize: 30, fontWeight: 700 }}>{reference}</div>}
          </div>
          <div
            style={{
              display: "flex",
              flexGrow: 1,
              alignItems: "center",
              marginTop: 28,
              marginBottom: 20,
              overflow: "hidden",
              color: "#1f2122",
              fontSize: size,
              lineHeight: 1.42,
            }}
          >
            {shown}
          </div>
          <div style={{ display: "flex", color: "#68717a", fontSize: 26 }}>{host}</div>
        </div>
        <div style={{ display: "flex", height: 14, backgroundImage: ribbon }} />
      </div>
    ),
    {
      width,
      height,
      fonts: [
        { name: "Noto Sans", data: regular, weight: 400, style: "normal" },
        { name: "Noto Sans", data: bold, weight: 700, style: "normal" },
        { name: "Noto Naskh Arabic", data: naskh, weight: 400, style: "normal" },
      ],
    }
  );
  let png;
  try {
    png = Buffer.from(await card.arrayBuffer());
  } catch (_) {
    return fallback();
  }
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400");
  res.status(200).send(png);
}
