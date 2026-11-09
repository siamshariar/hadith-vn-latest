import { useEffect } from "react";
import { useRouter } from "next/router";
import localFont from "next/font/local";
// import LayoutContextProvider from "../contexts/LayoutContext";
import SettingsContextProvider from "../contexts/SettingsContext";
import LocaleProvider from "../contexts/LocaleContext";
import { ExtraTranslationsProvider } from "../contexts/ExtraTranslationsContext";
import * as gtag from "../lib/gtag";
import "react-loading-skeleton/dist/skeleton.css";
import "../styles/global.scss";

// Self-hosted (styles/fonts): no network at build time and no layout shift (next/font adjusts
// the fallback metrics). Subset with fontTools pyftsubset --layout-features='*' --flavor=woff2.
// Roboto (Apache 2.0) is the Quran sites' interface and translation face: Latin, Latin Extended
// and Vietnamese. PDMS Islamic is their Arabic face, all of its glyphs, here as woff2 to save
// 60%; Amiri (SIL OFL 1.1), a Naskh with complete harakat, covers what PDMS lacks and stays a
// choice in the settings. Noto Sans Bengali (SIL OFL 1.1, weights 400-700) loads only for
// Bengali text (unicode-range), so other sites never download it.
const uiFont = localFont({
  src: [
    { path: "../styles/fonts/roboto/Roboto-Regular.woff2", weight: "400", style: "normal" },
    { path: "../styles/fonts/roboto/Roboto-Medium.woff2", weight: "500", style: "normal" },
    { path: "../styles/fonts/roboto/Roboto-Bold.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  adjustFontFallback: "Arial",
});
const arabicFont = localFont({
  src: [{ path: "../styles/fonts/pdms-islamic/PDMSIslam-Regular.woff2", weight: "400", style: "normal" }],
  display: "swap",
  adjustFontFallback: "Times New Roman",
});
const amiriFont = localFont({
  src: [
    { path: "../styles/fonts/amiri/Amiri-Regular.woff2", weight: "400", style: "normal" },
    { path: "../styles/fonts/amiri/Amiri-Bold.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  preload: false,
  adjustFontFallback: "Times New Roman",
});
// (next/font takes literals only, so the ranges are written out.)
const bengaliFont = localFont({
  src: [{ path: "../styles/fonts/noto-sans-bengali/NotoSansBengali-Variable.woff2", weight: "400 700", style: "normal" }],
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0964-0965, U+0980-09FF, U+200C-200D, U+25CC" }],
});
// Arabic inside a translation or a label: PDMS again (the same file, one download), larger, as
// Arabic letters look small beside Latin and Bengali ones. ﷺ stays legible at text size only
// in Amiri: PDMS's closes up. next/font's metric fallbacks (local Arial, Times New Roman) have
// no unicode-range and cover Arabic on Windows and macOS, so these go before them in the stack.
const arabicInlineFont = localFont({
  src: [{ path: "../styles/fonts/pdms-islamic/PDMSIslam-Regular.woff2", weight: "400", style: "normal" }],
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: "unicode-range", value: "U+0600-06FF, U+0750-077F, U+0870-08FF, U+FB50-FDF9, U+FDFB-FDFF, U+FE70-FEFF" },
    { prop: "size-adjust", value: "135%" },
  ],
});
const sawFont = localFont({
  src: [{ path: "../styles/fonts/amiri/Amiri-Regular.woff2", weight: "400", style: "normal" }],
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+FDFA" }],
});
// While a Bengali face loads, the platforms' own: Noto Sans Bengali (Android, ChromeOS,
// Linux), Nirmala UI (Windows 8+), Kohinoor Bangla and Bangla Sangam MN (Apple), so the
// browser never reaches its last resort, e.g. Vrinda on Windows.
const scriptFallbacks = '"Noto Sans Bengali", "Nirmala UI", "Kohinoor Bangla", "Bangla Sangam MN"';

// next/font's family list: the face, then (with adjustFontFallback) its metric fallback.
const faces = (font) => font.style.fontFamily.split(",").map((name) => name.trim());
const [uiFace, ...uiFallback] = faces(uiFont);
const stack = (...parts) => parts.flat().join(", ");
const uiStack = stack(uiFace, sawFont.style.fontFamily, arabicInlineFont.style.fontFamily, uiFallback, bengaliFont.style.fontFamily, scriptFallbacks);

const App = ({ Component, pageProps }) => {
  const router = useRouter();

  useEffect(() => {
    const handleRouteChange = (url) => {
      gtag.pageview(url);
    };
    router.events.on("routeChangeComplete", handleRouteChange);
    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router.events]);

  useEffect(() => {
    const preventSave = (e) => {
      if (
        e.key === "s" &&
        (navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey)
      ) {
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", preventSave);
    return () => document.removeEventListener("keydown", preventSave);

    // document.addEventListener('contextmenu', (e) => {
    //   e.preventDefault()
    // })
  }, []);

  const getLayout = Component.getLayout || ((page) => page);

  return (
    <LocaleProvider
      pageLang={pageProps.lang}
      pageUi={pageProps.uiLang}
      uiCatalog={pageProps.uiCatalog}
      languageInfo={pageProps.languageInfo}
    >
      {/* On :root so MUI portals (menus, modals) get the fonts too. */}
      <style jsx global>{`
        :root {
          --font-ui-family: ${uiStack};
          --font-pdms-family: ${arabicFont.style.fontFamily};
          --font-amiri-family: ${amiriFont.style.fontFamily};
        }
      `}</style>
      <SettingsContextProvider>
        <ExtraTranslationsProvider>{getLayout(<Component {...pageProps} />)}</ExtraTranslationsProvider>
      </SettingsContextProvider>
    </LocaleProvider>
  );

  // return (
  //   <LayoutContextProvider>
  //     {getLayout(<Component {...pageProps} />)}
  //   </LayoutContextProvider>
  // );
};

export default App;
