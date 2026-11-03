# hadith-vn

A multilingual hadith reading site. Arabic originals with translations in up to 72
languages, read from the hadith API inside the Quran API.

- **Stack:** Next.js 13.5 (Pages Router, plain JS), SCSS modules, and MUI 7 for menus,
  drawers and modals only.
- **Builds:** one build per country edition (`NEXT_PUBLIC_COUNTRY_CODE`); see `docs/DEPLOY.md`.

## Design: act as this product's frontend architect

The visual system is fixed and documented. Follow it; do not restyle from habit.

- **Read first:**
  - `docs/hadith-design-system.md` — the system.
  - `docs/design-system-selection.md` — why it looks this way: the Claude reference from
    awesome-design-md, adapted.
  - `styles/_variables.scss` — the only place colours, type, space and radii are defined.
- **Tokens only.** Components use `var(--canvas)`, `var(--text)`, `var(--accent)` and the
  rest. No hex in a component. The old names (`--bg11`, `--txt11`, `--main-color`) are
  aliases kept for other branches; do not use them.
- **One colour.**
  - The logo green (`--accent`) marks actions, links, the current item and focus.
  - Text on it is `var(--on-accent)`, never `#fff`; in the dark theme the accent is
    light green.
  - Grades are shown as the source states them, in one neutral style, never colour-coded.
- **Type.** No `letter-spacing` and no `text-transform` on text. Any string may be
  Bengali, Arabic or Vietnamese: tracking breaks Arabic joining and Bengali conjuncts.
  - The display serif (`--font-display`) is for page, section and hadith titles, at
    weight 400.
  - Everything else uses the interface face.
- **Arabic.** Arabic hadith text is `lang="ar" dir="rtl" translate="no"`, line-height 2,
  and nothing decorative sits behind it.
- **Shapes.** Buttons and inputs 8px, cards 12px, sheets 16px. Icon-only buttons are 44px
  circles (steppers and a button inside a field excepted). Pills only for statuses (grade, fallback badge, counts), never for actions.
  44px minimum for every control on touch screens (`(pointer: coarse)` where a mouse
  layout is smaller).
- **Depth.** Tone steps and hairlines. A shadow (`--shadow-float`) only on what floats:
  menus, popovers, dialogs, sheets, the back-to-top button.
- **Do not add:**
  - gradients, glass, or emoji or unicode glyphs as icons (use `components/icons`);
  - a small label (eyebrow) above a heading;
  - index numbers that carry no information;
  - big-number stat strips;
  - coloured side stripes on cards or notices.
- **Motion.** Colour and opacity, about 160ms (`--duration`, `--ease`). Under
  `prefers-reduced-motion`, remove travel (slides, turns, scaling) in the module that
  styles it, and keep the feedback. Never add a global kill.
- **Every interactive element has every state:** hover (inside `@media (hover: hover)`),
  `:focus-visible` (the global ring), disabled, and loading. A form that navigates uses
  `hooks/useSubmitBusy` → `aria-busy` on its button.
- **Controls.**
  - Never put a control inside another: no link inside a button (the sidebar tree is a
    link plus a separate toggle, `Branch` in `components/sidebar`).
  - Icon-only buttons get an `aria-label` from the catalogs. The SVGs in
    `components/icons` are `aria-hidden`; keep new ones the same.
  - Fields: 16px text on touch screens (iOS zooms otherwise), the right `type`, a label.
  - A select that navigates lets the keyboard browse: arrow keys change the value, Enter
    opens it (`ChapterSwitcher` on the chapter page).
  - A reset or delete can be taken back (Undo), or asks first.
- **Dialogs.** A floating dialog uses `components/utils/ModalPrimary` (MUI Modal, which
  traps focus); a phone full-screen panel uses `ModalSecondary`. Either way: `role="dialog"`,
  `aria-modal`, a name (`aria-labelledby` its `h2`), Esc closes, focus goes in and comes back.
- **Fixed and full-bleed elements** pad `env(safe-area-inset-*)`: the viewport is
  `viewport-fit=cover`.
- **Anchors.** `html`'s `scroll-padding-top` clears the header and the reading bar; never
  add a `scroll-margin` on top of it.
- **Light and dark** both ship. `pages/_document.js` applies the saved theme and reading
  typography before the first paint; it mirrors `applyTypography` in
  `contexts/SettingsContext.js`, so change both together. Check both themes.

## Content integrity (non-negotiable)

- Show only what the API's sources state: no invented hadith text, translations, grades,
  references or names. Never machine-translate hadith text or book, chapter or category
  names.
- No data-source names in the interface. The one exception is HadeethEnc's source line
  under its content, which its terms require.
- Interface strings live in `lib/locales/*.js`, one catalog per language (English is the
  fallback and the one in the bundle; the others load with the page). A new string needs
  every catalog, with plural forms where the count is a number; `npm run i18n:missing`
  checks. The interface follows the content language when it has a catalog.

## Verify before calling UI work done

Local test builds need the API on `http://127.0.0.1:8090` (Docker container
`quran-api-dev`).

```bash
NEXT_PUBLIC_COUNTRY_CODE=bd npx next dev -p 3000          # look at it
NEXT_PUBLIC_COUNTRY_CODE=vn NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000 \
  NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8090/api ALLOW_LOCAL_BUILD=1 npx next build
PLAYWRIGHT_CORE=<playwright-core> BASE=http://127.0.0.1:3000 BASE_BD=... BASE_AC=... npm run test:e2e
BASE=http://127.0.0.1:3000 node scripts/responsive-audit/audit.js <out> --engine=chromium
```

`scripts/e2e/brand.js` asserts the visual identity: update it with any deliberate design
change. Tests find the breadcrumb trail by its translated name (`BREADCRUMB_NAV` in
`scripts/e2e/harness.js`).

Look at the result in a real browser, as screenshots:
- phone (320–430px), tablet and desktop;
- light and dark;
- Bengali and Arabic pages;
- WebKit as well as Chromium (iPhone Safari bugs only show there).
