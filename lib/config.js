import { site } from "./sites";

// Public URL of the site, without a trailing slash: canonical links, permalinks, copied
// citations, the sitemap. next.config.js requires a real one for production builds.
export const server = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

// The image of social cards (og:image, twitter:image): the site's card (config/countries.json
// shareImage, else the edition-less one), 1200 x 630 like every card the site makes
// (scripts/share-images.mjs; the hadith cards of pages/api/og).
export const shareImage = `${server}${site.shareImage}`;
export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 };

// Base URL of the Quran API; the hadith endpoints live under `${apiBaseUrl}/hadith`.
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8090/api";

export const config = {
  // Default content language, sent to the API as {localizationCode}: the country's
  // (config/countries.json). The reader's cookie and ?lang= override it.
  language: site.language,
  apiBaseUrl: apiBaseUrl.replace(/\/+$/, ""),
  apiFetchTimeout: 15000, // ms
  perPage: 20, // hadiths per page on paginated lists (the API allows up to 100)
};
