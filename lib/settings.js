// localStorage: "closed" while the navigation is closed down to its rail (components/sidebar).
export const NAV_KEY = "hadith-nav";

export const settings = {
  view: {
    arabic: true,
    translation: true,
    tafseer: true,
  },
  // null: the screen's size (styles/_variables.scss) until the reader chooses one.
  fontSize: {
    arabic: null,
    translation: null,
  },
  fontFamily: {
    arabic: "PDMSIslam",
    translation: "Roboto",
  },
  theme: "light",
  // Hadith reading (the reader settings on chapter and hadith pages):
  // show the Arabic, and which text comes first, "arabic" or "translation".
  reader: {
    showArabic: true,
    textOrder: "arabic",
  },
  verseMode: "scroll",
  activeVerse: 1,
  autoScroll: true,
  notification: false,
  version: 5,
};

// Font stacks used for the CSS variables set by SettingsContext.
export const fontStacks = {
  // --font-*-family come from next/font (pages/_app.js).
  PDMSIslam: 'var(--font-pdms-family), var(--font-amiri-family), "Traditional Arabic", serif',
  Amiri: 'var(--font-amiri-family), "Noto Naskh Arabic", "Traditional Arabic", serif',
  AlQalam: '"AlQalam", var(--font-amiri-family), serif',
  Othmani: '"Othmani", var(--font-amiri-family), serif',
  // The interface stack covers ﷺ and Arabic words in a translation; the others name it after them.
  Roboto: 'var(--font-ui-family), "Segoe UI", sans-serif',
  BeVietnamPro: '"BeVietnamPro", var(--font-ui-family), "Segoe UI", sans-serif',
  PalatinoLinotype: '"PalatinoLinotype", "Palatino Linotype", var(--font-ui-family), Georgia, serif',
  TimesNewRoman: '"TimesNewRoman", "Times New Roman", var(--font-ui-family), serif',
};

export const fonts = {
  arabic: [
    {
      displayName: "PDMS Islamic Font",
      familyName: "PDMSIslam",
    },
    {
      displayName: "Amiri (Naskh)",
      familyName: "Amiri",
    },
    {
      displayName: "Al Qalam Quran 2",
      familyName: "AlQalam",
    },
    {
      displayName: "Othmani",
      familyName: "Othmani",
    },
  ],
  translation: [
    {
      displayName: "Roboto",
      familyName: "Roboto",
    },
    {
      displayName: "Be Vietnam Pro",
      familyName: "BeVietnamPro",
    },
    {
      displayName: "Palatino Linotype",
      familyName: "PalatinoLinotype",
    },
    {
      displayName: "Times New Roman",
      familyName: "TimesNewRoman",
    },
  ],
};

export const themes = [
  {
    name: "light",
    color: "#FFFFFF", // styles/_variables --surface
  },
  {
    name: "dark",
    color: "#232A3B", // .dark --surface
  },
  // {
  //     name: 'blue',
  //     color: '#2196F3'
  // },
  // {
  //     name: 'orange',
  //     color: '#FF9800'
  // },
  // {
  //     name: 'red',
  //     color: '#F44336'
  // },
];
