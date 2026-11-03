// End-to-end suite of hadith-vn: every feature, in a desktop (1366x768) and a
// phone (390x844, touch, isMobile) Chromium context; the tests marked smoke
// also run in WebKit (desktop and phone sizes). Expected values come from the
// hadith API, not from the page.
//
// Run (the dev server on :3000 and the API on :8090 must be up):
//
//   PLAYWRIGHT_CORE=/path/to/node_modules/playwright-core node --test scripts/e2e/
//
// playwright-core is not a project dependency; its browsers come from
// ~/.cache/ms-playwright. Environment:
//   BASE              site under test (default http://127.0.0.1:3000)
//   API               hadith API (default http://127.0.0.1:8090/api/hadith)
//   E2E_PROFILES      comma list of chromium-desktop, chromium-phone,
//                     webkit-desktop, webkit-phone (default: all four)
//   E2E_CONCURRENCY   profiles run side by side (default 2; 1 = one at a time)
//   E2E_NAV_TIMEOUT   ms for a navigation (default 90000: first visits compile)
//   BASE_BD           a second instance built for Bangladesh
//                     (NEXT_PUBLIC_COUNTRY_CODE=bd), e.g. http://127.0.0.1:3001:
//                     country.js tests it, platform.js checks it too; without it
//                     the country tests are skipped
//   SITE_NAME_BD      that instance's NEXT_PUBLIC_SITE_NAME, if it has one
//   BASE_AC           an instance built as the international edition
//                     (NEXT_PUBLIC_COUNTRY_CODE=ac), e.g. http://127.0.0.1:3002:
//                     international.js tests it; skipped without it
//   SITE_NAME_AC      that instance's NEXT_PUBLIC_SITE_NAME, if it has one
// provenance.js checks that no page of BASE, BASE_BD and BASE_AC names a data source.
//   NAMES_FIXTURE=1   the instances were built with NAMES_FIXTURE=1 (docs/DEPLOY.md):
//                     book names from scripts/e2e/fixtures/names (Bengali
//                     only), which language.js checks; without it the names
//                     expected come from lib/names
// One area only: node --test scripts/e2e/search.js
// Some tests:    node --test --test-name-pattern="go to hadith" scripts/e2e/
// Each profile runs its tests one at a time in a fresh browser context per
// test (empty localStorage and cookies); console errors and hydration
// warnings fail the test they happen in.
'use strict';

const { run } = require('./harness');

run([
  require('./smoke'),
  require('./navigation'),
  require('./goto'),
  require('./search'),
  require('./lists'),
  require('./hadith'),
  require('./translations'),
  require('./actions'),
  require('./settings'),
  require('./keyboard'),
  require('./brand'),
  require('./errors'),
  require('./platform'),
  require('./country'),
  require('./international'),
  require('./provenance'),
  require('./language'),
]);
