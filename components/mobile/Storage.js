"use client";

import { useState, useEffect, useContext } from "react";
import { SidenavContext } from "../../contexts/SidenavContext";
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import PropTypes from "prop-types";
import BookmarkList from "./StorageBookmark";
import PinList from "./StoragePin";
import LastReadList from "./StorageLastRead";
import PinIcon from "../icons/PinOutline";
import BookmarkBorderIcon from "../icons/BookmarkBorder";
import AutoStoriesIcon from "../icons/AutoStories";
import { useLocale } from "../../contexts/LocaleContext";
import styles from "./Storage.module.scss";

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`bookmark-tabpanel-${index}`}
      aria-labelledby={`bookmark-tab-${index}`}
      {...other}
    >
      {value === index && children}
    </div>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

function a11yProps(index) {
  return {
    id: `bookmark-tab-${index}`,
    "aria-controls": `bookmark-tabpanel-${index}`,
  };
}

export default function Save() {
  const { bookmarkOpen, changeBookmarkOpen } = useContext(SidenavContext);
  const [value, setValue] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const { t } = useLocale();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (bookmarkOpen === false) {
      setValue(0);
    } else {
      setValue(bookmarkOpen - 1);
    }
  }, [bookmarkOpen]);

  const handleChange = (event, newValue) => {
    setValue(newValue);
    changeBookmarkOpen(newValue === 0 ? false : newValue + 1);
  };

  if (!isClient) {
    return (
      <div className={styles.wrapper}>
        <div>{t("loading")}</div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <Tabs
        classes={{
          root: styles.tabs,
          indicator: styles.tab_indicator,
        }}
        value={value}
        onChange={handleChange}
        variant="fullWidth"
        aria-label={t("savedLists")}
      >
        <Tab
          classes={{ root: styles.tab }}
          icon={<BookmarkBorderIcon />}
          label={t("bookmarks")}
          disableRipple
          disableFocusRipple
          {...a11yProps(0)}
        />

        <Tab
          classes={{ root: styles.tab }}
          icon={<PinIcon />}
          label={t("pins")}
          disableRipple
          disableFocusRipple
          {...a11yProps(1)}
        />

        <Tab
          classes={{ root: styles.tab }}
          icon={<AutoStoriesIcon />}
          label={t("lastRead")}
          disableRipple
          disableFocusRipple
          {...a11yProps(2)}
        />
      </Tabs>

      <TabPanel value={value} index={0}>
        <BookmarkList />
      </TabPanel>

      <TabPanel value={value} index={1}>
        <PinList />
      </TabPanel>

      <TabPanel value={value} index={2}>
        <LastReadList />
      </TabPanel>
    </div>
  );
}