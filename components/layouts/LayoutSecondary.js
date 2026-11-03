"use client";

import SettingsContextProvider from "../../contexts/SettingsContext";
import PinContextProvider from "../../contexts/PinContext";
import BookmarkContextProvider from "../../contexts/BookmarkContext";
import SidenavContextProvider from "../../contexts/SidenavContext";
import HeaderWeb from "../web/Header";
import HeaderMobile from "../mobile/HeaderSecondary";
import FooterWeb from "../web/Footer";
import Sidebar from "../sidebar";
import ScrollFrame from "./ScrollFrame";
import SkipLink from "../core/SkipLink";
import styles from "./Layout.module.scss";

// Pages pass what the sidebar should show: the category tree (default) or
// the books with their chapters. A page whose server props include
// `sidebarData` (components/sidebar/data.js) gets the sidebar on the first
// paint; otherwise it loads in the browser on desktop screens.
const Layout = ({
  children,
  sidebar = "categories",
  selectedCategoryId,
  selectedBookSlug,
  selectedChapterNo,
}) => {
  const pageProps = children.props || {};
  return (
    <SettingsContextProvider>
      <PinContextProvider>
        <BookmarkContextProvider>
          <SidenavContextProvider>
            <div className={styles.wrapper}>
              <SkipLink />
              <div className={styles.header}>
                <HeaderWeb page={null} />
                <HeaderMobile
                  selectedCategoryId={selectedCategoryId}
                  backLink={pageProps.backLink}
                />
              </div>

              <div className={styles.body}>
                <aside className={styles.sidebar}>
                  <Sidebar
                    mode={sidebar}
                    selectedCategoryId={selectedCategoryId}
                    selectedBookSlug={selectedBookSlug}
                    selectedChapterNo={selectedChapterNo}
                    data={pageProps.sidebarData}
                    lazy
                  />
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
