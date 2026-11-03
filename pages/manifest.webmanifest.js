import { SITE_INTERFACE, interfaceDirection } from "../lib/language";
import { site } from "../lib/sites";

// /manifest.webmanifest (linked from components/core/meta.js): the web app manifest with
// the deployment's name and its own interface language (that of its content language), so
// each country's site installs under its own name. Server-rendered: there is no static copy in public/.
export async function getServerSideProps({ res }) {
  const manifest = {
    name: site.siteName,
    short_name: site.siteName,
    lang: SITE_INTERFACE,
    dir: interfaceDirection(SITE_INTERFACE),
    start_url: "/",
    scope: "/",
    display: "standalone",
    // The installed app opens on the page's paper, under a bar of the same colour
    // (styles/_variables --canvas); the theme-color meta follows a dark reader.
    background_color: "#F5F6F1",
    theme_color: "#F5F6F1",
    icons: [{ src: "/img/favicon/android-chrome-192x192.png", sizes: "192x192", type: "image/png" }],
  };
  res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.end(JSON.stringify(manifest, null, 2));
  return { props: {} };
}

export default function Manifest() {
  return null;
}
