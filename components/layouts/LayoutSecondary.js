"use client";

import SettingsContextProvider from "../../contexts/SettingsContext";
import PinContextProvider from "../../contexts/PinContext";
import BookmarkContextProvider from "../../contexts/BookmarkContext";
import SidenavContextProvider from "../../contexts/SidenavContext";
import { useLocale } from "../../contexts/LocaleContext";
import HeaderWeb from "../web/Header";
import HeaderMobile from "../mobile/HeaderSecondary";
import FooterWeb from "../web/Footer";
import Sidebar from "../sidebar";
import ScrollFrame from "./ScrollFrame";
import SkipLink from "../core/SkipLink";
import styles from "./Layout.module.scss";

// Pages pass what the navigation should open on: the categories (default) or the books,
// and where the reader is. A page whose server props include `sidebarData`
// (components/sidebar/data.js) gets it on the first paint; otherwise it loads in the browser.
// `title`: the phone header's title, ({ t, formatNumber }) => text: it opens the navigation.
const Layout = ({
  children,
  sidebar = "categories",
  selectedCategoryId,
  selectedBookSlug,
  selectedChapterNo,
  title,
}) => {
  const { t } = useLocale();
  const pageProps = children.props || {};
  const where = { mode: sidebar, selectedCategoryId, selectedBookSlug, selectedChapterNo, data: pageProps.sidebarData };
  return (
    <SettingsContextProvider>
      <PinContextProvider>
        <BookmarkContextProvider>
          <SidenavContextProvider>
            <div className={styles.wrapper}>
              <SkipLink />
              <div className={styles.header} data-site-header="">
                <HeaderWeb page={null} />
                <HeaderMobile where={where} backLink={pageProps.backLink} title={title} />
              </div>

              <div className={styles.body}>
                <aside className={styles.sidebar} aria-label={`${t("books")} / ${t("categories")}`}>
                  <Sidebar {...where} lazy />
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
