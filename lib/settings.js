export const settings = {
  view: {
    arabic: true,
    translation: true,
    tafseer: true,
  },
  fontSize: {
    arabic: 28,
    translation: 18,
  },
  fontFamily: {
    arabic: "Amiri",
    translation: "BeVietnamPro",
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
  version: 4,
};

// Font stacks used for the CSS variables set by SettingsContext.
export const fontStacks = {
  // --font-*-family come from next/font (pages/_app.js).
  Amiri: 'var(--font-amiri-family), "Noto Naskh Arabic", "Traditional Arabic", serif',
  PDMSIslam: '"PDMSIslam", var(--font-amiri-family), serif',
  AlQalam: '"AlQalam", var(--font-amiri-family), serif',
  Othmani: '"Othmani", var(--font-amiri-family), serif',
  // Amiri after each translation face covers ﷺ and Arabic words in translations.
  BeVietnamPro: 'var(--font-ui-family), var(--font-amiri-family), "Segoe UI", sans-serif',
  PalatinoLinotype: '"PalatinoLinotype", "Palatino Linotype", var(--font-amiri-family), Georgia, serif',
  TimesNewRoman: '"TimesNewRoman", "Times New Roman", var(--font-amiri-family), serif',
  Roboto: '"Roboto", var(--font-amiri-family), -apple-system, "Segoe UI", sans-serif',
};

export const fonts = {
  arabic: [
    {
      displayName: "Amiri (Naskh)",
      familyName: "Amiri",
    },
    {
      displayName: "PDMS Islamic Font",
      familyName: "PDMSIslam",
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
    {
      displayName: "Roboto",
      familyName: "Roboto",
    },
  ],
};

export const themes = [
  {
    name: "light",
    color: "#F5F6F1", // styles/_variables --canvas
  },
  {
    name: "dark",
    color: "#181A17", // .dark --canvas
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
