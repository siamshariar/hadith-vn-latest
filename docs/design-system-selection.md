# Design system selection

> **History.** This records the choice of 3 November 2026. Its look (bone paper, a display serif, separate
> cards) was superseded later that month by the reading design, which follows the Quran sites:
> see [hadith-design-system.md](hadith-design-system.md). Its accessibility work still stands.

Which reference from `~/workspace/dit/awesome-design-md` the hadith site is designed on,
and why. The resulting system is specified in [hadith-design-system.md](hadith-design-system.md)
and implemented in `styles/_variables.scss`.

## Decision

**Primary reference: Claude** — `awesome-design-md/design-md/claude/DESIGN.md`.

It is the only reference in the library that combines all four things a hadith reader
needs:

- a warm, low-glare paper canvas;
- an editorial split between serif display type and humanist sans reading type;
- depth from surface colour rather than shadows;
- a complete warm dark surface family, from which a real dark theme can be built.

Its weak points are fixed by rules taken from three other references. The visual language
stays Claude's:

| Rule | Taken from |
|---|---|
| Zero letter-spacing on every text role; no shadows on content; one dark action colour | Oracle |
| Serif for display, sans for reading and structure; hairline-ruled rows instead of boxes | WIRED |
| Reading column of about 720px, sidebar that collapses to a drawer, body line-height never below 1.5 | Mintlify |
| Label-above-value cells for references | NerdWallet |

## How the library was evaluated

1. **All 84 DESIGN.md files were triaged** on their own content: the front-matter
   description, declared font stacks, canvas colours, and how often each file discusses
   reading, editorial layout, serif type, documentation and dark mode. Filenames were not
   used. Excluded at this stage, with the reason in each file's own words:
   - Photography- or video-led systems (Apple, Tesla, SpaceX, Nike, the automotive brands,
     Runway, Pinterest): their hierarchy depends on imagery the hadith site does not have.
   - Dark-cinematic or gradient-driven systems (Linear, Framer, Stripe, Vercel, Raycast,
     Cohere, Mistral, ElevenLabs, The Verge): decorative voltage that competes with
     Arabic text.
   - Playful or illustration-led systems (Clay, Figma, Miro, PostHog, Notion's marketing
     surface, Sentry).
   - Retail, casino and trading systems (Starbucks, 1win, Binance, Kraken, mydealz).
   - The two retro systems (Dell 1996, Nintendo 2001).
2. **Six systems built around reading, editorial restraint or research density** were then
   read in full, every section from Overview to Do's and Don'ts: WIRED, Claude, Oura,
   NerdWallet, Mintlify and Oracle.
3. **Each was scored 1–5** on the nine criteria below. Scores come from what each file
   specifies; no performance figures are invented. None of the 84 files addresses Arabic,
   Bengali or right-to-left text, so for those criteria the score rates what transfers:
   - letter-spacing policy;
   - body weight and line-height;
   - decoration near text;
   - how type roles are split.

## Scoring matrix

| Criterion | WIRED | Claude | Oura | NerdWallet | Mintlify | Oracle |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| 1. Long-form reading (Arabic and translation) | 5 | 4 | 3 | 3 | 4 | 3 |
| 2. Bengali and multilingual type | 3 | 3 | 2 | 2 | 3 | 5 |
| 3. Arabic readability: calm surface, no interfering decoration | 4 | 4 | 3 | 3 | 3 | 4 |
| 4. Presentation of translations and references | 4 | 3 | 2 | 5 | 4 | 3 |
| 5. Islamic research aesthetic: scholarly, warm, quiet | 3 | 4 | 4 | 3 | 2 | 4 |
| 6. Light and dark themes | 2 | 4 | 2 | 1 | 2 | 2 |
| 7. Phone to desktop responsiveness | 4 | 4 | 4 | 5 | 5 | 4 |
| 8. Accessibility and usability | 4 | 3 | 3 | 4 | 4 | 3 |
| 9. Long-term production fit | 3 | 4 | 2 | 4 | 4 | 5 |
| **Total (of 45)** | **32** | **33** | **25** | **30** | **31** | **33** |

Claude and Oracle tie. Two requirements break the tie:

- **The reading screen matters most** (criterion 1): Claude 4, Oracle 3.
- **The site already offers a dark theme.** Claude defines a full warm dark family; Oracle
  only flips polarity on dark bands.

Oracle's winning traits are rules, so they transfer: zero tracking, no shadows, and a
single action colour. A dark palette is a whole token family and does not transfer.

## Evidence per candidate

Line numbers refer to the files in `awesome-design-md/design-md/`.

**Claude** (`claude/DESIGN.md`)
- Strengths:
  - "reads like a long-form magazine column" (l. 413).
  - Body 16px with line-height 1.55.
  - Warm hairline `#e6dfd8` (l. 341).
  - "color-block first, shadow rare" (l. 425).
  - A dark family: `#181715`, `#1f1e1b`, `#252320`, `#faf9f5`, `#a09d96` (l. 338 ff.).
- Weaknesses:
  - Display type depends on negative tracking, "essential" (l. 389). That breaks Arabic
    joining and Bengali conjuncts.
  - Icon buttons are "exactly 36 × 36" (l. 556), below the 44px target.
  - White text on its coral `#cc785c` is 4.0:1, below AA for 14px labels.
  - The 96px section rhythm suits marketing pages, not a reader.

**Oracle** (`oracle/DESIGN.md`)
- Strengths:
  - "Letter-spacing is zero on every role without exception" (l. 503).
  - "anything that is read in sentences is set loose" (l. 505).
  - "no shadows at all" (l. 562).
  - Every action in one dark colour; the brand colour reserved for the wordmark.
- Weaknesses:
  - No dark theme.
  - Buttons stand 37px tall (l. 546).
  - Inline links are not underlined.

**WIRED** (`wired/DESIGN.md`)
- Strengths:
  - "Serif for narrative, sans for structure" (l. 320).
  - Body at 16–19px with line-height 1.45–1.5 (l. 295).
  - Hairline story rows; 44px buttons.
- Weaknesses:
  - "Don't introduce a chromatic brand accent" (l. 493). The site's logo is green.
  - Square corners on everything.
  - Stark white page, and no dark theme.

**NerdWallet** (`nerdwallet/DESIGN.md`)
- Strengths:
  - Label-above-value `spec-cell` (l. 636).
  - Hairline comparison rows.
  - Six breakpoints, with tables that reflow into stacked cards.
- Weaknesses:
  - "300 for body copy" (l. 431): thin strokes weaken Bengali and Arabic.
  - Gradient hero bands and a lime marquee.
  - No dark theme.

**Mintlify** (`mintlify/DESIGN.md`)
- Strengths:
  - Docs grid: "left sidebar nav (~240px), center prose (~720px max-width)" (l. 561).
  - "never compress" body line-height (l. 794).
- Weaknesses:
  - Inter everywhere, black pills and atmospheric gradients: the generic look this redesign
    moves away from.
  - "the brand has not yet shipped a published dark-mode palette" (l. 849).

**Oura** (`oura/DESIGN.md`)
- Strengths: a warm paper canvas, and an earth palette that includes a forest green.
- Weaknesses:
  - Display weights "run thin — 100 and 300" (l. 388).
  - Photography carries the hierarchy.
  - Long vertical silences suit a brand site, not a reference.

**Also read, not shortlisted.** Starbucks (`starbucks/DESIGN.md`) assigns greens by role on
a cream canvas, which is close to the brand. But:
- it prescribes "Keep tracking tight at -0.01em" for every text role (l. 465);
- it uses pill buttons everywhere, plus a floating order button;
- it is a retail system.

## What the site takes from Claude, and what it changes

| Claude says | The hadith site does | Why |
|---|---|---|
| Cream canvas `#faf9f5`, warm hairline `#e6dfd8`, cream card `#efe9de` | The same structure (paper page, a darker card tone, warm hairlines), in the site's own **bone paper**: `#f5f6f1`, `#e7e9e0`, `#dcded4`, leaning slightly to the brand green | Low glare for long reading. Claude's exact cream, and yellow creams in general, are a known "assistant palette" tell (Taste Skill flags both), so the site keeps the warmth but not the costume |
| Coral `#cc785c` is the only accent | The logo's deep green `#173a1d` takes the role | It is the brand. Text on the green is 11.7:1; white on Claude's coral is 4.0:1 |
| Serif display at weight 400 with −0.3 to −1.5px tracking | Serif display at 400, **tracking 0** (Oracle) | Tracking breaks Arabic joining and Bengali conjuncts, and interface strings may be in any of 16 languages |
| Humanist sans for body | Be Vietnam Pro (kept), plus a bundled Bengali sans | Already the site's face, with full Vietnamese; Bengali no longer depends on the platform |
| Copernicus serif | Source Serif 4, Noto Serif Bengali, Amiri (all SIL OFL) | Open fonts with Vietnamese, Bengali and Arabic coverage |
| 96px section rhythm, 32px card padding | 48px desktop, 32px phone; 16–24px card padding | Oracle's uniform 48px. A reader is denser than a marketing page |
| Radius scale 4 / 6 / 8 / 12 / 16px and a pill (`rounded.*`, l. 119) | The same scale in the same roles: 8px buttons and inputs, 12px cards, 16px sheets and dialogs, 6px tags. The pill only for statuses (grade, fallback badge, counts) | Claude's hierarchy suits a reader. A pill on an action reads as a marketing page |
| 36px circular icon buttons (`button-icon-circular`) | Circles too, at 44px; 44px minimum for every control on touch screens | The site's touch standard |
| "Colour-block first, shadow rare": a faint `0 1px 3px` on hover-elevated states (l. 415) | No shadow at rest or on hover. One shadow token, `--shadow-float`, only on what floats: menus, popovers, dialogs, sheets, back-to-top | Claude's own principle, applied strictly: a hover shadow pulls the eye off the text |
| Footer on dark `#181715` | Footer on the soft surface with a hairline | Same rule as the rest of the chrome: no dark band on a reading site |
| Dark surfaces for product mockups | Promoted to the full dark theme | Claude's dark ladder (page, card, raised), shifted to olive-black to match the bone paper, with the brand green lightened for links and buttons |

## Arabic, Bengali and multilingual modifications

These apply to every reference; none of the 84 files covers them.

- **Arabic**
  - Amiri, a Naskh face built for fully vowelled text, stays the default. The reader can
    choose others.
  - Line-height 2.0, so stacked harakat never collide.
  - Always `dir="rtl"` and `lang="ar"`.
  - No letter-spacing and no decoration behind the text.
- **Bengali**
  - Noto Sans Bengali (text) and Noto Serif Bengali (display) are bundled. They load only
    when Bengali characters are on the page (`unicode-range`).
  - Body line-height of at least 1.7, for vowel signs above and below the line.
- **All scripts**
  - No `text-transform` on interface strings: case rules differ by language.
  - Logical properties (`margin-inline-start`) wherever direction matters.
- **Grades** are shown exactly as the source states them, all in one neutral style. The
  design never colour-codes authenticity, because that would be an interpretation the
  data does not make.

## One language for the web and the app

No separate mobile codebase exists in the workspace. The only React Native project,
`deeni-tv-react-native-app`, is a TV app. The hadith "app" is this site itself, installed
from its web app manifest (`pages/manifest.webmanifest.js`). The web and the installed app
therefore share one set of tokens:

- `styles/_variables.scss` holds the light and dark themes.
- Mobile behaviour follows native conventions at phone widths:
  - 44px targets;
  - safe-area insets;
  - the header that slides away while reading;
  - sheets instead of popovers.

[hadith-design-system.md](hadith-design-system.md) lists every token in a
platform-neutral table, so a future native app can use the same values.

## Audit with the post's tools

The post that started this work names five tools. Awesome DESIGN.md chose the reference
(the sections above). The other four audited the result on 2026-11-03.

| Tool | How it was applied |
|---|---|
| Impeccable (`pbakaus/impeccable`) | Its audit rubric (five dimensions, 0–4 each) and its craft-floor bans, measured with a Playwright probe of the rendered pages and a source review. Its bundled detector did not run: this environment does not run downloaded code |
| Taste Skill (`Leonxlnx/taste-skill`) | Its colour families and anti-patterns, applied by hand and measured by the same probe. Its lint script did not run, for the same reason |
| Vercel Web Interface Guidelines | Every rule of its `command.md`, checked against the source |
| Playwright | The project's e2e suite on the vn, bd and ac editions, the responsive audit, and interaction checks: keyboard, dialogs, anchors, first paint, field sizes |

### Impeccable health score

Scored by hand against Impeccable's rubric (`reference/audit.md`), after the fixes below.

| # | Dimension | Score | Key finding |
|---|---|---|---|
| 1 | Accessibility | 3 | Keyboard paths, dialogs, names, headings, contrast and reduced motion verified in the browser; no known WCAG AA failure is left (the chapter select's 3.2.2 one is fixed). Not yet checked with a screen reader or an automated WCAG scanner |
| 2 | Performance | 3 | Fonts self-hosted and loaded per script; animations are opacity and transform, except the reading bar's `top`. 198–239 kB of JavaScript per page, mostly React and MUI, the same as before the redesign. Core Web Vitals were not measured |
| 3 | Theming | 4 | Every component colour is a semantic token in both themes. The 257 uses of the old alias names were renamed; the literals left are deliberate (print white, the theme previews) |
| 4 | Responsive | 3 | No overflow at 16 viewports from 320px to 2560px, WebKit included. 44px touch targets, except the reading bar's chapter select (36px tall inside the 44px bar) |
| 5 | Implementation integrity | 3 | The drift found is fixed and the unused switch component removed. Left: global CSS that nothing uses (`.content_wrapper` and others), not yet swept |
| | **Total** | **16/20** | **Good** (14–17 on Impeccable's scale) |

### What the audits found, and what changed

- **Dialogs.**
  - The phone's full-screen panels (categories, settings) were plain `div`s. They are
    dialogs now: focus moves to Back, Tab stays inside, Esc closes, and focus returns to
    the button that opened them.
  - Opened from the menu drawer, a panel lost focus to the page: the drawer's own focus
    trap pulled it back as the drawer closed. Fixed, with the menu button as the place
    focus returns to.
  - Closed panels are `inert`. The floating dialogs (share, bookmark add, delete and
    remove) have a role, `aria-modal`, a name and a labelled close button.
- **The sidebar tree** put each link inside the accordion's button: a control inside a
  control, and two Tab stops with one name. Each branch is now its link and a separate
  toggle that names what it opens ("Books of Sahih al-Bukhari").
- **Names and reading order.**
  - A skip link on every page.
  - The breadcrumb trail is named in the interface language, and its separator is not read.
  - 70 of the 72 icons were exposed to screen readers; all are hidden now.
  - The chapter filter, a link drawn as a switch, toggles on Space too.
  - Category counts are read with their meaning.
  - The share dialog's "Email" was English in every interface.
- **Fields.**
  - Three fields were under 16px, so iOS zoomed into them: the sidebar filter (13.3px),
    the chapter select (14px) and the translation-language select (15px). They are 16px on
    touch screens.
  - Filters are `type="search"`; references get no spell-check or autocorrect.
  - The sidebar's clear button was 22px. It is 44px, as are the tags, breadcrumb links and
    tree toggles on touch screens.
- **Behaviour.**
  - A link to a hadith landed 172px down the screen, 128px below the reading bar: the
    card's `scroll-margin` counted the header a second time, and the header's
    hide-on-scroll took the jump for reading down and slid away.
  - The target now lands 8px below the bar, whether the jump goes down or up, in-page or
    from a pin.
  - Saved reading settings (sizes, faces, Arabic shown, text order) apply before the first
    paint, like the theme, so the text no longer reflows when the scripts load.
  - Cmd/Ctrl-click on a pinned or recent hadith opens a new tab.
  - The page preconnects to the API, which the sidebar calls from the browser.
- **Motion and loading.**
  - Reduced motion now also covers the scroll helper, MUI's collapse and the chevrons.
  - `transition: all` is gone.
  - The reader's optional fonts use `font-display: swap`.
- **Notches.** The viewport is `viewport-fit=cover`, so everything fixed or full-bleed now
  pads the safe-area insets.
- **Design-system drift.**
  - A pill-shaped button: the phone header's categories button.
  - The bookmark dialogs were still the old design: pill buttons, a hard-coded red, a
    dashed rule, and transparent selects whose open list is unreadable in dark mode on
    Windows. They now use the system's dialog, buttons and fields, with the destructive
    button in `--error-txt`.
  - The phone panels mixed white and paper surfaces; they are one surface now.
  - Icon-only buttons were round in some places and square in others; all are 44px
    circles, as in Claude's `button-icon-circular`.
  - Dashed separators in the sidebar.
  - Tree rows rendered `class="undefined"`.

### Deliberate deviations

What the tools flag but the site keeps, and why:

- **Hairlines** on cards, tables and sticky bars, where Impeccable prefers space or tone.
  A dense reader needs the structure.
- **Tracking 0** where Claude tightens display type, for Arabic joining and Bengali
  conjuncts.
- **More than two typefaces.** One sans, one display serif, and an Arabic and a Bengali
  face: one per script, none for decoration.
- **No imagery.** A hadith reader has nothing to illustrate.
- **Long hadith titles as card headings.** They are the hadith's own titles, and
  screen-reader users move between hadiths by them.
- **The switch knob's 1px shadow**, the one shadow at rest: it shows the knob is the part
  that moves.
- **The reading bar animates `top`**, a layout property, for 200ms when the header slides.
  A transform can't replace it: before the bar sticks, it sits under the breadcrumbs, and
  a translated bar would cover them.

### Open issues, reviewed

The issues the audit left open, reviewed on 2026-11-03:

| Issue | Outcome |
|---|---|
| The chapter select navigated as soon as its value changed (WCAG 3.2.2). On Windows and Linux every arrow key changes a closed select, so keyboard users couldn't browse the list | **Fixed.** Arrow keys and typed letters browse; Enter opens the chapter shown; leaving the select puts the current chapter back. A pick from the open list or a phone's picker still opens it at once, and the select's description says so beforehand. Checked in Chromium and WebKit |
| Settings "Reset" had no undo | **Fixed.** "Settings reset." with Undo for ten seconds. Reset does nothing while the offer lasts, so a double click can't undo itself, and focus returns to Reset |
| A failed copy said nothing | **Fixed.** It says it couldn't copy |
| The footer year could differ between the server (UTC) and the reader's clock around New Year | **Fixed.** The browser keeps the server's year without a hydration error |
| Hadith cards had `h3` titles straight under the page's `h1` | **Fixed.** Cards are `h2` under a page title (chapter, a category's list, a bookmark folder) and `h3` under a section heading (search results, a category page) |
| The books and categories pages had English meta descriptions in every edition, and a category without an Arabic title had "()" in its description | **Fixed.** In the interface language |
| An unused `div`-based switch component | **Removed** |
| The reading bar animates `top` | **Kept**, see Deliberate deviations |
| The go-to placeholders ("e.g. Bukhari 1, Muslim 8a") don't end in "…" | **Kept.** They are examples of what to type, not an unfinished sentence |
| The bookmark tabs are not in the URL, so the back button and links can't reach a tab | **Open.** It changes the bookmarks page's URLs. Recommended: `?tab=pins` with `router.replace`, the bookmarks tab without a parameter |
| English strings use straight apostrophes | **Open**, for a copy pass over the English catalog. New strings use ’ |
| The 13 draft catalogs lack 14 keys from `own-data` | **Merged with `l10n-core`** (branch `integration/design-l10n`). They also lack 14 of `l10n-core`'s count and label templates: 28 strings each, shown in English until drafted and reviewed |
| On WebKit, the international edition's language menu test sometimes finds English after a reload (1 run in 3; on `l10n-core`'s own builds too). A scripted replay of the same steps passes | **Open.** Check on a real Safari before launch |

### Diff review before the first commit

An independent review of the whole diff (2026-11-03) found no new correctness bugs in its
logic, strings or tests. It found these, all fixed:

- **Choosing a translation font threw an error.** Its setter was never on the settings
  context (an older bug, not from this work). Fixed, and the settings test now chooses one.
- **Arabic-script characters in Latin text** (ﷺ in a translation, an Arabic title in a
  heading) reached next/font's metric fallbacks before Amiri. On Windows and macOS those
  fallbacks (local Arial and Times New Roman) cover Arabic. An Amiri face limited to the
  Arabic blocks now comes first.
- **Three kinds of icon-only button were still square:** the card actions, the reading
  bar's gear and the desktop header icons. They are circles now, as the rule says.
- **The header marked Books or Categories as the current page on every page inside it.**
  Now "page" on the section's own page and "true" below it.
- **Esc in the phone panel's filter closed the whole panel.** It now clears the text first.
- **Closed panels relied on `inert=""`,** which React 19 drops. It is now set on the
  element itself, which works on React 18 and 19.
- **The page's scrollbar kept the light colour in the dark theme.** `<html>` now gets the
  dark tokens too.
- **The alias comment claimed nothing used the old names,** but the focus ring and the
  scrollbar thumb did. They are derived tokens now, and no alias is used on this branch.
- **The deploy guide still promised the international edition's ribbon,** which only an
  edition without a logo shows now.
- **No e2e covered the new behaviour.** `scripts/e2e/keyboard.js` now covers it: the skip
  link, dialog focus, the sidebar tree, the chapter select, anchors, first paint, Undo,
  copy failure, heading levels and the header's current section.
