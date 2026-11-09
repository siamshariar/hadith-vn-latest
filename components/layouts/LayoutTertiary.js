import SettingsContextProvider from "../../contexts/SettingsContext";
import PinContextProvider from "../../contexts/PinContext";
import BookmarkContextProvider from "../../contexts/BookmarkContext";
import SidenavContextProvider from "../../contexts/SidenavContext";
import { useLocale } from "../../contexts/LocaleContext";
import HeaderWeb from "../web/Header";
import HeaderMobile from "../mobile/HeaderContent";
import FooterWeb from "../web/Footer";
import Sidebar from "../sidebar";
import ScrollFrame from "./ScrollFrame";
import SkipLink from "../core/SkipLink";
import { site } from "../../lib/sites";
import styles from "./Layout.module.scss";

// The text pages (about, contact, settings, the error pages…): the reading pages' frame, as the
// Quran sites' about page: the same header, the navigation card (the categories; `sidebarData`
// in the page's props draws it on the first paint, else it loads in the browser), the page's
// card (components/pages/TextPage) and the footer. Phones: back, the page's title and search.
const Layout = ({ children }) => {
  const { t } = useLocale();
  const pageProps = children.props || {};
  return (
    <SettingsContextProvider>
      <PinContextProvider>
        <BookmarkContextProvider>
          <SidenavContextProvider>
            <div className={`${styles.wrapper} ${site.navStyle === "edge" ? styles.edge : ""}`}>
              <SkipLink />
              <div className={styles.header} data-site-header="">
                <HeaderWeb page={null} />
                <HeaderMobile title={pageProps.contentTitle} titleKey={pageProps.contentTitleKey} />
              </div>

              <div className={`${styles.body} ${styles.withNav}`}>
                <aside className={styles.sidebar} aria-label={`${t("books")} / ${t("categories")}`}>
                  <Sidebar mode="categories" data={pageProps.sidebarData} lazy />
                </aside>
                <main id="viewport" className={styles.content} tabIndex={-1}>
                  <div className={styles.container}>{children}</div>
                </main>
              </div>

              <div className={styles.footer}>
                <FooterWeb />
              </div>
              <ScrollFrame />
            </div>
          </SidenavContextProvider>
        </BookmarkContextProvider>
      </PinContextProvider>
    </SettingsContextProvider>
  );
};

export default Layout;
