# Deploying hadith-vn

hadith-vn is a Next.js 13.5 site (Pages Router) that reads everything from the hadith
endpoints of the Quran API. The same code serves every country. Each country is a
separate build, run by its own Node.js process behind nginx.

- The API has its own runbook: `quran-api/docs/HADITH_DEPLOY.md`
  (on the dev machine: `/home/siam-al-sahariar/workspace/dit/quran-api/docs/HADITH_DEPLOY.md`).
  Deploy the API first: the site builds and renders from it.
- Production API: `https://api.alquranarabia.com/api` (hadith under `/api/hadith`).

## 1. Requirements

- **Node.js 20 or 22 LTS** (20.19+ or 22.12+; the scripts in `scripts/` need these) and npm.
- About 1.5 GB of free memory while `next build` runs, and 150–250 MB per running site.
- nginx with a TLS certificate per domain (e.g. Let's Encrypt via certbot).
- Outbound HTTPS from the server to the API. Readers' browsers call the API directly
  too (search, paging, lists), so the API must be public and HTTPS. Its CORS policy
  allows any origin.

## 2. One build per country

Every `NEXT_PUBLIC_*` value (and `GOOGLE_ANALYTICS_ID`) is written into the build, in
server and browser code, when `next build` runs. Changing one means building again.
Setting it only at `npm start` has no effect.

| Variable | Required | Meaning |
|---|---|---|
| `NEXT_PUBLIC_COUNTRY_CODE` | yes | Key of `config/countries.json`: `vn`, `bd`, `usa`, `kh`, `fr`, `ph`, `jp`, `de`, `cn`, `pt`, `kr`, `dk`, `sa`, `pk`, `ru`, `iq`, or `ac` for the international edition (section 2.1). |
| `NEXT_PUBLIC_SITE_URL` | yes | The site's public address at the root of its domain, e.g. `https://hadith.vn`. Used for canonical links, citations, share links, robots.txt and the sitemap. |
| `NEXT_PUBLIC_API_BASE_URL` | yes | The Quran API, e.g. `https://api.alquranarabia.com/api`. Must be HTTPS. |
| `NEXT_PUBLIC_SITE_NAME` | no | Site name in titles, the header and the web app manifest. Default: the country's `siteName`, else "Hadith". |
| `NEXT_PUBLIC_CONTACT_EMAIL` | no | The address readers write to. Default: the country's `contactEmail`. |
| `GOOGLE_ANALYTICS_ID` | no | GA4 measurement ID (`G-…`). Empty: no analytics. |
| `ALLOW_LOCAL_BUILD` | no | `1` lets a **local test build** use local or http addresses. Never set it for a build you deploy. |
| `NAMES_FIXTURE` | no | `1` (with `ALLOW_LOCAL_BUILD=1` only) replaces the book names with the end-to-end suite's few (`scripts/e2e/fixtures/names`). For test builds; never deploy one. |

The country decides:

- the default content language (the reader can pick another with the language menu, the
  globe in the header, or in the settings; the cookie `hadith_lang` keeps it and `?lang=`
  overrides it for one view);
- its own interface language (`ui`), for its default content language;
- the default site name, logo, accent colours (`accent`) and contact email. The accent
  belongs to the logo: the interface draws it only under the wordmark of an edition without
  a logo (docs/hadith-design-system.md).

**The interface follows the content language.** For the country's own `language` it is the
country's `ui` (so `kr` keeps a Korean interface over its English content); for any other
language it is that language's catalog when `lib/locales` has one, else the country's `ui`
again. A Bengali reader of hadith.vn gets the Bengali interface, and the book names in
Bengali (`lib/names/bn.json`); an Indonesian reader gets Indonesian hadiths in the
Vietnamese interface, and the language menu says so. `<html lang>`, `og:locale` and dates
follow the interface.

A country's `ui` is used when `lib/locales` has that catalog, else English.
`npm run check:sites` prints which interface each country gets. There is **no right-to-left
interface yet**: the catalogs of `ar`, `ur` and `ku` can be registered, but they stay unused
(their readers, `sa`, `pk` and `iq` included, get the English or the site's left-to-right
interface) until `RTL_INTERFACES` in `lib/i18n.js` is turned on, once the layout supports RTL.
Their content (Arabic, Urdu, Kurdish) is still shown right to left, because each text block
carries its own `dir`.

Interface catalogs and names:

- `lib/locales/<code>.js`, one per interface language, registered by one line in
  `lib/locales/index.js`: en, vi, bn, ru, ja, zh, ko, fr, de, pt, da, km, tl, ar, ur, ku. Those
  marked "draft" there were drafted by an AI and need a native speaker's review. Only English
  is in the scripts every page loads: each page gets its catalog with its data, and the 404
  and 500 pages, built once in the country's interface, load the reader's in the browser.
  Check them with `npm run i18n:missing`; a string a catalog lacks is shown in English.
- `lib/names/<code>.json`: the book names of one content language that a source attests
  (a Wikidata label, or the API's Arabic name), with that source in `bookSources`; applied to
  what the API returns. A book a file does not have, or a language without a file, keeps the
  API's (English) name. Chapters always keep the API's names.
- The topic collection (HadeethEnc's hadiths by category) is named by the interface, not by a
  source: the catalog string `topicCollection` ("Hadiths by Topic", "Hadith theo chủ đề" …),
  wherever the book's name is shown.
- The lists of categories (home page, category tree, sidebar) leave out the categories with
  nothing in the content language, except in Arabic; their pages still open by their URL.

### 2.1 The international edition (ac)

`NEXT_PUBLIC_COUNTRY_CODE=ac` builds **Hadith.ac**, one site for every language, like the
Quran team's Quran.ac. Its entry has `"international": true` and no `localization`: the Quran
database has no `ac` localization or country, and the site does not need one.

- **Content language**, for each request: `?lang=`, then the `hadith_lang` cookie (set by the
  language menu), then the best match of the browser's `Accept-Language` among the API's 72
  hadith languages (`bn-BD` gives `bn`, `zh-TW` gives `zh`, `fil` gives `tl`), then English.
- **Interface**: the content language's catalog when there is one, else English, as on every
  site (section 2). `<html lang>`, `og:locale` (`en_US`, `vi_VN`, `bn_BD`) and dates follow
  it. The 404 and 500 pages are built in English and switch in the browser.
- **Translations:** until the reader chooses (no `hadith_tr` cookie, no `?tr=`), English is
  shown under any other content language. The translations panel lists every language.
- **Home page:** "Hadith in all languages" and a directory of every language, linking to
  `/?lang=xx`.
- **Brand:** `public/img/logo_ac.png` and `logo_ac_dark.png` (rebuilt by
  `python3 scripts/logo-ac.py`) in its teal-blue-indigo accent, and `s_logo_ac.png` as the
  share image.

Pages depend on the request's `Accept-Language` and cookies, so the site sends
`Vary: Accept-Language, Cookie`. Do not cache its HTML in nginx or a CDN (the configuration
below caches only `/_next/static/`).

Build and run it like a country (sections 3 to 5), e.g. on port 3104:

```bash
NEXT_PUBLIC_COUNTRY_CODE=ac NEXT_PUBLIC_SITE_URL=https://hadith.ac \
NEXT_PUBLIC_API_BASE_URL=https://api.alquranarabia.com/api npm run build
npm start -- -p 3104 -H 127.0.0.1
```

To try it locally, next to the vn dev server, from a git worktree (two dev servers cannot share
one `.next`):

```bash
git worktree add --detach ../hadith-ac HEAD && ln -s "$PWD/node_modules" ../hadith-ac/node_modules
cd ../hadith-ac && NEXT_PUBLIC_COUNTRY_CODE=ac NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3002 \
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8090/api npx next dev -p 3002 -H 127.0.0.1
```

`next build` stops with an explanation, before compiling anything, when:

- `NEXT_PUBLIC_COUNTRY_CODE` is missing or not a key of `config/countries.json`, or that
  entry lacks `name`, `localization` (not for an international entry), `language`, `ui` or
  `ogLocale`, or has an `accent` that is not a list of `#rrggbb` colours;
- `NEXT_PUBLIC_SITE_URL` is missing, not an absolute http(s) URL, has a path, or points
  at localhost, 127.0.0.1, 0.0.0.0 or ::1 (http works but triggers a warning);
- `NEXT_PUBLIC_API_BASE_URL` is missing, not https, or local;
- `GOOGLE_ANALYTICS_ID` contains anything other than letters, digits and dashes.

`ALLOW_LOCAL_BUILD=1` skips the two URL checks, and only those, for trying a production
build on your own machine:

```bash
NEXT_PUBLIC_COUNTRY_CODE=bd NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3001 \
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8090/api ALLOW_LOCAL_BUILD=1 npm run build
npm start -- -p 3001 -H 127.0.0.1
```

## 3. Build and run one site

The layout used below, for each country:

```
/srv/hadith/<country>/
  build.env             the build variables (section 2)
  releases/<timestamp>/ one checkout each, with its node_modules and .next
  current -> releases/<timestamp>
```

`/srv/hadith/vn/build.env`:

```bash
NEXT_PUBLIC_COUNTRY_CODE=vn
NEXT_PUBLIC_SITE_URL=https://hadith.vn
NEXT_PUBLIC_API_BASE_URL=https://api.alquranarabia.com/api
GOOGLE_ANALYTICS_ID=
```

`/srv/hadith/bd/build.env` (use the real Bangladesh domain):

```bash
NEXT_PUBLIC_COUNTRY_CODE=bd
NEXT_PUBLIC_SITE_URL=https://bd.hadith.example
NEXT_PUBLIC_API_BASE_URL=https://api.alquranarabia.com/api
NEXT_PUBLIC_SITE_NAME=Hadith
GOOGLE_ANALYTICS_ID=
```

Build a release, as the `hadith` user:

```bash
SITE=bd
REL=/srv/hadith/$SITE/releases/$(date +%Y%m%d-%H%M%S)
git clone --depth 1 --branch <release-tag-or-branch> <repository-url> "$REL"
cd "$REL"
npm ci                                   # exact versions from package-lock.json
set -a; . /srv/hadith/$SITE/build.env; set +a
npm run check:sites -- $SITE             # the country's table entry against the API it will use
npm run build                            # fails early on a wrong variable (section 2)
```

Try it before switching, on a free port (the live site keeps its own). `npm start` is
`next start`:

```bash
npm start -- -p 3199 -H 127.0.0.1 &      # then browse or curl http://127.0.0.1:3199/
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3199/
kill %1
```

Switch `current` and restart the service (section 4):

```bash
ln -sfn "$REL" /srv/hadith/$SITE/current.new && mv -T /srv/hadith/$SITE/current.new /srv/hadith/$SITE/current
sudo systemctl restart hadith@$SITE
```

`check:sites` reads the API from `API`, else from `NEXT_PUBLIC_API_BASE_URL`. It checks
that `/api/localizations` maps the country's localization to it, and that
`/api/hadith/home/localizations/{localization}` answers in the country's language.

## 4. Keep it running

Use one process per country, bound to 127.0.0.1. Only nginx is public.

### systemd (recommended)

`/etc/systemd/system/hadith@.service` (`%i` is the country):

```ini
[Unit]
Description=Hadith site (%i)
After=network-online.target
Wants=network-online.target

[Service]
User=hadith
Group=hadith
WorkingDirectory=/srv/hadith/%i/current
# PORT=3101 for vn, 3102 for bd ...
EnvironmentFile=/srv/hadith/%i/run.env
Environment=NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
ExecStart=/usr/bin/node node_modules/next/dist/bin/next start -H 127.0.0.1 -p ${PORT}
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/srv/hadith/%i

[Install]
WantedBy=multi-user.target
```

```bash
echo PORT=3102 | sudo tee /srv/hadith/bd/run.env
sudo systemctl daemon-reload
sudo systemctl enable --now hadith@bd
journalctl -u hadith@bd -f               # the logs; API failures are logged as [hadith-api] ...
```

- `WorkingDirectory` follows the `current` link when the service starts, so a restart
  picks up the new release.
- `ExecStart` needs a system-wide Node.js (e.g. the NodeSource package in `/usr/bin`).
  A Node.js installed with nvm under a home directory is hidden by `ProtectHome`.

### PM2 (alternative)

`/srv/hadith/ecosystem.config.js`:

```js
module.exports = {
  apps: [
    { name: "hadith-vn", cwd: "/srv/hadith/vn/current", script: "/srv/hadith/vn/current/node_modules/next/dist/bin/next",
      args: "start -H 127.0.0.1 -p 3101", env: { NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1" } },
    { name: "hadith-bd", cwd: "/srv/hadith/bd/current", script: "/srv/hadith/bd/current/node_modules/next/dist/bin/next",
      args: "start -H 127.0.0.1 -p 3102", env: { NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1" } },
  ],
};
```

```bash
pm2 start /srv/hadith/ecosystem.config.js && pm2 save && pm2 startup   # then: pm2 restart hadith-bd
```

## 5. nginx

The same headers for every response, in `/etc/nginx/snippets/hadith-headers.conf`. Next.js
sends the last four itself, so nginx hides those copies to avoid duplicates. Keep
`includeSubDomains` off HSTS unless every subdomain is HTTPS.

```nginx
proxy_hide_header X-Content-Type-Options;
proxy_hide_header X-Frame-Options;
proxy_hide_header Referrer-Policy;
proxy_hide_header Permissions-Policy;
add_header Strict-Transport-Security "max-age=31536000" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
```

`/etc/nginx/sites-available/hadith-bd.conf` (one file per country: change the domain,
the port and the certificate paths):

```nginx
upstream hadith_bd {
    server 127.0.0.1:3102;
    keepalive 16;
}

server {
    listen 80;
    listen [::]:80;
    server_name bd.hadith.example;
    return 301 https://$host$request_uri;
}

server {
    # nginx 1.25.1+: "listen 443 ssl;" and "listen [::]:443 ssl;" plus "http2 on;"
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name bd.hadith.example;

    ssl_certificate     /etc/letsencrypt/live/bd.hadith.example/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bd.hadith.example/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:SSL:10m;

    include snippets/hadith-headers.conf;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/javascript application/json application/xml
               application/manifest+json image/svg+xml;

    client_max_body_size 1m;             # the site takes no uploads

    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header Connection "";
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 60s;

    # Next.js's image optimizer is off (images.unoptimized in next.config.js); refuse
    # the route anyway, as defense in depth against its known vulnerabilities.
    location ^~ /_next/image {
        deny all;
    }

    # Build assets have content hashes in their names: cache them for a year.
    location ^~ /_next/static/ {
        proxy_pass http://hadith_bd;
        proxy_hide_header Cache-Control;
        include snippets/hadith-headers.conf;   # add_header here replaces the server's
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }

    location / {
        proxy_pass http://hadith_bd;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/hadith-bd.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Without `always`, the year-long `Cache-Control` only applies to successful answers. A 404
for a file of an older build is therefore not cached.

This configuration was checked with nginx 1.24 in front of a bd production build:
- http redirects to https;
- every header above appears once, and `X-Powered-By` is gone;
- HTML and scripts are gzipped and served over HTTP/2;
- `/_next/image` answers 403;
- hashed assets carry the immutable header, and a missing asset's 404 does not.

## 6. Health check

```bash
# the Node process (no API call):
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3102/robots.txt
# the whole path: nginx, Node and the API (the home page renders from the API):
curl -fsS -o /dev/null -w '%{http_code} %{time_total}s\n' https://bd.hadith.example/
# the API alone:
curl -fsS -o /dev/null https://api.alquranarabia.com/api/hadith/languages
```

- When the API is down, pages answer **502** with an error message and a retry button.
- An exception in a page answers **500** with the site's error page.
- Unknown books, chapters, hadiths and categories answer **404**.
- `/sitemap.xml` answers **503** with `Retry-After` while the API is unreachable.

Point the uptime monitor at the home page (`200`) and the Node check at `robots.txt`.

## 7. Update and roll back

- **Update:** build a new release (section 3), check it on its port, switch `current`,
  then `systemctl restart hadith@<country>`. The old release stays on disk. Keep the
  last three and delete older ones:

  ```bash
  ls -1dt /srv/hadith/bd/releases/* | tail -n +4 | xargs -r rm -rf
  ```

- **Roll back:** point `current` at the previous release and restart. Nothing has to be
  rebuilt:

  ```bash
  PREV=$(ls -1dt /srv/hadith/bd/releases/* | sed -n 2p)
  ln -sfn "$PREV" /srv/hadith/bd/current.new && mv -T /srv/hadith/bd/current.new /srv/hadith/bd/current
  sudo systemctl restart hadith@bd
  ```

- Readers who have a page open during a switch may request a script of the old build
  that no longer exists. Next.js then reloads the page, so nothing breaks.
- Changing a variable (a new domain, another API, the analytics ID) is a new build.

## 8. Several countries on one server

Each country gets its own directory, build, port, service and nginx server block:

| Country | Domain (example) | Port | Directory | Service |
|---|---|---|---|---|
| vn | hadith.vn | 3101 | /srv/hadith/vn | hadith@vn |
| bd | bd.hadith.example | 3102 | /srv/hadith/bd | hadith@bd |
| usa | en.hadith.example | 3103 | /srv/hadith/usa | hadith@usa |
| ac | hadith.ac | 3104 | /srv/hadith/ac | hadith@ac |

- Give each country its own domain or subdomain. The site must be at the root of its
  domain: it has no base path.
- Each domain also keeps its own reader cookies (preferred content language, settings).
- Build one country at a time on small servers (`next build` is memory hungry).
- The running sites share nothing and can be updated or rolled back one by one.

## 9. Before launch

Run these against a production build of the country (`ALLOW_LOCAL_BUILD=1` on a test
machine, or the staging domain). The browser tests need playwright-core and its
browsers; set `PLAYWRIGHT_CORE` to the installed package.

- [ ] `npm run check:sites -- <country>` against the production API: "matches the API".
- [ ] `npm run i18n:missing`: no gaps in any catalog.
- [ ] `PLAYWRIGHT_CORE=… npm run check:countries [-- <country> …]` on a checkout with the
      API reachable: it serves the site once per country (on port 3001, from a temporary
      worktree) and checks the interface language, og:locale, site name, book names,
      category titles and the translations shown against the API. "0 failed check(s)".
      For each country it also picks another language in the language menu (Bengali; English
      on bd) and checks that the content and the interface follow and that it is kept. For
      `ac` it checks readers whose browsers ask for en-US, bn-BD, vi-VN, fr-FR and ur-PK
      instead (content and interface languages, `<html lang>`, the English shown beside other
      languages, the language directory against `/hadith/languages`), then the language menu,
      `?lang=`, the cookies and a directory link. With `NAMES_FIXTURE=1` the servers and the
      checks use the e2e suite's names.
- [ ] The interface catalogs have been reviewed by native speakers. Those drafted by an AI
      (marked "draft" in `lib/locales/index.js`) need this before any site offers them, and
      every site offers every registered catalog to the readers who pick its language.
- [ ] End-to-end suite, against test builds made with `NAMES_FIXTURE=1` (and
      `ALLOW_LOCAL_BUILD=1`): `NAMES_FIXTURE=1 BASE=<vn site> BASE_BD=<bd site>
      BASE_AC=<ac site> PLAYWRIGHT_CORE=… npm run test:e2e`. All tests pass. The Vietnamese
      suite runs against a vn site, with the API's names (the fixture has Bengali names only,
      which `scripts/e2e/language.js` checks); `scripts/e2e/country.js` runs against `BASE_BD`
      and `scripts/e2e/international.js` against `BASE_AC` (each is skipped when its variable
      is not set).
- [ ] Responsive audit of the main pages, Chromium at every viewport and WebKit at phone and
      tablet sizes: `BASE=<site> node scripts/responsive-audit/audit.js <out> --engine=chromium`,
      then `python3 scripts/responsive-audit/summarize.py <out>/results-chromium.json`.
      No horizontal overflow. Also with the language menu open, `--click='button[data-language-menu]'`,
      and for ac with the browser in another language, `--locale=bn-BD`.
- [ ] `https://<domain>/robots.txt` names `https://<domain>/sitemap.xml`. The sitemap lists
      `https://<domain>/…` URLs. Submit it in Google Search Console.
- [ ] `curl -sI https://<domain>/` shows HSTS and the other headers, with no `X-Powered-By`.
      `/_next/image` answers 403, and an unknown URL answers 404 with the site's page.
- [ ] Titles end in the right site name. `og:locale` is the country's (e.g. `bn_BD`), and
      `<html lang>` is the interface language; both follow a reader who picks another language
      that has a catalog (`en_US`, `vi_VN`, `bn_BD` …).
- [ ] The contact address (`NEXT_PUBLIC_CONTACT_EMAIL` or the country's `contactEmail`) is
      read by someone.
