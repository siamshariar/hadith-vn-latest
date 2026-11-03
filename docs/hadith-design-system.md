# Hadith design system

How the hadith site looks and why: a quiet, scholarly reading product, warm paper and ink,
one brand green. [design-system-selection.md](design-system-selection.md) explains which
reference it adapts (Claude, from `awesome-design-md`) and what it takes from others.

The tokens live in `styles/_variables.scss`. This document lists them so a native app
can use the same values. When the two disagree, the stylesheet wins; fix this file.

## Principles

1. **The text is the interface.**
   - The Arabic and its translation get the largest type, the most space and the calmest
     surface.
   - Everything else steps back: metadata is smaller and greyer; controls are quiet until
     used.
2. **Paper, ink and one green.**
   - Warm neutrals carry every surface.
   - The logo's green is the only colour. It means "you can act here": buttons, links,
     the current item, focus.
3. **Depth from tone, not shadow.**
   - Sections separate by surface steps and 1px hairlines.
   - Shadows are only for layers that float over the page: menus, dialogs, sheets.
4. **Every script is first-class.**
   - No letter-spacing and no case changes on text.
   - Line-heights are set for vowelled Arabic and Bengali vowel signs.
   - Logical properties wherever direction matters.
5. **Report the sources, never interpret them.**
   - Grades, names and translations are shown exactly as the source states them.
   - The design never colour-codes authenticity.
   - It never presents one text as another.

Avoid the tells of a generated page, as Impeccable and Taste Skill list them:
- gradient text or bands;
- emoji or unicode glyphs as icons;
- glassmorphism;
- coloured side stripes on cards or notices;
- pill-shaped buttons;
- heavy shadows, or any shadow at rest;
- a small label (eyebrow) above a heading;
- index numbers that carry no information;
- big-number stat strips;
- a yellow-cream page;
- ornaments near Arabic text.

Hairlines stay where structure needs a line: tables, ruled lists, sticky bars, card edges.
Elsewhere, space or a tone step does the work.

## Colour

Contrast ratios are against `--canvas` unless stated otherwise.

### Surfaces

The light theme is **bone paper**, not Claude's cream. It is a low-chroma off-white
leaning a little toward the brand green (hue about 72°): warm enough for long reading,
and outside the yellow-cream band that Taste Skill flags as the "assistant palette". The
dark theme is the same paper at night: olive-black instead of Claude's brown-black.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--canvas` | `#f5f6f1` | `#181a17` | The page |
| `--surface` | `#ffffff` | `#1f211e` | Cards, inputs, menus: the reading surface |
| `--surface-soft` | `#edefe8` | `#1c1e1b` | Quiet bands, table heads, footer, tags, reference cells |
| `--surface-card` | `#e7e9e0` | `#262823` | The one feature block (hadith of the day) |
| `--surface-strong` | `#dfe1d6` | `#2e302b` | Pressed |
| `--hover` | `#ebede5` | `#292b26` | Hover fill |
| `--hairline` | `#dcded4` | `#353831` | Dividers and card edges, where structure needs a line |
| `--hairline-soft` | `#e4e6dd` | `#2c2e29` | Dividers inside a card |
| `--control-edge` | `#86887e` (3.3:1) | `#70736a` (3.4:1) | Edges that identify a control: inputs, outlined buttons, radios |

### Text

| Token | Light | Dark | Use |
|---|---|---|---|
| `--ink` | `#141413` (17.0:1) | `#f1f2ec` (15.6:1) | Headings, Arabic |
| `--text` | `#2c2e2a` (12.9:1) | `#e3e5dc` (13.8:1) | Reading text, primary labels |
| `--text-secondary` | `#55574f` (6.8:1) | `#bfc2b7` (9.7:1) | Labels, icons, metadata |
| `--muted` | `#5f6159` (5.8:1) | `#9ea195` (6.7:1) | Captions, counts |
| `--disabled` | `#86887e` | `#70736a` | Disabled labels and decorative marks only |

`--muted` is 5.1:1 on `--surface-card`. Lighter greys are never used for text.

### Brand

| Token | Light | Dark | Use |
|---|---|---|---|
| `--accent` | `#173a1d` (11.7:1) | `#a8d5b0` (10.7:1) | Primary buttons, current item, focus ring |
| `--accent-hover` | `#245232` | `#c6e6cb` | Hover and pressed state of the above |
| `--on-accent` | `#f5f6f1` (11.7:1 on accent) | `#10261a` (9.8:1) | Text on `--accent`, and the knob of a switch that is on; never `#fff` |
| `--link` | `#2c5e35` (7.0:1) | `#a8d5b0` | Links |
| `--accent-tint` | `#e2ebdf` | green at 12% | Selected and current backgrounds |
| `--accent-wash` | green at 6% | green at 7% | Target row, the topic collection's box |

- **Underline inline links.** A link inside running text is underlined: the green and the
  text colour are only 1.4:1 apart.
- **Links in navigation, cards and lists** are identified by their place. They underline on
  hover.

### States

| Token | Light | Dark | Use |
|---|---|---|---|
| `--notice-bg` / `-bdr` / `-txt` | `#eee6d1` / `#d6c08a` / `#6b4c00` (6.4:1) | `#2f2a1c` / `#5c4f2a` / `#f3dfa6` | English fallback, missing translation, coverage notes |
| `--error-txt` / `--error-bg` | `#b3261e` / `#fbeceb` | `#f2b8b5` / `#3a2120` | Errors; `--error-txt` is also the fill of a destructive button, with `--surface` text (6.5:1 light, 9.5:1 dark) |
| `--error-hover` | `#8f1e18` | `#f7d0ce` | Hover of a destructive button |
| `--grade-bg` / `--grade-txt` | `#e2ebdf` / `#173a1d` | green at 12% / `#cfe3d1` | Every grade, whatever it says |
| `--mark-bg` | `#f6e3a8` | `#6b5a2a` | Search matches |

### The country accent

Each edition's flag gradient (`config/countries.json`) belongs to its logo.
- With a logo image, the interface does not repeat the gradient.
- An edition without a logo shows its name as a wordmark over a 3px bar of it.
- No gradient appears anywhere else.

## Typography

### Families

| Role | Stack | Notes |
|---|---|---|
| Interface and translations (`--font-ui`) | Be Vietnam Pro, Amiri (Arabic blocks only), Noto Sans Bengali, then the platform's Bengali | Humanist sans, full Vietnamese. The Bengali face loads only on pages with Bengali text |
| Display (`--font-display`) | Source Serif 4, Noto Serif Bengali, Amiri (Arabic blocks only), then the platform's Bengali | Page titles, section titles, hadith titles, figures. Weight 400 only |
| Arabic (`--font-arabic`) | Amiri, Noto Naskh Arabic, Traditional Arabic | The reader can choose PDMS Islamic, Al Qalam or Othmani |
| Translation (`--font-trans`) | The interface stack | The reader can choose Palatino, Times or Roboto |

- **Self-hosted, all SIL OFL.** Every family is self-hosted from `styles/fonts`, subset to
  the scripts the site uses. `pages/_app.js` records how each was cut.
- **Fallback while loading.** The platforms' own Bengali faces (Noto Sans Bengali, Nirmala
  UI, Kohinoor Bangla, Bangla Sangam MN) stand in while a Bengali face loads, so Windows
  never falls back to Vrinda.
- **Arabic inside other text.** ﷺ and Arabic words in a translation, or an Arabic title in
  a heading, are set in Amiri: a copy of it limited to the Arabic blocks sits right after
  the Latin face. Without it, next/font's metric fallbacks (local Arial and Times New
  Roman, which cover Arabic on Windows and macOS) would set them first.
- **Other scripts.** CJK, Khmer and Cyrillic outside the display serif use the platform's
  faces.

### Scale

| Token | Size | Line-height | Use |
|---|---|---|---|
| Display XL | 44px (desktop) / 30px | 1.25 | Home heading |
| Display L | 34px / 26px | 1.25 | Page and hadith titles |
| Display M | 30px / 24px | 1.25 | Home section titles |
| Display S | 24px / 20px | 1.25 | Page section titles |
| `--text-md` | 18px | 1.4 | Card titles, book names (sans 600) |
| `--text-base` | 16px | 1.6 | Interface text |
| `--text-sm` | 14px | 1.55 | Labels, metadata, buttons |
| 13px | 13px | 1.4 | Translation labels, captions |
| `--text-xs` | 12px | 1.4 | Counts, the source line |
| Arabic | `--fs-arabic` (28px) | 2.0 | ×0.86 in lists on phones; ×0.93 phone and ×1.1 desktop on the hadith page |
| Translation | `--fs-trans` (18px) | 1.75 | ×0.92 below 600px |

### Rules

- **Letter-spacing is 0 for every role.** Tracking breaks Arabic joining and Bengali
  conjuncts, and any interface string may be in any of 16 languages.
- **No `text-transform`.** Case rules differ by language, and uppercase does nothing for
  Bengali.
- **Hierarchy by size and weight.**
  - Sans weights 400, 500 and 600 for interface text; the display serif stays at 400.
  - Never bold a whole paragraph of reading text. The narrator line of English
    translations is the one exception (sunnah.com's convention).
- **Figures.** Numbers in figures and tables use `tabular-nums`.
- **Measure.** Translations keep a measure of about 70 characters (44rem on the hadith
  page). Arabic takes the full column.

## Space, shape, elevation

- **Spacing.** A 4px base: `--space-1` 4px · `-2` 8px · `-3` 12px · `-4` 16px · `-5` 24px ·
  `-6` 32px · `-7` 48px · `-8` 64px.
  - Sections are 48px apart on desktop and 32px on phones.
  - Cards are padded 16px on phones and 24px on desktop.
- **Radius.**
  - `--radius-xs` 4px (marks) and `--radius-sm` 6px (tags, segments).
  - `--radius-md` 8px (buttons, inputs, steppers, menus).
  - `--radius-lg` 12px (cards, panels) and `--radius-xl` 16px (sheets).
  - `--radius-pill` is for statuses only (grade badge, fallback badge, counts) and the
    toggle switch, **never for buttons or links**.
  - Icon-only buttons are 44px circles: the glyph alone at rest, the circle tinted
    `--hover` on hover and `--accent-wash` on press. Close, back, menu, search, the card
    actions, the reading bar's gear, the sidebar's toggles and back-to-top all follow it.
    Two exceptions: a stepper's − and + are 8px squares (one control), and a submit button
    inside a field takes the field's corner.
- **Elevation.**
  - Level 0 is the page; level 1 is `--surface` with a hairline edge.
  - Only floating layers get `--shadow-float`: menus, popovers, dialogs, sheets and the
    back-to-top button.
  - Nothing casts a shadow on hover.
- **Touch.** On touch screens every control is at least 44×44px (`--tap`); inline links are
  at least 24px tall. The one exception is the reading bar's chapter select, 36px tall
  inside the 44px bar (and wide). With a mouse (`(pointer: fine)`), tree toggles and tags
  are 36px, breadcrumb links 32px, and the chapter select's text 14px.
- **Hover** styles sit inside `@media (hover: hover)`, so a tap leaves no stuck colour.
- **Safe areas.** The viewport is `viewport-fit=cover`, so everything fixed or full-bleed
  pads `env(safe-area-inset-*)`: the phone header, the page body and footer, the phone
  panels, the sheets, the menu drawer, back-to-top and the skip link.

## Layout and breakpoints

| Width | Layout |
|---|---|
| < 600px | One column; 16px gutters; the header (54px) slides away while reading down; extra translations fold into 44px rows |
| 600–1023px | Two-column grids; larger translation size; still the phone header and menu drawer |
| ≥ 1024px | Fixed 64px header with Books and Categories as words; 400px sidebar (book chapters or the category tree); content up to 1014px |
| ≥ 1440px | Three-column grids where a page has them |

- **Containers.** Hadith cards switch on their own width (container queries), not the
  window's. A card at least 760px wide sets the translation and the Arabic side by side,
  as sunnah.com lists do.
- **The hadith page** is always one column: Arabic, then translation (or the reverse, from
  the reader settings).
- **No bottom navigation bar.** The reference sites have none. Phones reach everything from
  the header and the menu drawer.

## Components

| Component | Specification |
|---|---|
| Header | `--canvas`, 1px hairline below, no shadow. Desktop: logo, Books, Categories (current one underlined 2px in `--accent`), search field, theme, menu |
| Masthead (home) | Display XL heading, tagline in `--text-secondary`, a 56px search field (`--surface`, `--control-edge`, button inside) |
| Hadith of the day | `--surface-card`, radius 12px, no border. Its section heading (display serif) with the citation; the hadith's title as the lead paragraph; Arabic (4 lines), translation (6 lines); grade and "Read more" |
| Figures | One quiet line of facts under the hadith of the day: number (ink, 600, tabular) then label, the reader's language first in `--accent`. Not a big-number strip |
| Book card | `--surface`, hairline, radius 12px. Name (sans 600) and Arabic name on one line, counts, translation coverage |
| Category card | Title, Arabic title, counts, subcategory tags (`--surface-soft`, radius 6px). No index numerals: their order carries no information |
| Chapter list | Ruled rows: numeral, name, Arabic name, citable range, count. Hover `--hover`, name underlined |
| Hadith card | `--surface`, hairline, radius 12px. Reference line (citation link, in-book reference, grade badge), title, texts, action row over a soft hairline |
| Hadith page | Reader bar (sticky, `--canvas`), display title, facts row, actions, Arabic, hairline, translation, reference cells, details, tags, previous/next cards |
| Reference cells | Label above value, each cell a tile on `--surface-soft` (a tone step, not a rule); the grades table is ruled across, its head on `--surface-soft` |
| Topic-collection translation | Its own box: hairline, radius 8px, `--accent-wash`, its label badge, its note, its source line. Never merged with the hadith's own translation |
| Buttons | Primary: `--accent` on `--on-accent`, radius 8px, 44px. Secondary: transparent, `--control-edge`. Destructive: `--error-txt` on `--surface`, hover `--error-hover`. Text links for low-stakes actions. A submit that loads a page keeps its label and shows a turning ring (`aria-busy`, `hooks/useSubmitBusy`) |
| Icon buttons | 44px circles (see Radius), always with an `aria-label` in the interface language; the SVGs in `components/icons` are `aria-hidden` |
| Inputs and selects | `--surface`, `--control-edge`, radius 8px, 44px or more, 16px text on touch screens (iOS zooms into anything smaller). The right `type` (`search` for filters) and no spell-check on references. Focus: `--accent` edge and a 2px ring |
| Tags and filter chips | Radius 6px. Active: `--accent` fill, `--on-accent` text |
| Menus and popovers | `--surface`, hairline, radius 8px, `--shadow-float` |
| Dialogs | `--surface`, hairline, radius 16px, `--shadow-float`. An `h2` title names the dialog (`aria-labelledby`); a round close button in the corner; destructive actions in the destructive button |
| Phone panels | Categories and settings fill the screen on `--canvas`: a 54px bar with Back and the title, then the content. A dialog: focus moves to Back, Tab stays inside, Esc or Back closes and focus returns to the button that opened it. Closed, the panel is `inert` |
| Sidebar tree | Each branch is its link, then a separate round toggle that names what it opens ("Books of Sahih al-Bukhari") and carries `aria-expanded`. Never a link inside the toggle. What is under a branch is ruled on its leading side |
| Chapter select (reading bar) | A native select. A pick from the open list or a phone's picker opens the chapter; with the keyboard, arrow keys and letters browse, Enter opens, and leaving puts the current chapter back. Its description says so (WCAG 3.2.2) |
| Settings reset | Resets at once, then "Settings reset." with Undo for ten seconds; Reset does nothing while Undo is on offer |
| Sheets (phone) | Bottom sheets for translations and reading settings; radius 16px at the top; safe-area padding |
| Footer | `--surface-soft`, hairline above |

## Themes

- **Two themes**, light and dark, chosen in the header or the settings. The choice is saved
  in `localStorage`.
- **No flash.** `pages/_document.js` applies the saved theme and reading typography (sizes,
  faces, Arabic shown, text order) before the first paint, so a dark page never flashes
  light and the text never reflows once the scripts load. It mirrors `applyTypography` in
  `contexts/SettingsContext.js`; change both together.
- **Where the theme lives.** `body.dark` carries the token overrides; `html[data-theme]`
  carries `color-scheme`, so native controls and scrollbars follow too.
- **Dark theme values.**
  - The bone paper's family at night, olive-black.
  - The brand green lightened to `#a8d5b0` for text, buttons and focus, with dark text on
    green buttons and on the knob of a switch that is on.
  - Every pair in the tables above meets WCAG AA.

## Accessibility

- **Contrast.** Body text 4.5:1 or more, large text 3:1, control edges and focus rings 3:1.
  The values are in the tables above.
- **Focus.** Visible keyboard focus everywhere: a 2px `--focus-ring` outline, 2px offset.
- **Zoom.** Never block it; the viewport allows scaling.
- **Motion.** Kept to 160ms colour and position changes. Under `prefers-reduced-motion`,
  travel is removed:
  - sheets, menus and dialogs appear in place;
  - the reader bar and switch knob jump instead of sliding;
  - chevrons don't turn; the scale-in modal only fades;
  - the skeleton shimmer stops.

  Feedback stays: the busy ring on a submit button fades instead of turning. There is no
  global kill, which would freeze useful feedback.
- **Language and direction.** Arabic blocks carry `lang="ar" dir="rtl"`. Each translation
  carries its language's code and direction. Names inside sentences are wrapped in `<bdi>`.
- **Colour is never the only signal.** Inline links are underlined; the current nav item is
  underlined; a selected segment is outlined.
- **Skip link.** The first Tab stop on every page jumps to `main#viewport`, in the interface
  language.
- **Dialogs** carry `role="dialog"`, `aria-modal` and a name, move focus in, keep it there,
  close on Esc and give focus back (see Components).
- **Landmarks and names.** The breadcrumb `nav` and the sidebar's lists are named in the
  interface language. A bare figure on screen ("12/40") is read with its meaning ("12/40
  in English"): the figure is `aria-hidden`, the sentence is visually hidden.
- **Anchors and focus land in view.** `scroll-padding-top` covers the header, and on the
  reading pages the sticky reading bar too, so a `#hadith-12` link or a Tab never ends
  under them. Components add no `scroll-margin` of their own (it would count the header
  twice).
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
| Error | A box with a dashed `--control-edge` edge on `--surface`, the message, and a primary "Retry" button |
| Fallback or missing translation | `--notice-*` badge or box, worded as what it is |
| Disabled | `--disabled` text, no hover; steppers drop to 40% opacity at their limits |
| Current or selected | `--accent-tint` background, or an `--accent` underline or fill |
| Search match | `<mark>` on `--mark-bg` |
