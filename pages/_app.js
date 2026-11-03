import { useEffect } from "react";
import { useRouter } from "next/router";
import localFont from "next/font/local";
// import LayoutContextProvider from "../contexts/LayoutContext";
import SettingsContextProvider from "../contexts/SettingsContext";
import LocaleProvider from "../contexts/LocaleContext";
import RouteProgress from "../components/core/RouteProgress";
import * as gtag from "../lib/gtag";
import "react-loading-skeleton/dist/skeleton.css";
import "../styles/global.scss";

// Self-hosted (styles/fonts): no network at build time and no layout shift
// (next/font adjusts the fallback metrics). All are SIL OFL 1.1 (OFL.txt next
// to the files), from github.com/google/fonts, subset with fontTools
// pyftsubset --layout-features='*' --flavor=woff2: Be Vietnam Pro to Latin,
// Latin Extended and Vietnamese; Amiri to Arabic (with presentation forms,
// e.g. ﷺ) and basic Latin.
// Be Vietnam Pro: designed for Vietnamese, full diacritics. Amiri: Naskh for
// hadith Arabic with complete harakat.
// The display serif and the two Bengali faces (docs/hadith-design-system.md):
// variable sources pinned with fontTools varLib.instancer, then subset as above.
// Source Serif 4 (opsz 32, weight 400; hinting dropped, display sizes only) to
// Latin, Latin Extended, Vietnamese, Cyrillic and the transliteration marks
// (ʿ ʾ ḥ ṣ); Noto Sans Bengali (weights 400-700) and Noto Serif Bengali (400)
// to the Bengali block. The Bengali faces load only for Bengali text
// (unicode-range), so other sites never download them.
const uiFont = localFont({
  src: [
    { path: "../styles/fonts/be-vietnam-pro/BeVietnamPro-Regular.woff2", weight: "400", style: "normal" },
    { path: "../styles/fonts/be-vietnam-pro/BeVietnamPro-Medium.woff2", weight: "500", style: "normal" },
    { path: "../styles/fonts/be-vietnam-pro/BeVietnamPro-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "../styles/fonts/be-vietnam-pro/BeVietnamPro-Bold.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  adjustFontFallback: "Arial",
});
const arabicFont = localFont({
  src: [
    { path: "../styles/fonts/amiri/Amiri-Regular.woff2", weight: "400", style: "normal" },
    { path: "../styles/fonts/amiri/Amiri-Bold.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  adjustFontFallback: "Times New Roman",
});
const displayFont = localFont({
  src: [{ path: "../styles/fonts/source-serif-4/SourceSerif4-Regular.woff2", weight: "400", style: "normal" }],
  display: "swap",
  adjustFontFallback: "Times New Roman",
});
// (next/font takes literals only, so the Bengali range is written out twice.)
const bengaliFont = localFont({
  src: [{ path: "../styles/fonts/noto-sans-bengali/NotoSansBengali-Variable.woff2", weight: "400 700", style: "normal" }],
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0964-0965, U+0980-09FF, U+200C-200D, U+25CC" }],
});
const bengaliDisplayFont = localFont({
  src: [{ path: "../styles/fonts/noto-serif-bengali/NotoSerifBengali-Regular.woff2", weight: "400", style: "normal" }],
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0964-0965, U+0980-09FF, U+200C-200D, U+25CC" }],
});
// Amiri again, for the Arabic blocks only: the Arabic-script characters inside Latin and
// Bengali text (ﷺ and Arabic words in a translation, an Arabic title in a heading).
// next/font's metric fallbacks (local Arial, Times New Roman) have no unicode-range and
// cover Arabic on Windows and macOS, so this face goes before them in the stacks below.
// Same files as arabicFont: one download.
const arabicScriptFont = localFont({
  src: [
    { path: "../styles/fonts/amiri/Amiri-Regular.woff2", weight: "400", style: "normal" },
    { path: "../styles/fonts/amiri/Amiri-Bold.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0600-06FF, U+0750-077F, U+0870-08FF, U+FB50-FDFF, U+FE70-FEFF" }],
});
// While a Bengali face loads, the platforms' own: Noto Sans Bengali (Android, ChromeOS,
// Linux), Nirmala UI (Windows 8+), Kohinoor Bangla and Bangla Sangam MN (Apple), so the
// browser never reaches its last resort, e.g. Vrinda on Windows.
const scriptFallbacks = '"Noto Sans Bengali", "Nirmala UI", "Kohinoor Bangla", "Bangla Sangam MN"';

// next/font's family list: the face, then (with adjustFontFallback) its metric fallback.
const faces = (font) => font.style.fontFamily.split(",").map((name) => name.trim());
const [uiFace, ...uiFallback] = faces(uiFont);
const [displayFace, ...displayFallback] = faces(displayFont);
const stack = (...parts) => parts.flat().join(", ");
const uiStack = stack(uiFace, arabicScriptFont.style.fontFamily, uiFallback, bengaliFont.style.fontFamily, scriptFallbacks);
const displayStack = stack(
  displayFace,
  bengaliDisplayFont.style.fontFamily,
  arabicScriptFont.style.fontFamily,
  displayFallback,
  bengaliFont.style.fontFamily,
  scriptFallbacks
);

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
      pagePreferred={pageProps.preferredLang}
      uiCatalog={pageProps.uiCatalog}
      languageInfo={pageProps.languageInfo}
    >
      {/* On :root so MUI portals (menus, modals) get the fonts too. */}
      <style jsx global>{`
        :root {
          --font-ui-family: ${uiStack};
          --font-amiri-family: ${arabicFont.style.fontFamily};
          --font-display-family: ${displayStack};
        }
      `}</style>
      <SettingsContextProvider>
        <RouteProgress />
        {getLayout(<Component {...pageProps} />)}
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
