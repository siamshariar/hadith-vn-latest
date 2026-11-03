import React from "react";
import Document, { Html, Head, Main, NextScript } from "next/document";

// MUI Core
import { ServerStyleSheets } from "@mui/styles";

import { GA_TRACKING_ID } from "../lib/gtag";
import { SITE_INTERFACE, interfaceDirection, isInterfaceLanguage } from "../lib/language";
import { accentGradient } from "../lib/sites";
import { fontStacks } from "../lib/settings";

// The site's ribbon (header, hero bar, menu: --brand-ribbon in styles/_variables.scss) from
// its accent colours (config/countries.json); without one, the stylesheet's neutral one.
const ribbon = accentGradient();
const ribbonStyle = ribbon ? { "--brand-ribbon": ribbon } : undefined;

// The reader's saved settings (localStorage "settings", lib/settings.js) where
// styles/_variables.scss and SettingsContext expect them: the theme on <html
// data-theme> and <body class>, and the reading typography that SettingsContext's
// applyTypography sets (sizes, faces, Arabic shown, text order). Settings saved
// before version 3 wait for SettingsContext's migration.
const SETTINGS_SCRIPT = `try{
var s=JSON.parse(localStorage.getItem("settings")||"null")||{},h=document.documentElement,c=h.style;
var t=s.theme==="dark"?"dark":"light";h.setAttribute("data-theme",t);document.body.className=t;
if(s.version===3||s.version===4){
var z=s.fontSize||{},f=s.fontFamily||{},r=s.reader||{},k=${JSON.stringify(fontStacks)};
if(z.arabic>0)c.setProperty("--fs-arabic",z.arabic+"px");
if(z.translation>0)c.setProperty("--fs-trans",z.translation+"px");
if(k.hasOwnProperty(f.arabic))c.setProperty("--font-arabic",k[f.arabic]);
if(k.hasOwnProperty(f.translation))c.setProperty("--font-trans",k[f.translation]);
if(r.showArabic===false)h.setAttribute("data-arabic","hidden");
if(r.textOrder==="translation")h.setAttribute("data-text-order","translation");
}}catch(e){}`;

class CustomDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx);
    return { ...initialProps };
  }

  render() {
    // The interface language, which follows the content language (lib/language.js
    // interfaceFor), and its direction: each page says which interface it is in (lib/api
    // loadPage, loadStaticPage). Content blocks carry their own lang and dir.
    const pageProps = (this.props.__NEXT_DATA__ && this.props.__NEXT_DATA__.props && this.props.__NEXT_DATA__.props.pageProps) || {};
    const lang = isInterfaceLanguage(pageProps.uiLang) ? pageProps.uiLang : SITE_INTERFACE;
    return (
      <Html lang={lang} dir={interfaceDirection(lang)} style={ribbonStyle}>
        <Head>
          {/* Global Site Tag (gtag.js) - Google Analytics, only when an ID is configured
              (next.config.js accepts letters, digits and dashes only) */}
          {GA_TRACKING_ID && (
            <>
              <script async src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_TRACKING_ID)}`} />
              <script
                dangerouslySetInnerHTML={{
                  __html: `
                    window.dataLayer = window.dataLayer || [];
                    function gtag() {
                      dataLayer.push(arguments);
                    }
                    gtag('js', new Date());
                    gtag('config', ${JSON.stringify(GA_TRACKING_ID)}, {
                      page_path: window.location.pathname,
                    });
                  `,
                }}
              />
            </>
          )}
        </Head>
        <body>
          {/* The reader's settings before the first paint (SettingsContext applies
              them again once it loads), so a dark page never flashes light and the
              text does not reflow at a saved size. */}
          <script dangerouslySetInnerHTML={{ __html: SETTINGS_SCRIPT }} />
          <Main />
          <NextScript />
          <script> </script>
        </body>
      </Html>
    );
  }
}

CustomDocument.getInitialProps = async (ctx) => {
  // Render app and page and get the context of the page with collected side effects.
  const sheets = new ServerStyleSheets();
  const originalRenderPage = ctx.renderPage;

  ctx.renderPage = () =>
    originalRenderPage({
      enhanceApp: (App) => (props) => sheets.collect(<App {...props} />),
    });

  const initialProps = await Document.getInitialProps(ctx);

  return {
    ...initialProps,
    // Styles fragment is rendered after the app and page rendering finish.
    styles: [
      ...React.Children.toArray(initialProps.styles),
      sheets.getStyleElement(),
    ],
  };
};

export default CustomDocument;
