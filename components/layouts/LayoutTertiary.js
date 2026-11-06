import SettingsContextProvider from "../../contexts/SettingsContext";
import PinContextProvider from "../../contexts/PinContext";
import BookmarkContextProvider from "../../contexts/BookmarkContext";
import SidenavContextProvider from "../../contexts/SidenavContext";
import HeaderWeb from "../web/Header";
import HeaderMobile from "../mobile/HeaderContent";
import FooterWeb from "../web/Footer";
import ScrollFrame from "./ScrollFrame";
import SkipLink from "../core/SkipLink";
import styles from "./Layout.module.scss";

const Layout = ({ children }) => {
  return (
    <SettingsContextProvider>
      <PinContextProvider>
        <BookmarkContextProvider>
          <SidenavContextProvider>
            {/* <ArabicDialog /> */}

            <div className={`${styles.wrapper} ${styles.layout3}`}>
              <SkipLink />
              <div className={styles.header} data-site-header="">
                <HeaderWeb page={null} sections />
                <HeaderMobile
                  title={children.props.contentTitle}
                  titleKey={children.props.contentTitleKey}
                />
              </div>

              <div className={styles.body}>
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
