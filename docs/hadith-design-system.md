# Hadith design system

How the hadith site looks and why: it reads like the Quran sites (quran-apps, quran.vn), whose
readers find them the easiest to read, with a navigation of its own, because hadith has books
and categories. This is the "reading design" of November 2026: it replaced the bone-paper look of
[design-system-selection.md](design-system-selection.md), which stays as history. Everything fixed
there about accessibility and content integrity still holds.

The tokens live in `styles/_variables.scss`. This document lists them so a native app
can use the same values. When the two disagree, the stylesheet wins; fix this file.

## Principles

1. **The text is the interface.**
   - The Arabic and its translation get the largest type, the most space and a plain white surface.
   - Everything else steps back: metadata is smaller and greyer; controls are quiet until used.
2. **White on grey, one green.**
   - On the web, a grey page with white cards. On phones and tablets the reading pages are plain
     white to the edges.
   - The green means "you can act here" or "you are here": buttons, links, the current item, focus.
3. **Keep the reader's place.** The navigation shows where the reader is, can be closed, and
   remembers. Nothing moves the text except the reader.
4. **Every script is first-class.**
   - No letter-spacing and no case changes on text.
   - Line-heights are set for vowelled Arabic and for scripts with stacked signs.
   - Logical properties wherever direction matters.
5. **Report the sources, never interpret them.**
   - Grades, names and translations are shown exactly as the source states them.
   - The design never colour-codes authenticity.
   - It never presents one text as another.

## Colour

Contrast ratios are against `--surface` unless stated otherwise. The values are the Quran
sites' (`quran-apps/styles/_variables.scss`); where theirs fails AA, a comment in the stylesheet says so.

### Surfaces

| Token | Light | Dark | Use |
|---|---|---|---|
| `--canvas` | `#f4f4f4` | `#293145` | The page |
| `--surface` | `#ffffff` | `#232a3b` | The reading card, the navigation, the header, menus; phones read on it to the edges |
| `--surface-soft` | `#f4f4f4` | `#293145` | Wells: the title bar, filter fields, tags, reference cells |
| `--surface-card` | `#eeeeee` | `#313a55` | Number discs, quiet fills |
| `--surface-strong` | `#e4e4e6` | `#3a4462` | Pressed |
| `--hover` | green at 5% | white at 5% | Hover fill |
| `--press` | ink at 8% | white at 10% | Pressed on a touch screen, laid over the control's own fill |
| `--hairline` | `#e8e8ea` | `#313a55` | Dividers and card edges |
| `--hairline-soft` | `#eff1f2` | `#2c3550` | Dividers inside a card |
| `--control-edge` | `#8a9096` (3.2:1) | `#77819a` (3.6:1) | Edges that identify a control: selects, outlined buttons, radios |

### Text

| Token | Light | Dark | Use |
|---|---|---|---|
| `--ink` | `#000000` | `#ffffff` | The Arabic and the translation |
| `--text` | `#2e3031` (13.2:1) | `#e2e8f0` (12.6:1) | Interface text and titles |
| `--text-secondary` | `#666666` (5.7:1) | `#b6bdc9` (8.2:1) | Labels, icons, metadata |
| `--muted` | `#68717a` (5:1; 4.6:1 on `--canvas`) | `#9aa1ad` (5.5:1) | Captions, counts, placeholders |
| `--disabled` | `#8a9096` | `#77819a` | Disabled labels and decorative marks only |

### Brand

| Token | Light | Dark | Use |
|---|---|---|---|
| `--accent` | `#466548` (6.5:1) | `#a8d5b0` (9.2:1) | Primary buttons, current item, focus ring |
| `--accent-hover` | `#38523b` | `#c6e6cb` | Hover and pressed state of the above |
| `--on-accent` | `#ffffff` (6.5:1 on accent) | `#10261a` (9.8:1) | Text on `--accent`, and the knob of a switch that is on |
| `--link` | `#466548` | `#a8d5b0` | Links |
| `--accent-tint` | green at 10% | green at 14% | Selected and current backgrounds |
| `--accent-wash` | green at 5% | green at 7% | Target row, the topic collection's box |
| `--chip` / `--on-chip` | `#68717a` / white (5:1) | `#4b5675` / white | The citation's tag above a hadith |

- **Underline inline links.** A link inside running text is underlined.
- **Links in navigation, cards and lists** are identified by their place.

### States

| Token | Light | Dark | Use |
|---|---|---|---|
| `--notice-bg` / `-bdr` / `-txt` | `#eee6d1` / `#d6c08a` / `#6b4c00` (6.4:1) | `#2f2a1c` / `#5c4f2a` / `#f3dfa6` | English fallback, missing translation, coverage notes |
| `--error-txt` / `--error-bg` | `#b3261e` / `#fbeceb` | `#f2b8b5` / `#3a2120` | Errors; `--error-txt` is also the fill of a destructive button, with `--surface` text |
| `--error-hover` | `#8f1e18` | `#f7d0ce` | Hover of a destructive button |
| `--grade-bg` / `--grade-txt` | `#eef2ee` / `#38523b` | green at 14% / `#c6e6cb` | Every grade, whatever it says |
| `--mark-bg` | `#f6e3a8` | `#6b5a2a` | Search matches |

### The country's colours

Each edition may have colour stops in `config/countries.json` (`accent`). They are the band behind
the home page's three cards on the web (at night, a calm band of its own, `--brand-band`) and the 3px
bar under an edition's name when it has no logo image. Without stops, the brand green. No gradient
appears anywhere else, and never near reading text.

## Typography

### Families

| Role | Stack | Notes |
|---|---|---|
| Interface and translations (`--font-ui`, `--font-trans`) | Roboto, Amiri for ﷺ, PDMS Islamic at 135% for other Arabic, Noto Sans Bengali, then the platform's faces | The Quran sites' face. Roboto is subset to Latin, Latin Extended and Vietnamese. The Bengali face loads only on pages with Bengali text |
| Arabic (`--font-arabic`) | PDMS Islamic, Amiri, Traditional Arabic | The Quran sites' face, a large part of their light feel. The reader can choose Amiri, Al Qalam or Othmani |

- **Self-hosted.** Every family comes from `styles/fonts` through next/font. `pages/_app.js` records
  how each was cut. Roboto is Apache 2.0, Amiri and Noto Sans Bengali SIL OFL. **PDMS Islamic states
  no licence:** the file says (C) 2001 Pakistan Data Management Services. The Quran sites have long
  used it; the owner should confirm the right to, or the stack falls back to Amiri by changing one
  token and one default (`--font-arabic`, `lib/settings.js`).
- **Fallback while loading.** The platforms' own Bengali faces stand in while a Bengali face loads,
  so Windows never falls back to Vrinda.
- **Arabic inside other text** (ﷺ and Arabic words in a translation, an Arabic title in a heading):
  the two faces limited by `unicode-range` right after Roboto in the stack. Without them, next/font's
  metric fallbacks (local Arial and Times New Roman, which cover Arabic on Windows and macOS) would
  set them first.
- **Other scripts.** CJK, Khmer and Cyrillic use the platform's faces.

### Scale

| Role | Size | Line-height | Use |
|---|---|---|---|
| Page title | 22px in the grey bar (web) / 18px 500 (phones) | 33px / 1.4 | `h1` of every reading page |
| Arabic | `--fs-arabic`: 36px on every screen (the Quran sites' default) | 1.6 | The reader can change it |
| Translation | `--fs-trans`: 18px on every screen (the Quran sites' default) | 1.6; 1.8 for scripts with stacked signs (`styles/_core`) | The reader can change it |
| `--text-md` | 18px | 1.5 | A hadith's title; section titles on phones |
| `--text-base` | 16px | 1.6 | Interface text |
| `--text-sm` | 14px | 1.5 | Labels, metadata, the citation's tag |
| `--text-xs` | 12px | 1.4 | Counts, the source line |

A saved size is set on `<html>`; while the reader has not chosen one, the defaults above apply
(`fontSize` is null in the settings).

### Rules

- **Letter-spacing is 0 for every role.** Tracking breaks Arabic joining and Bengali
  conjuncts, and any interface string may be in any of 16 languages.
- **No `text-transform`.** Case rules differ by language, and uppercase does nothing for Bengali.
- **Hierarchy by size and weight.** Weights 400 and 500 only. Never bold a whole paragraph of reading
  text. The narrator line of English translations is the one exception (sunnah.com's convention).
- **Figures.** Numbers in figures and tables use `tabular-nums`. All numbers are in Latin digits, as
  the hadith numbers they sit next to (`lib/i18n formatNumber`).
- **Measure.** As on the Quran sites: the text fills the reading card inside its 32px (876px at
  1440px), 18px; on phones and tablets 16px from the edges.

## Space, shape, elevation

- **Spacing.** A 4px base: `--space-1` 4px · `-2` 8px · `-3` 12px · `-4` 16px · `-5` 24px ·
  `-6` 32px · `-7` 48px · `-8` 64px. Hadith in a list are 80px apart, with a hairline between.
- **Radius.** `--radius-xs` 2px (the citation's tag), `--radius-sm` 6px (tags, rows), `--radius-md` and
  `--radius-lg` 8px (cards, buttons, the title bar), `--radius-xl` 16px (sheets). Filter and search
  fields, and statuses, are pills. Icon-only buttons are 44px circles: the glyph alone at rest, the
  circle tinted `--hover` on hover. Two exceptions: a stepper's − and + (one control), and a submit
  button inside a field.
- **Elevation.** The cards at rest have `--shadow-card`, almost nothing. Only floating layers get
  `--shadow-float`: menus, popovers, dialogs, sheets and the drawer. The cards of the home page's
  grid lift on hover, on the web.
- **Touch.** On touch screens every control is at least 44×44px (`--tap`); inline links are at least
  24px tall. A citation's tag is small, with a 44px tap area.
- **Hover** styles sit inside `@media (hover: hover)`, so a tap leaves no stuck colour.
- **Pressed.** The browser's tap flash is off, so on touch screens a pressed link, button, tab or menu
  row shows `--press` as an inset shadow: it lies between the control's own background and its text,
  so it reads on a plain row and on a green button alike and changes neither colour.
- **Link colours.** The global rule for links is `a { color: inherit }` only. Never `a:hover` or
  `a:focus` there: those outrank a component's single class, so a hover would wipe the component's
  colour (it once turned the citation tag's white text dark on its grey tag).
- **Menus.** Menu rows are 44px tall (MUI's own are 36px from 600px).
- **Safe areas.** The viewport is `viewport-fit=cover`, so everything fixed or full-bleed pads
  `env(safe-area-inset-*)`.

## Layout and breakpoints

| Width | Layout |
|---|---|
| < 1024px | Plain white reading pages, 16px gutters (a 760px column on tablets), a 54px header that slides away while reading down. Navigation in a drawer |
| ≥ 1024px | The grey page; one centred frame: the navigation card, 16px, the 940px reading card, 32px inside it on every side as the Quran sites' card. The 66px header slides away too, and its logo and tools line up with the frame. The navigation then grows into the header's place; the frame is always as tall as it can get, so a short page never changes height (or moves its footer) as the header comes and goes |

- **The frame** is `--frame` (`components/layouts/Layout.module.scss`): the navigation card is
  `clamp(280px, 22vw, 300px)`, so small laptops keep room for the text. Everything that lines up with
  the frame uses it: header, footer, back-to-top.
- **Closed navigation.** `html[data-nav="closed"]`, saved in `localStorage` (`hadith-nav`) and applied
  before the first paint by `pages/_document.js`, so it never flashes open. The navigation is then
  quran.vn's 70px rail, and rail, card and header stand exactly where quran.vn has them (the
  card at x=293 on a 1440px screen). The change is immediate: no animated widths, which would
  reflow the Arabic.
- **Home.** Its own frame of 1168px. On the web, as the Quran sites' home: a band in the site's
  colours, 70px of it above three equal cards that reach 80px past its edge (the hadith of the
  day, the collections, the categories: a title, three lines, a link). Then "Continue reading" and
  the library as cards (`EntryCard`), three columns. Phones and tablets have no band: the hadith of
  the day as a card, then the same. No search field (the header's icon), no figures, no list of
  languages. A language with nothing of its own in the books leads with the categories.
- **Text pages** (about, settings, contact): one white card, 32px inside.
- **No bottom navigation bar.** The header and the drawer reach everything, and the reading space
  stays the text's.

## Pages, speed and languages

- **Static pages, as the Quran sites'.** Every content page is built once and kept
  (`getStaticProps` with `revalidate`: `lib/api loadStatic`, made again in the background once a
  day; `getStaticPaths` with `fallback: "blocking"`: built on the first visit, the collections with
  the site). Links prefetch them (lists of many links only on hover), so a page opens at once and
  search engines get the whole page. No progress bar under the header. Only the search page is
  made per request. When the API cannot be reached, a page already built stays as it was.
- **Lists keep their view and page in the path**, not the query: `/books/{b}/chapters/{n}[/translated][/page/{p}]`,
  `/categories/{c}/hadiths[/all][/direct][/page/{p}]` (`lib/hadith listPath`). Old `?page=`,
  `?translated=1`, `?all=1`, `?direct=1` links are sent there once (`middleware.js`).
- **One language per site.** A country's site reads in its language (`SITE_LANGUAGE`): no language
  menu, no language list, no language in the settings or the search; `?lang=` and an old saved
  language change nothing. Where a hadith has no translation in it, the English one is shown,
  labelled. The international site (ac) is in English and adds up to two more translations in the
  browser (`contexts/ExtraTranslationsContext`: the translations chip, the `hadith_tr` cookie, a
  link's `?tr=`).

## Components

| Component | Specification |
|---|---|
| Header (web) | White, `--shadow-card`, 66px. Logo; the search icon (the search page, the one search field), theme, ⋮. No language menu: each site has one language. On text pages also Books and Categories as words |
| Header (phones) | White, hairline, 54px. Reading pages: back, the page's title with ▾ (it opens the drawer; cut with an ellipsis, the page shows it in full), search, reading settings. Home: menu, logo, search, reading settings |
| Navigation (`components/sidebar`) | One component, on the web's card and in the drawer. Two tabs (Books, Categories; a real tablist, arrow keys move), a filter, and one level of the tree at a time: books → chapters, categories → subcategories. A collection or a category with subcategories is a link: its page comes on the right (the chapters, the subcategories) and the list goes down into it at once. A crumb goes back up and links to that book's or category's page. The current row is tinted, its number disc green, and kept in view |
| Navigation foot (web) | Saved, settings, close to the rail |
| Rail (web, closed) | 70px white card, rows of 50px: open, books, categories, saved, settings. Each opens the panel on what it says |
| Drawer (phones and tablets) | From the left, `min(100vw - 44px, 380px)`, so a strip of the page always stays to tap. Close with ✕, the strip or Esc; following a link closes it. Under the rows, the site's other pages; at its foot Saved and settings |
| Reading card | `.page`: `--surface`, 32px inside on the web (the Quran sites' card); 16px at the sides on phones and tablets, plain |
| Page opening | Breadcrumb (web only, phones have back and the title), the title in a grey bar (phones: plain), the Arabic name, the figures, centred |
| Toolbar | What applies to the list below: a filter switch or chips; the translations chip at the end on the international site only |
| Hadith in a list | No box. Reference line: the citation's grey tag (a link), the in-book reference, the grade, ⋮. Then the title, the translation, and the Arabic under it, folded as the Quran sites' footnotes (`ArabicFold`: a 38px line, "Arabic text" in green 14px and a chevron, 28px under the text; a `<details>`, so it works without script and is read by search engines). With no translation at all, the Arabic is the text, open. "View details" at the end. A hairline to the next, 40px either side |
| Hadith actions | ⋮ opens one menu: bookmark, pin; copy Arabic, translation, all, citation, link; share, details, report an error. A bookmark or a pin also shows beside ⋮, and can be taken back there |
| Saved page | Bookmarks, pins and last read as tabs in the navigation's style: equal widths, a hairline under the row, the current one underlined in green; below 480px the icon sits above its label so all three fit from 280px. Rows are 56px with a hover fill; a folder's delete and a pin's unpin are 44px buttons at the row's end, shown on hover or focus with a mouse and always on touch screens. Copying falls back to the selection (a hidden span, no focus moved, so it works inside the open menu) where the clipboard API is missing or refused |
| Hadith page | As in a list, the title in the bar (the translations chip in the reference line on the international site); the Arabic under the translation, open; below the text the reference cells, explanation, benefits, word meanings, sources, categories, related |
| Pagination (`components/core/Pager`) | One per list, as the Quran sites': under the content, a white card of its own on the web (20px 25px), a hairline on phones; the way back on the left, the way on on the right, 16px with 22px chevrons. Within a list its pages ("‹ Previous", "Next ›", "Page 2/6" between); at a chapter's ends, the chapter before or after it by name; on a hadith page the hadith before and after |
| Chapter list, subcategories | Rows in two columns from 640px, ruled by dashes: number disc, name, count and citable numbers |
| Cards (`components/home/EntryCard`: home, collections, categories) | The "Continue reading" card's form: an icon in a tinted 40px circle (an open book for a collection, a list for a category, the reading book for "Continue reading"), the name (16px 500), one line under it (how many hadiths), an arrow. No Arabic. As many columns of 300px as fit; a hairline edge on phones, a soft shadow on the web |
| Home band cards | White, 24px inside, the title 24px, three lines of text, a link at the foot; the band's soft shadow |
| Reference cells | Label above value, each cell a tile on `--surface-soft`; the grades table is ruled across |
| Topic-collection translation | Its own box: hairline, radius 8px, `--accent-wash`, its label badge, its note, its source line. Never merged with the hadith's own translation |
| Buttons | Primary: `--accent` on `--on-accent`, 44px. Secondary: transparent, `--control-edge`. Destructive: `--error-txt` on `--surface`. A submit that loads a page keeps its label and shows a turning ring (`aria-busy`, `hooks/useSubmitBusy`) |
| Icon buttons | 44px circles, always with an `aria-label` in the interface language; the SVGs in `components/icons` are `aria-hidden` |
| Fields | Filter and search: grey pills, no edge. Selects: `--surface`, `--control-edge`, radius 8px. 44px or more, 16px text on touch screens (iOS zooms into anything smaller). Focus: a 2px ring |
| Filter chips | Radius 6px on `--surface-soft`. In force: `--accent-tint`, `--accent`, weight 500 |
| Filter switch | A link (`role="switch"`) drawn as a 36×20px switch with its words; toggles on Space too |
| Menus and popovers | `--surface`, radius 8px, `--shadow-float` |
| Dialogs | `--surface`, radius 16px, `--shadow-float`. An `h2` title names the dialog; a round close button in the corner |
| Reading settings | Sizes, Arabic shown, theme, reset, and a link to all settings. A bottom sheet on phones and a side panel on wider screens, so the text stays in view while it changes |
| Settings page | Sizes, faces, theme. Reset resets at once, then offers Undo for ten seconds |
| Footer | As the Quran sites': white, across the screen, one row on the frame, 24px above and below: the copyright on the left, the site's pages between thin bars, the credit on the right, 14px. Phones: the links, then the copyright and the credit, centred |

## Themes

- **Two themes**, light and dark, chosen in the header, the reading settings or the settings page.
  The choice is saved in `localStorage`.
- **No flash.** `pages/_document.js` applies the saved theme, reading typography (sizes, faces, Arabic
  shown) and the closed navigation before the first paint, so a dark page never flashes
  light and the text never reflows once the scripts load. It mirrors `applyTypography` in
  `contexts/SettingsContext.js`; change both together.
- **Where the theme lives.** `body.dark` carries the token overrides; `html[data-theme]`
  carries `color-scheme`, so native controls and scrollbars follow too.
- **Dark theme values** are the Quran sites' night colours, the green lightened to `#a8d5b0` for text,
  buttons and focus, with dark text on green buttons. Every pair in the tables above meets WCAG AA.

## Accessibility

- **Contrast.** Body text 4.5:1 or more, large text 3:1, control edges and focus rings 3:1.
  The values are in the tables above.
- **Focus.** Visible keyboard focus everywhere: a 2px `--focus-ring` outline, 2px offset.
- **Zoom.** Never block it; the viewport allows scaling.
- **Motion.** Kept to 160ms colour and position changes. Under `prefers-reduced-motion`,
  travel is removed:
  - sheets, menus, dialogs and the drawer appear in place;
  - the header and the switch knob jump instead of sliding;
  - chevrons don't turn; the scale-in modal only fades;
  - the skeleton shimmer stops.

  Feedback stays: the busy ring on a submit button fades instead of turning. There is no
  global kill, which would freeze useful feedback.
- **Language and direction.** Arabic blocks carry `lang="ar" dir="rtl"`. Each translation
  carries its language's code and direction. Names inside sentences are wrapped in `<bdi>`.
- **Colour is never the only signal.** Inline links are underlined; the current row and the tab in
  force are also heavier, the tab underlined; a selected segment is outlined.
- **Skip link.** The first Tab stop on every page jumps to `main#viewport`, in the interface
  language.
- **Dialogs** carry `role="dialog"`, `aria-modal` and a name, move focus in, keep it there,
  close on Esc and give focus back (see Components).
- **Landmarks and names.** The breadcrumb `nav` and the navigation's lists are named in the
  interface language. A bare figure on screen ("12/40") is read with its meaning ("12/40
  in English"): the figure is `aria-hidden`, the sentence is visually hidden.
- **Anchors and focus land in view.** `scroll-padding-top` covers the header, so a `#hadith-12`
  link or a Tab never ends under it. Components add no `scroll-margin` of their own (it would count
  the header twice).
- **Switches.** A link drawn as a switch (`role="switch"`) also toggles on Space.
- **Headings.** One `h1` per page. Hadith card titles are `h2` right under a page title (a
  chapter, a category's list, a bookmark folder) and `h3` under a section heading
  (`HadithCard`'s `headingLevel`).
- **Feedback.** Copying says whether it worked; a reset can be undone.

## Right-to-left and left-to-right

- **The page.** The interface is left-to-right in every edition today; an Arabic, Urdu or
  Kurdish interface is not built yet.
- **Arabic text.** Always right-aligned and RTL, whatever the interface.
- **Translations.** Each takes its language's direction from the API.
- **Spacing.** Paddings, borders and alignment that depend on direction use logical
  properties (`margin-inline-start`, `border-inline-start`, `text-align: start`). That
  way an RTL interface needs no new styles.

## States

| State | Treatment |
|---|---|
| Loading | Skeleton blocks in `--hairline` on `--canvas`, the shape of the content (cards, Arabic lines right-aligned); route changes show a 3px `--accent` progress bar |
| Empty | One sentence in `--text-secondary`, with the way forward as a link or button |
| Error | A box with a dashed `--control-edge` edge on `--surface`, the message, and a primary "Retry" button. The API's own (English, technical) message shows in development only. A 404 without the API's JSON body is an outage, not a missing page: the reader gets this state and search engines a 503 |
| Fallback or missing translation | `--notice-*` badge or box, worded as what it is |
| Disabled | `--disabled` text, no hover; steppers drop to 40% opacity at their limits |
| Current or selected | `--accent-tint` background, or an `--accent` underline or fill |
| Search match | `<mark>` on `--mark-bg` |
