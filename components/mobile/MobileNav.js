import { useState, useContext, useEffect, useRef } from "react";
import Link from "next/link";
import Drawer from "@mui/material/Drawer";
import HeaderLogo from "../web/HeaderLogo";
import LanguageMenu from "../core/LanguageMenu";
import SettingsModal from "./settings-modal";
import CategoryModal from "./CategoryModal";
import MenuBookIcon from "../icons/MenuBook";
import NearMeIcon from "../icons/NearMeOutlined";
import SubtitlesIcon from "../icons/SubtitlesOutlined";
import DownloadIcon from "../icons/FileDownload";
import SettingsIcon from "../icons/SettingsOutlined";
import FeedbackIcon from "../icons/Feedback";
import ShareIcon from "../icons/ShareOutlined";
import CreateIcon from "../icons/Create";
import AttachMoneyIcon from "../icons/AttachMoney";
import FavoriteBorderIcon from "../icons/FavoriteBorder";
import InfoIcon from "../icons/Info";
import ContactIcon from "../icons/ContactSupport";
import SecurityIcon from "../icons/Security";
import AdminIcon from "../icons/AdminPanelSettings";
import Names99Icon from "../icons/Names99";
import BookmarkIcon from "../icons/BookmarkBorder";
import CategoryIcon from "@mui/icons-material/CategoryOutlined";
import PinIcon from "../icons/PinOutline";
import AutoStoriesIcon from "../icons/AutoStories";
import SearchIcon from "../icons/Search";
import { SidenavContext } from "../../contexts/SidenavContext";
import { useLocale } from "../../contexts/LocaleContext";
import { useRouter } from "next/router";

// import PinModal from './pin-modal'
// import PinIcon from '../icons/PinOutline'

// import BookmarkModal from './bookmark-modal'
// import BookmarkBorderIcon from '../icons/BookmarkBorder'

import styles from "./MobileNav.module.scss";

export default function MobileNav({ navOpen, navControl, selectedCategoryId }) {
  // go to verse modal

  // settings modal
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleSettingsModal = (open) => (event) => {
    event.preventDefault();
    if (
      event.type === "keydown" &&
      (event.key === "Tab" || event.key === "Shift")
    ) {
      return;
    }
    setSettingsOpen(open);
    // Close the menu (as for the categories): while it is open the rest of
    // the page, the settings dialog included, is aria-hidden and outside
    // its focus trap.
    setTimeout(() => {
      navControl(false)(event);
    }, 0);
  };

  // category modal
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const handleCategoryModal = (open) => (event) => {
    event.preventDefault();
    if (
      event.type === "keydown" &&
      (event.key === "Tab" || event.key === "Shift")
    ) {
      return;
    }
    setCategoriesOpen(open);
    setTimeout(() => {
      navControl(false)(event);
    }, 0);
  };

  // // pin modal
  // const [pinOpen, setPinOpen] = useState(false)

  // const handlePinModal = open => event => {
  // 	event.preventDefault()
  // 	if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
  // 		return
  // 	}
  // 	setPinOpen(open)
  // 	setTimeout(() => {
  // 		navControl(false)(event)
  // 	}, 300)
  // }

  // // bookmark modal
  // const [bookmarkOpen, setBookmarkOpen] = useState(false)

  // const handleBookmarkModal = open => event => {
  // 	event.preventDefault()
  // 	if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
  // 		return
  // 	}
  // 	setBookmarkOpen(open)
  // 	setTimeout(() => {
  // 		navControl(false)(event)
  // 	}, 300)
  // }

  const { t } = useLocale();

  // handle bookmark page
  const { bookmarkOpen, changeBookmarkOpen } = useContext(SidenavContext);
  const router = useRouter();

  // Pages that share a layout keep it (and this menu) mounted, so a link
  // to one of them would leave the menu open over the new page: close it
  // whenever a navigation starts.
  const latest = useRef({ navOpen, navControl });
  latest.current = { navOpen, navControl };
  useEffect(() => {
    const close = () => {
      if (latest.current.navOpen) latest.current.navControl(false)({ type: "route", preventDefault() {} });
    };
    router.events.on("routeChangeStart", close);
    return () => router.events.off("routeChangeStart", close);
  }, [router]);

  const handleBookmarkPage = (e, tab) => {
    e.preventDefault();
    changeBookmarkOpen(tab);
    router.push(`/bookmarks`);
    return;
  };

  return (
    <>
      <Drawer
        anchor="left"
        open={navOpen}
        onClose={navControl(false)}
        classes={{
          root: styles.menu_root,
          paper: styles.paper,
        }}
      >
        <div className={styles.wrapper}>
          <div className={styles.menu_ctn}>
            <div className={styles.menu_top}>
              <HeaderLogo size="mobile" />
            </div>

            <ul className={styles.menu}>
              {/*<li>*/}
              {/*	<Link href="/">*/}
              {/*		<a>*/}
              {/*			<span className={styles.icon}><MenuBookIcon /></span>*/}
              {/*			<span className={styles.text}>Learn Quran</span>*/}
              {/*		</a>*/}
              {/*	</Link>*/}
              {/*</li>*/}

              <li>
                <Link href="/books" onClick={navControl(false)}>
                  <span className={styles.icon}>
                    <MenuBookIcon />
                  </span>
                  <span className={styles.text}>{t("books")}</span>
                </Link>
              </li>

              <li>
                <Link href="/search" onClick={navControl(false)}>
                  <span className={styles.icon}>
                    <SearchIcon />
                  </span>
                  <span className={styles.text}>{t("search")}</span>
                </Link>
              </li>

              <li>
                <Link href="/categories" onClick={handleCategoryModal(true)}>

                  <span className={styles.icon}>
                    <CategoryIcon />
                  </span>
                  <span className={styles.text}>{t("categories")}</span>

                </Link>
              </li>

              <li>
                <Link href="/bookmarks" onClick={(e) => handleBookmarkPage(e, 1)}>

                  <span className={styles.icon}>
                    <BookmarkIcon />
                  </span>
                  <span className={styles.text}>{t("bookmarks")}</span>

                </Link>
              </li>
              <li>
                <Link href="/bookmarks" onClick={(e) => handleBookmarkPage(e, 2)}>

                  <span className={styles.icon}>
                    <PinIcon />
                  </span>
                  <span className={styles.text}>{t("pins")}</span>

                </Link>
              </li>
              <li>
                <Link href="/bookmarks" onClick={(e) => handleBookmarkPage(e, 3)}>

                  <span className={styles.icon}>
                    <AutoStoriesIcon />
                  </span>
                  <span className={styles.text}>{t("lastRead")}</span>

                </Link>
              </li>
              {/* <li>
                <Link href="/download">
                  <a>
                    <span className={styles.icon}>
                      <DownloadIcon />
                    </span>
                    <span className={styles.text}>Download</span>
                  </a>
                </Link>
              </li> */}

              <li>
                <Link href="/settings" onClick={handleSettingsModal(true)}>

                  <span className={styles.icon}>
                    <SettingsIcon />
                  </span>
                  <span className={styles.text}>{t("settings")}</span>

                </Link>
              </li>
              <li>
                <LanguageMenu variant="menu" />
              </li>
              {/* <li>
								<Link href="/pin">
									<a onClick={handlePinModal(true)}>
										<span className={styles.icon}><PinIcon /></span>
										<span className={styles.text}>Pinned verses</span>
									</a>
								</Link>
							</li> */}
              {/* <li>
								<Link href="/bookmark">
									<a onClick={handleBookmarkModal(true)}>
										<span className={styles.icon}><BookmarkBorderIcon /></span>
										<span className={styles.text}>{t("bookmarks")}</span>
									</a>
								</Link>
							</li> */}
            </ul>

            <hr className={styles.menu_hr} />

            <ul className={styles.menu}>
              {/*<li>*/}
              {/*	<Link href="/">*/}
              {/*		<a>*/}
              {/*			<span className={styles.icon}><FeedbackIcon /></span>*/}
              {/*			<span className={styles.text}>Rating & Review</span>*/}
              {/*		</a>*/}
              {/*	</Link>*/}
              {/*</li>*/}
              {/*<li>*/}
              {/*	<Link href="/">*/}
              {/*		<a>*/}
              {/*			<span className={styles.icon}><ShareIcon /></span>*/}
              {/*			<span className={styles.text}>Share</span>*/}
              {/*		</a>*/}
              {/*	</Link>*/}
              {/*</li>*/}
              {/*<li>*/}
              {/*	<Link href="/">*/}
              {/*		<a>*/}
              {/*			<span className={styles.icon}><CreateIcon /></span>*/}
              {/*			<span className={styles.text}>Writer</span>*/}
              {/*		</a>*/}
              {/*	</Link>*/}
              {/*</li>*/}
              <li>
                <Link href="/support">

                  <span className={styles.icon}>
                    <ContactIcon />
                  </span>
                  <span className={styles.text}>{t("support")}</span>

                </Link>
              </li>
              <li>
                <Link href="/grateful">

                  <span className={styles.icon}>
                    <FavoriteBorderIcon />
                  </span>
                  <span className={styles.text}>{t("grateful")}</span>

                </Link>
              </li>
            </ul>

            <hr className={styles.menu_hr} />

            <ul className={styles.menu}>
              <li>
                <Link href="/sources">
                  <span className={styles.icon}>
                    <InfoIcon />
                  </span>
                  <span className={styles.text}>{t("dataAndMethod")}</span>
                </Link>
              </li>
              <li>
                <Link href="/about">

                  <span className={styles.icon}>
                    <InfoIcon />
                  </span>
                  <span className={styles.text}>{t("about")}</span>

                </Link>
              </li>
              <li>
                <Link href="/contact">

                  <span className={styles.icon}>
                    <ContactIcon />
                  </span>
                  <span className={styles.text}>{t("contact")}</span>

                </Link>
              </li>
              <li>
                <Link href="/deeniinfotech">

                  <span className={styles.icon}>
                    <InfoIcon />
                  </span>
                  <span className={styles.text}>Deeni Info Tech</span>

                </Link>
              </li>
              <li>
                <Link href="/privacy-policy">

                  <span className={styles.icon}>
                    <SecurityIcon />
                  </span>
                  <span className={styles.text}>{t("privacyPolicy")}</span>

                </Link>
              </li>
            </ul>
          </div>
        </div>
      </Drawer>
      <SettingsModal open={settingsOpen} controller={handleSettingsModal} />
      <CategoryModal
        open={categoriesOpen}
        controller={handleCategoryModal}
        selectedCategoryId={selectedCategoryId}
      />
      {/* <PinModal
				open={pinOpen}
				controller={handlePinModal}
			/> */}
      {/* <BookmarkModal
				open={bookmarkOpen}
				controller={handleBookmarkModal}
			/> */}
    </>
  );
}
