import { useState, useEffect, createContext } from "react";
import { useRouter } from "next/router";
import { settings as defaultSettings, fontStacks } from "../lib/settings";

// Settings are migrated one version at a time:
// - before 2: the reader could not choose the Arabic font or size (those
//   controls were hidden), so they get the new defaults;
// - 2 → 3: the default translation face changes from Roboto to Be Vietnam
//   Pro (full Vietnamese support); saved Roboto (the old default) follows it;
// - 3 → 4: adds the reader settings (show the Arabic, text order);
// - 4 → 5: the reading design. The sizes follow the screen until the reader sets one, and the
//   default faces change: a saved old default (28px, 18px, Amiri, Be Vietnam Pro) follows.
const migrateSettings = (saved) => {
  if (!saved || typeof saved !== "object") return defaultSettings;
  let next = saved;
  if (![2, 3, 4, 5].includes(next.version)) {
    next = {
      ...defaultSettings,
      ...next,
      fontSize: {
        ...defaultSettings.fontSize,
        ...(next.fontSize || {}),
        arabic: defaultSettings.fontSize.arabic,
      },
      fontFamily: {
        ...defaultSettings.fontFamily,
        ...(next.fontFamily || {}),
        arabic: defaultSettings.fontFamily.arabic,
      },
      version: 3,
    };
  }
  if (next.version === 2) {
    const family = next.fontFamily || {};
    next = {
      ...next,
      fontFamily: {
        ...defaultSettings.fontFamily,
        ...family,
        translation: !family.translation || family.translation === "Roboto" ? defaultSettings.fontFamily.translation : family.translation,
      },
      version: 3,
    };
  }
  if (next.version === 3) {
    next = { ...next, reader: { ...defaultSettings.reader, ...(next.reader || {}) }, version: 4 };
  }
  if (next.version === 4) {
    const size = next.fontSize || {};
    const family = next.fontFamily || {};
    next = {
      ...next,
      fontSize: {
        arabic: size.arabic > 0 && size.arabic !== 28 ? size.arabic : null,
        translation: size.translation > 0 && size.translation !== 18 ? size.translation : null,
      },
      fontFamily: {
        arabic: !family.arabic || family.arabic === "Amiri" ? defaultSettings.fontFamily.arabic : family.arabic,
        translation: !family.translation || family.translation === "BeVietnamPro" ? defaultSettings.fontFamily.translation : family.translation,
      },
      version: 5,
    };
  }
  return next;
};

// The sizes the steppers show while the reader has not chosen one: the stylesheet's for this
// screen, read once in the browser (the first render must match the server's).
const SCREEN_SIZES = { arabic: 36, translation: 18 };
const sizesOnScreen = () => {
  const read = (name, fallback) => {
    const value = parseInt(getComputedStyle(document.documentElement).getPropertyValue(name), 10);
    return value > 0 ? value : fallback;
  };
  return { arabic: read("--fs-arabic", SCREEN_SIZES.arabic), translation: read("--fs-trans", SCREEN_SIZES.translation) };
};

const readerOf = (settings) => ({ ...defaultSettings.reader, ...((settings && settings.reader) || {}) });

// Typography is applied through CSS variables on <html>, so it also reaches
// content rendered after a client-side navigation.
const applyTypography = (settings) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement.style;
  const size = settings.fontSize || defaultSettings.fontSize;
  const family = settings.fontFamily || defaultSettings.fontFamily;
  // Unset, the size is the stylesheet's, which depends on the screen.
  if (size.arabic > 0) root.setProperty("--fs-arabic", `${size.arabic}px`);
  else root.removeProperty("--fs-arabic");
  if (size.translation > 0) root.setProperty("--fs-trans", `${size.translation}px`);
  else root.removeProperty("--fs-trans");
  root.setProperty("--font-arabic", fontStacks[family.arabic] || fontStacks.PDMSIslam);
  root.setProperty("--font-trans", fontStacks[family.translation] || fontStacks.Roboto);
  // Read by the hadith card and detail styles.
  const reader = readerOf(settings);
  const html = document.documentElement;
  if (reader.showArabic) html.removeAttribute("data-arabic");
  else html.setAttribute("data-arabic", "hidden");
  if (reader.textOrder === "translation") html.setAttribute("data-text-order", "translation");
  else html.removeAttribute("data-text-order");
};

export const SettingsContext = createContext();

const SettingsContextProvider = ({ children }) => {
  // state declare
  const [settings, setSettings] = useState(defaultSettings);
  const [screenSizes, setScreenSizes] = useState(SCREEN_SIZES);
  const router = useRouter();

  useEffect(() => {
    const update = () => setScreenSizes(sizesOnScreen());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [settings]);

  // first render
  useEffect(() => {
    let newSettings = defaultSettings;
    try {
      const savedSettings = localStorage.getItem("settings");
      newSettings =
        savedSettings === null ? defaultSettings : migrateSettings(JSON.parse(savedSettings));
      saveToLocalStorage(newSettings);
    } catch (error) {
      newSettings = defaultSettings;
    }
    initSettings(newSettings);
    setSettings(newSettings);
  }, []);

  // helper functions
  const saveToLocalStorage = (settings) => {
    try {
      localStorage.setItem("settings", JSON.stringify(settings));
    } catch (error) {
      // storage unavailable (private mode): settings last for this visit only
    }
  };

  const initSettings = (settings) => {
    // init theme (pages/_document.js already set it before the first paint)
    document.body.setAttribute("class", settings.theme);
    document.documentElement.setAttribute("data-theme", settings.theme);

    applyTypography(settings);
  };

  const redirectAfterChangeVerseMode = (mode) => {
    if (typeof window !== "undefined") {
      let path = window.location.pathname;
      let parts = path.split("/");
      let activeVerse = settings.activeVerse;
      if (parts.length > 3 && parts[1] == "chapters" && mode == "scroll") {
        router.push(
          activeVerse == 1
            ? `/chapters/${parts[2]}`
            : `/chapters/${parts[2]}#verse-${activeVerse}`
        );
      } else if (
        parts.length == 3 &&
        parts[1] == "chapters" &&
        mode == "slide"
      ) {
        router.push(`/chapters/${parts[2]}/verses/${activeVerse}`);
      }
    }
  };

  // change settings functions
  const changeView = (view) => {
    const newSettings = { ...settings, ["view"]: view };
    saveToLocalStorage(newSettings);
    setSettings(newSettings);
  };

  const changeFontSizeArabic = (value) => {
    if (value > 60 || value < 16) return;

    const obj = {
      arabic: value,
      translation: settings.fontSize ? settings.fontSize.translation : null,
    };
    const newSettings = { ...settings, ["fontSize"]: obj };
    applyTypography(newSettings);
    saveToLocalStorage(newSettings);
    setSettings(newSettings);
  };

  const changeFontSizeTranslation = (value) => {
    if (value > 40 || value < 12) return;

    const obj = {
      arabic: settings.fontSize ? settings.fontSize.arabic : null,
      translation: value,
    };
    const newSettings = { ...settings, ["fontSize"]: obj };
    applyTypography(newSettings);
    saveToLocalStorage(newSettings);
    setSettings(newSettings);
  };

  const changeFontFamilyArabic = (value) => {
    const obj = {
      arabic: value,
      translation: settings.fontFamily.translation,
    };
    const newSettings = { ...settings, ["fontFamily"]: obj };
    applyTypography(newSettings);
    saveToLocalStorage(newSettings);
    setSettings(newSettings);
  };

  const changeFontFamilyTranslation = (value) => {
    const obj = {
      arabic: settings.fontFamily.arabic,
      translation: value,
    };
    const newSettings = { ...settings, ["fontFamily"]: obj };
    applyTypography(newSettings);
    saveToLocalStorage(newSettings);
    setSettings(newSettings);
  };

  const changeTheme = (theme) => {
    document.body.setAttribute("class", theme);
    document.documentElement.setAttribute("data-theme", theme);
    const newSettings = { ...settings, ["theme"]: theme };
    saveToLocalStorage(newSettings);
    setSettings(newSettings);
  };

  const changeVerseMode = (mode) => {
    const newSettings = { ...settings, ["verseMode"]: mode };
    saveToLocalStorage(newSettings);
    setSettings(newSettings);
    redirectAfterChangeVerseMode(mode);
  };

  const changeActiveVerse = (verseNo) => {
    const newSettings = { ...settings, ["activeVerse"]: verseNo };
    saveToLocalStorage(newSettings);
    setSettings(newSettings);
  };

  const changeAutoScroll = (status) => {
    const newSettings = { ...settings, ["autoScroll"]: status };
    saveToLocalStorage(newSettings);
    setSettings(newSettings);
  };

  const changeNotification = (status) => {
    const newSettings = { ...settings, ["notification"]: status };
    saveToLocalStorage(newSettings);
    setSettings(newSettings);
  };

  const changeReader = (values) => {
    const newSettings = { ...settings, reader: { ...readerOf(settings), ...values } };
    applyTypography(newSettings);
    saveToLocalStorage(newSettings);
    setSettings(newSettings);
  };

  // The reader settings only: font sizes, the Arabic shown, text order.
  const resetReader = () => {
    const newSettings = { ...settings, fontSize: defaultSettings.fontSize, reader: defaultSettings.reader };
    applyTypography(newSettings);
    saveToLocalStorage(newSettings);
    setSettings(newSettings);
  };

  // Returns the settings it replaced, for an undo (components/settings).
  const resetSettings = () => {
    const previous = settings;
    initSettings(defaultSettings);
    saveToLocalStorage(defaultSettings);
    setSettings(defaultSettings);
    return previous;
  };

  const restoreSettings = (saved) => {
    initSettings(saved);
    saveToLocalStorage(saved);
    setSettings(saved);
  };

  return (
    <SettingsContext.Provider
      value={{
        view: settings.view,
        changeView,
        theme: settings.theme,
        changeTheme,
        fontSizeArabic: settings.fontSize?.arabic || screenSizes.arabic,
        changeFontSizeArabic,
        fontSizeTranslation: settings.fontSize?.translation || screenSizes.translation,
        changeFontSizeTranslation,
        fontFamilyArabic: settings.fontFamily?.arabic ?? defaultSettings.fontFamily.arabic,
        changeFontFamilyArabic,
        fontFamilyTranslation: settings.fontFamily?.translation ?? defaultSettings.fontFamily.translation,
        changeFontFamilyTranslation,
        verseMode: settings.verseMode,
        changeVerseMode,
        activeVerse: settings.activeVerse,
        changeActiveVerse,
        autoScroll: settings.autoScroll,
        changeAutoScroll,
        notification: settings.notification,
        changeNotification,
        showArabic: readerOf(settings).showArabic,
        changeShowArabic: (value) => changeReader({ showArabic: Boolean(value) }),
        textOrder: readerOf(settings).textOrder,
        changeTextOrder: (value) => changeReader({ textOrder: value === "translation" ? "translation" : "arabic" }),
        resetReader,
        resetSettings,
        restoreSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsContextProvider;