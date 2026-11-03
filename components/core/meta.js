import { useContext } from "react";
import Head from "next/head";
import { useLocale } from "../../contexts/LocaleContext";
import { SettingsContext } from "../../contexts/SettingsContext";
import { site } from "../../lib/sites";
import { config } from "../../lib/config";

// The browser's bar (and an installed app's status bar) continues the header: the
// page colour of the reader's theme (styles/_variables --canvas).
const BAR_COLOUR = { light: "#F5F6F1", dark: "#181A17" };

// The browser fetches from the API too (the sidebar, the translation picker): its
// connection opens while the page is still loading.
const API_ORIGIN = (() => {
  try {
    return new URL(config.apiBaseUrl).origin;
  } catch (error) {
    return null;
  }
})();

// The page's <head>: title "{page} | {siteHeading} | {siteName}" (or `fullTitle` as it
// is), description, social cards. Site name and og:locale are the deployment's
// (config/countries.json); on an international site og:locale is the reader's interface.
export default function Meta(props) {
  const { t, ogLocale } = useLocale();
  const settings = useContext(SettingsContext);
  const barColour = settings && settings.theme === "dark" ? BAR_COLOUR.dark : BAR_COLOUR.light;
  const title = props.fullTitle || props.title;

  return (
    <Head>
      <meta charSet="utf-8" />
      {/* Readers must be able to zoom (WCAG 1.4.4), e.g. into the Arabic text */}
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      <meta name="description" content={props.description || ""} />
      <meta httpEquiv="X-UA-Compatible" content="ie=edge" />
      {API_ORIGIN && <link rel="preconnect" href={API_ORIGIN} crossOrigin="anonymous" />}

      {/* Android phone */}
      <meta name="theme-color" content={barColour} />
      <meta name="mobile-web-app-capable" content="yes" />

      {/* iOS phone */}
      <meta name="apple-mobile-web-app-title" content={site.siteName} />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />

      {/* Windows phone */}
      <meta name="msapplication-navbutton-color" content={barColour} />
      <meta name="msapplication-TileColor" content="#2B5797" />
      {/* <meta name="msapplication-TileImage" content="ms-icon-144x144.png`} /> */}
      {/* <meta name="msapplication-config" content="browserconfig.xml" /> */}

      {/* Pinned Sites */}
      <meta name="application-name" content={site.siteName} />
      <meta name="msapplication-tooltip" content={site.siteName} />
      <meta name="msapplication-starturl" content={props.url || ""} />

      {/* Tap highlighting */}
      <meta name="msapplication-tap-highlight" content="no" />

      {/* UC Mobile Browser */}
      <meta name="full-screen" content="yes" />
      <meta name="browsermode" content="application" />

      {/* Disable night mode for this page */}
      <meta name="nightmode" content="disable" />

      {/* Layout mode - content="fitscreen/standard" */}
      <meta name="layoutmode" content="fitscreen" />

      {/* imagemode - show image even in text only mode */}
      <meta name="imagemode" content="force" />

      {/* format-detection */}
      <meta name="format-detection" content="telephone=no" />

      {/* meta information for facebook */}
      <meta property="og:title" content={title || ""} key="ogtitle" />
      <meta property="og:url" content={props.url || ""} key="ogurl" />
      <meta property="og:image" content={props.image || ""} key="ogimage" />
      <meta property="og:type" content={props.type || "website"} key="ogtype" />
      <meta
        property="og:description"
        content={props.description || ""}
        key="ogdesc"
      />
      <meta property="og:locale" content={ogLocale} key="oglocale" />
      <meta property="og:site_name" content={site.siteName} key="ogsitename" />

      {/* meta information for twitter */}
      <meta name="twitter:card" content="summary" key="twcard" />
      <meta name="twitter:url" content={props.url || ""} key="twurl" />
      <meta name="twitter:title" content={title || ""} key="twtitle" />
      <meta
        name="twitter:description"
        content={props.description || ""}
        key="twdesc"
      />
      <meta name="twitter:image" content={props.image || ""} key="twimage" />

      {/* favicon */}
      {/* Main Link Tags */}
      {/*<link*/}
      {/*  href={`${server}/img/favicon/favicon-16x16.png`}*/}
      {/*  rel="icon"*/}
      {/*  type="image/png"*/}
      {/*  sizes="16x16"*/}
      {/*/>*/}
      {/*<link*/}
      {/*  href={`${server}/img/favicon/favicon-32x32.png`}*/}
      {/*  rel="icon"*/}
      {/*  type="image/png"*/}
      {/*  sizes="32x32"*/}
      {/*/>*/}
      {/*<link*/}
      {/*  href={`${server}/img/favicon/favicon-48x48.png`}*/}
      {/*  rel="icon"*/}
      {/*  type="image/png"*/}
      {/*  sizes="48x48"*/}
      {/*/>*/}

      {/*/!* iOS *!/*/}
      {/*<link*/}
      {/*  href={`${server}/img/favicon/apple-touch-icon.png`}*/}
      {/*  rel="apple-touch-icon"*/}
      {/*/>*/}
      {/*<link*/}
      {/*  href={`${server}/img/favicon/favicon-76x76.png`}*/}
      {/*  rel="apple-touch-icon"*/}
      {/*  sizes="76x76"*/}
      {/*/>*/}
      {/*<link*/}
      {/*  href={`${server}/img/favicon/favicon-120x120.png`}*/}
      {/*  rel="apple-touch-icon"*/}
      {/*  sizes="120x120"*/}
      {/*/>*/}
      {/*<link*/}
      {/*  href={`${server}/img/favicon/favicon-152x152.png`}*/}
      {/*  rel="apple-touch-icon"*/}
      {/*  sizes="152x152"*/}
      {/*/>*/}
      {/*<link*/}
      {/*  href={`${server}/img/favicon/favicon-180x180.png`}*/}
      {/*  rel="apple-touch-icon"*/}
      {/*  sizes="180x180"*/}
      {/*/>*/}

      {/*/!* Startup Image *!/*/}
      {/*<link*/}
      {/*  href={`${server}/img/favicon/touch-icon-start-up-320x480.png`}*/}
      {/*  rel="apple-touch-startup-image"*/}
      {/*/>*/}

      {/*/!* Pinned Tab *!/*/}
      {/*<link*/}
      {/*  href={`${server}/img/favicon/safari-pinned-tab.svg`}*/}
      {/*  rel="mask-icon"*/}
      {/*  size="any"*/}
      {/*  color="#5bbad5"*/}
      {/*/>*/}

      {/*/!* Android *!/*/}
      {/*<link*/}
      {/*  href={`${server}/img/favicon/android-chrome-192x192.png`}*/}
      {/*  rel="icon"*/}
      {/*  sizes="192x192"*/}
      {/*/>*/}
      {/*<link*/}
      {/*  href={`${server}/img/favicon/favicon-128x128.png`}*/}
      {/*  rel="icon"*/}
      {/*  sizes="128x128"*/}
      {/*/>*/}

      {/*/!* UC Browser *!/*/}
      {/*<link*/}
      {/*  href={`${server}/img/favicon/favicon-57x57.png`}*/}
      {/*  rel="apple-touch-icon-precomposed"*/}
      {/*  sizes="57x57"*/}
      {/*/>*/}
      {/*<link*/}
      {/*  href={`${server}/img/favicon/favicon-72x72.png`}*/}
      {/*  rel="apple-touch-icon"*/}
      {/*  sizes="72x72"*/}
      {/*/>*/}

      {/* Others */}
      <link
        href="/img/favicon/favicon.ico"
        rel="shortcut icon"
        type="image/x-icon"
      />

      {/* pages/manifest.webmanifest.js: the deployment's name and language */}
      <link rel="manifest" href="/manifest.webmanifest" />

      {props.canonical && <link rel="canonical" href={props.canonical} />}
      {props.noindex && <meta name="robots" content="noindex" />}

      {/* page title */}
      <title>
        {props.fullTitle || `${props.title ? props.title + " | " : ""}${t("siteHeading")} | ${site.siteName}`}
      </title>

      {/* Manifest.json */}
    </Head>
  );
}
