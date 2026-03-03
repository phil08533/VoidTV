# VoidTV

**A production-ready, open-source streaming PWA for verified public domain films.**

Classic cinema, free forever.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Public Domain Verification Policy](#2-public-domain-verification-policy)
3. [Monetization Approach](#3-monetization-approach)
4. [Scraper Strict Mode](#4-scraper-strict-mode)
5. [Deploying to GitHub Pages](#5-deploying-to-github-pages)
6. [Applying for Google AdSense](#6-applying-for-google-adsense)
7. [Legal Disclaimers](#7-legal-disclaimers)
8. [Future Scalability Path](#8-future-scalability-path)
9. [Updating movies.json Safely](#9-updating-moviesjson-safely)
10. [Development Setup](#10-development-setup)
11. [Environment Variables](#11-environment-variables)
12. [PWA & Service Worker](#12-pwa--service-worker)
13. [Contributing](#13-contributing)

---

## 1. Architecture Overview

VoidTV is a **pure static single-page application** (SPA) with zero backend infrastructure. Every feature runs client-side.

```
VoidTV/
├── public/
│   ├── movies.json          # Film catalog — source of truth
│   ├── manifest.json        # PWA manifest
│   ├── sw.js                # Service Worker (cache strategy)
│   └── icons/               # PWA icons (SVG + PNG)
│
├── src/
│   ├── main.jsx             # Entry point, SW registration, AdSense injection
│   ├── App.jsx              # Router setup (HashRouter for GH Pages)
│   ├── index.css            # Global styles, CSS custom properties, green theme
│   │
│   ├── context/
│   │   └── AppContext.jsx   # Global state via React Context API
│   │
│   ├── hooks/
│   │   ├── useLocalStorage.js   # Generic localStorage hook
│   │   ├── useMovies.js         # Fetch/cache movies.json
│   │   └── useTheme.js          # Dark/light mode with system preference
│   │
│   ├── utils/
│   │   └── storage.js       # Typed localStorage wrappers
│   │                        # (favorites, recently watched, playlists, progress)
│   │
│   ├── components/
│   │   ├── Navbar.jsx       # Fixed navigation, theme toggle, mobile menu
│   │   ├── Hero.jsx         # Auto-rotating featured film hero section
│   │   ├── MovieCard.jsx    # Lazy-loading card with IntersectionObserver
│   │   ├── MovieRow.jsx     # Horizontal scroll row, drag-to-scroll, fade edges
│   │   ├── AdBanner.jsx     # Google AdSense banner wrapper
│   │   ├── Footer.jsx       # Legal footer with PD notice
│   │   ├── PlaylistModal.jsx  # Create/manage playlists
│   │   └── SearchOverlay.jsx  # Full-screen search with live results
│   │
│   └── pages/
│       ├── Home.jsx         # Landing page with hero + genre rows
│       ├── MovieDetail.jsx  # Player page with metadata
│       ├── SearchPage.jsx   # Search + filter + sort
│       ├── Playlists.jsx    # Favorites + custom playlists
│       └── NotFound.jsx     # 404
│
├── scraper/
│   ├── scraper.py           # Internet Archive metadata scraper
│   ├── config.py            # Scraper configuration & manual review queue
│   └── requirements.txt     # Python dependencies
│
├── package.json
├── vite.config.js
└── index.html
```

### Technology Choices

| Concern            | Solution                              | Why                                              |
|--------------------|---------------------------------------|--------------------------------------------------|
| Frontend framework | React 18                              | Ecosystem, hooks, concurrent rendering           |
| Build tool         | Vite 5                                | Fast HMR, tree-shaking, minimal config           |
| Routing            | React Router v6 (HashRouter)          | HashRouter works without server rewrites on GH Pages |
| State management   | React Context + localStorage hooks    | No external dependency; fits app complexity      |
| Styling            | CSS Custom Properties + plain CSS     | Zero runtime overhead; excellent theming support |
| Video delivery     | iframe embeds (Internet Archive)      | Never re-host — legal, scalable, free            |
| PWA                | Manifest + custom Service Worker      | No build plugin dependency; full control         |
| Deployment         | GitHub Pages + gh-pages npm package   | Free, reliable, matches static constraint        |
| Ads                | Google AdSense (async, banner-only)   | Non-intrusive; compliant with AdSense policies   |

### Data Flow

```
User loads page
    → React fetches /public/movies.json
    → AppContext distributes movie data to all components
    → User interactions write to localStorage
    → No server calls except: movies.json fetch, thumbnail loads, video embed
```

### Theming System

VoidTV uses **CSS Custom Properties** for a fully-declarative dual theme:

- **Dark mode** (default): Deep forest green backgrounds (`#050e05`) with emerald accent (`#4ade80`)
- **Light mode**: Soft mint backgrounds (`#f0fdf4`) with forest green accent (`#16a34a`)
- Theme preference saved to `localStorage`; respects `prefers-color-scheme` on first visit
- Theme toggle in navbar; instant switch with CSS transitions

---

## 2. Public Domain Verification Policy

VoidTV takes a **strict, conservative approach** to public domain classification. We do not speculate. We do not assume.

### The Three-Tier Verification Standard

**Tier 1 — Pre-1928 (Automatic Acceptance)**

Films published before January 1, 1928 are definitively in the US public domain. Under 17 U.S.C. §304 and the Sonny Bono Copyright Term Extension Act, all works published before 1928 entered the public domain on January 1, 2024. This rule is unambiguous, well-established, and requires no case-by-case analysis.

*This covers the vast majority of VoidTV's catalog — silent films, early cinema, newsreels, and shorts from 1888–1927.*

**Tier 2 — 1928–1963 Non-Renewed (Manual Verification Required)**

Films from 1928–1963 may be in the public domain if their copyright was not renewed within 28 years of publication. Renewal was required under the 1909 Copyright Act; failure to renew placed the work in the public domain.

**VoidTV's policy**: These films are NEVER automatically accepted by the scraper. They require:
1. Manual check of the US Copyright Office Catalog at https://cocatalog.loc.gov/
2. Search for "Motion Picture" (class MP) renewals under the film's title
3. Written documentation of the result in `scraper/config.py` under `MANUALLY_VERIFIED`
4. The entry must include: who checked, when, and what was found (or not found)

**Tier 3 — US Government Works (Automatic Acceptance)**

Works created by US Federal Government employees as part of their official duties are not eligible for copyright under 17 U.S.C. §105. VoidTV automatically accepts films whose metadata clearly identifies a federal agency as creator (NASA, USDA, DoD, etc.).

### What VoidTV Explicitly Rejects

- Any film where the public domain status is unclear
- Films from 1928+ without documented renewal-status verification
- Films from foreign countries where PD status differs from the US
- Films with disputed rights or pending legal questions
- Anything tagged `needs_manual_review` in config.py that hasn't been verified

### The `verified_public_domain: true` Flag

Every film in `movies.json` carries `"verified_public_domain": true`. This flag means:

> "At least one of VoidTV's three verification tiers has been met, AND this has been reviewed."

Setting this flag manually without completing verification is a violation of VoidTV's contribution policy. PRs that add films without proper `pd_reason` and `pd_notes` will be rejected.

### Film-Level Metadata Fields

```json
{
  "verified_public_domain": true,
  "pd_reason": "pre_1928",
  "pd_notes": "Published 1922. Works published before January 1, 1928 entered the US public domain on January 1, 2024 under 17 U.S.C. §304."
}
```

Valid `pd_reason` values:
- `pre_1928` — Published before 1928; US copyright definitively expired
- `non_renewed` — 1928–1963; copyright not renewed; manually verified
- `gov_work` — US Government work; not eligible for copyright under §105
- `explicit_pd` — Rights holder explicitly dedicated to public domain (CC0, etc.); manually verified

---

## 3. Monetization Approach

VoidTV monetises through **non-intrusive Google AdSense banner ads only**.

### Ad Placement Philosophy

VoidTV's monetization must never compromise the viewing experience:

| Placement          | Format            | Location                                  |
|--------------------|-------------------|-------------------------------------------|
| Below hero section | Leaderboard (728×90) | Home page, below the hero film feature |
| Movie detail page  | Leaderboard (728×90) | Above the video player                 |

### Absolute Restrictions

- **No popups or interstitials** — ever
- **No autoplay ads** — ever
- **No ads that obscure content**
- **No tracking beyond AdSense standard analytics**
- **No selling user data** — VoidTV stores nothing server-side
- **No ads within the video player** — we use third-party embeds and don't control them

### Revenue Context

VoidTV is a free, open-source project. Ad revenue, if any, covers hosting costs (minimal for a static site) and supports ongoing development and public domain research.

### Configuring AdSense

1. Apply for AdSense (see Section 6)
2. Create your ad units in the AdSense dashboard
3. Set environment variables (see Section 11)
4. The `AdBanner` component handles the rest

---

## 4. Scraper Strict Mode

The Python scraper in `scraper/` is VoidTV's tool for expanding the film catalog.

### Running the Scraper

```bash
cd scraper
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Standard run (strict mode, writes to ../public/movies.json)
python scraper.py

# Dry run (no file written)
python scraper.py --dry-run

# Limit to first 50 films
python scraper.py --limit 50

# Verbose output
python scraper.py --verbose

# Non-strict mode (allows explicit_pd without manual review)
# WARNING: Not recommended for production
python scraper.py --no-strict
```

### What Strict Mode Does

In strict mode (`--strict`, enabled by default):

1. **Pre-1928 films** are automatically accepted. No manual review.
2. **1928–1963 films** are *always rejected* with a logged reason. They must be manually verified via the Copyright Office and added to `config.py → MANUALLY_VERIFIED`.
3. **Government works** are accepted if metadata clearly identifies a federal agency.
4. **Explicit PD claims** (self-reported PD in description) are rejected. Must be manually verified.
5. **Everything else** is rejected.

### Rejection Log

Every rejected film is logged with its reason:

```
REJECTED "some-film-1940": STRICT MODE: Film from 1940 requires US Copyright Office renewal check.
Title: 'Some Film'. Run with --check-renewals flag or verify manually at https://cocatalog.loc.gov/
```

This log is your manual review queue.

### Manual Review Workflow

1. Run the scraper with `--verbose`
2. Note the FLAGGED items in the output
3. For each flagged item, search the US Copyright Office catalog
4. If NOT renewed: add to `config.py → MANUALLY_VERIFIED` with citation
5. If renewed: add to `config.py → BLOCKLIST`
6. Re-run the scraper — manually verified films are included

### Scraper Output Format

The scraper writes a `movies.json` that is identical in structure to the hand-curated file. Internal scraper metadata (`_scraper_meta`) is stripped before writing.

### Content Warnings

Films with sensitive historical content are configured in `config.py → CONTENT_WARNINGS`. VoidTV displays a dismissible warning modal before these films play.

---

## 5. Deploying to GitHub Pages

VoidTV is designed for zero-cost deployment on GitHub Pages.

### Initial Setup

```bash
# 1. Fork or clone the repository
git clone https://github.com/phil08533/VoidTV.git
cd VoidTV

# 2. Install dependencies
npm install

# 3. Update the base URL in vite.config.js
# Change '/VoidTV/' to match YOUR repository name:
# base: '/your-repo-name/'

# 4. Update package.json homepage field:
# "homepage": "https://YOUR-USERNAME.github.io/your-repo-name"

# 5. Build the app
npm run build

# 6. Deploy to GitHub Pages
npm run deploy
```

The `npm run deploy` command:
1. Runs `vite build` → creates `dist/`
2. Runs `gh-pages -d dist` → pushes `dist/` to the `gh-pages` branch

### GitHub Pages Configuration

In your GitHub repository settings:
- **Pages → Source**: `Deploy from a branch`
- **Branch**: `gh-pages`, `/ (root)`

Your site will be live at: `https://YOUR-USERNAME.github.io/your-repo-name/`

### Custom Domain (Optional)

To use a custom domain (e.g. `www.voidtv.app`):

1. Add a `CNAME` file to the `public/` directory:
   ```
   www.voidtv.app
   ```
2. Update `vite.config.js → base: '/'`
3. Update `package.json → homepage: 'https://www.voidtv.app'`
4. Configure DNS with your registrar (CNAME to `YOUR-USERNAME.github.io`)
5. Enable "Enforce HTTPS" in GitHub Pages settings

### Automated CI/CD (Recommended)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy VoidTV

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
        env:
          VITE_ADSENSE_PUBLISHER_ID: ${{ secrets.VITE_ADSENSE_PUBLISHER_ID }}
          VITE_ADSENSE_SLOT_HERO: ${{ secrets.VITE_ADSENSE_SLOT_HERO }}
          VITE_ADSENSE_SLOT_DETAIL: ${{ secrets.VITE_ADSENSE_SLOT_DETAIL }}
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

Store AdSense credentials as GitHub Secrets, not in code.

---

## 6. Applying for Google AdSense

### Prerequisites

Before applying, your site must have:

- At least 20–30 pages of original, quality content
- Clear navigation and a professional appearance
- A privacy policy page
- A contact method
- Original, non-copyright-infringing content
- Consistent traffic (even modest amounts help)

VoidTV, with its curated public domain catalog and clean UI, meets these requirements.

### Application Process

1. **Visit** https://www.google.com/adsense/start/
2. **Sign in** with your Google account
3. **Add your site URL** (e.g. `https://your-username.github.io/VoidTV`)
4. **Connect AdSense** by adding the site verification code to your `index.html`
5. **Submit for review** — Google reviews within 1–14 days

### After Approval

1. Create ad units in the AdSense dashboard:
   - **Home Hero Ad**: Auto (Responsive), "Leaderboard" format
   - **Movie Detail Ad**: Auto (Responsive), "Leaderboard" format
2. Note your Publisher ID (format: `ca-pub-XXXXXXXXXXXXXXXXX`)
3. Note each ad unit's Slot ID (a 10-digit number)
4. Set environment variables (see Section 11)
5. Rebuild and deploy

### AdSense Compliance for VoidTV

VoidTV is designed with AdSense policies in mind:
- No adult content (age-restricted films carry clear warnings)
- No deceptive ad placement
- No artificial traffic generation
- Ads are clearly labeled "Advertisement"
- No more than 3 display ads per page

---

## 7. Legal Disclaimers

### Public Domain Status

All films listed on VoidTV have been individually evaluated against US copyright law. VoidTV makes no representations about copyright status in jurisdictions outside the United States. Laws vary by country; what is public domain in the US may still be under copyright elsewhere.

### "Public Domain" Does Not Mean "Freely Usable for All Purposes"

Public domain status means VoidTV may stream, display, and link to these films without a license. It does not mean:
- You can use clips for commercial purposes without further research
- The film's soundtrack (if any) is also public domain
- Derivative works are automatically permitted

### Third-Party Video Hosting

VoidTV does not host, encode, store, or distribute any video files. All video content is embedded via `<iframe>` from third-party hosts, primarily the Internet Archive (archive.org). VoidTV has no control over third-party content availability, quality, or continued hosting.

### Accuracy Disclaimer

VoidTV makes every reasonable effort to verify public domain status, but we are not attorneys, and nothing on this site constitutes legal advice. If you are making commercial use of films found through VoidTV, consult an intellectual property attorney.

### DMCA / Content Removal

If you believe a film has been incorrectly classified as public domain or that VoidTV is infringing on your copyright:

1. Open an issue at https://github.com/phil08533/VoidTV/issues
2. Include: the film title, your claimed rights, and supporting documentation
3. We will review within 72 hours and remove the film if the claim is valid

VoidTV complies with the Digital Millennium Copyright Act (DMCA).

### Privacy

VoidTV does not collect, store, or transmit personal data. All user preferences (favorites, playlists, watch history, theme) are stored exclusively in the user's own browser via `localStorage`. VoidTV has no user accounts, no login, and no server-side storage.

Google AdSense may set cookies for ad personalization per Google's Privacy Policy. Users in the EU/EEA should review Google's AdSense user consent requirements.

---

## 8. Future Scalability Path

VoidTV's architecture deliberately constrains to a pure static site. Here is the recommended progression if the project grows:

### Phase 1 — Static Site (Current)
- All data in `movies.json`
- All state in `localStorage`
- GitHub Pages hosting
- Estimated capacity: ~500 films, thousands of daily users

### Phase 2 — Headless CMS
- Move `movies.json` generation to a headless CMS (Contentful, Sanity, or Airtable)
- Trigger GitHub Actions build on content updates
- Still fully static — no runtime server
- Estimated capacity: 1,000+ films

### Phase 3 — Edge Functions
- Add Cloudflare Workers or Vercel Edge Functions for:
  - Search API (faster than client-side filtering)
  - User analytics (aggregated, privacy-respecting)
  - A/B testing for UI
- Still no traditional server
- Move hosting from GitHub Pages to Vercel or Cloudflare Pages

### Phase 4 — Backend (If Required)
- User accounts and cross-device sync
- Community features (ratings, reviews)
- Curator-submitted film suggestions with review workflow
- PostgreSQL or Supabase for data
- This is only warranted at significant scale

### Scaling movies.json

The current single-file approach works well up to ~2,000 films (JSON stays under 1MB). Beyond that:

1. Split by decade: `movies-1900s.json`, `movies-1910s.json`, etc.
2. Generate an index file `movies-index.json` with minimal data
3. Lazy-load decade files on demand
4. The frontend `useMovies` hook is already designed to accept any array source

---

## 9. Updating movies.json Safely

`public/movies.json` is the single source of truth for all film data. Changes here immediately affect what users see.

### Manual Updates

To add a film manually:

1. Find the film on [Internet Archive](https://archive.org)
2. Note the **identifier** (the last part of the URL: `archive.org/details/IDENTIFIER`)
3. Verify public domain status (see Section 2)
4. Add a new entry to `movies.json` following this schema:

```json
{
  "id": "film-title-YEAR",
  "title": "Full Film Title",
  "year": 1925,
  "genre": ["Comedy", "Silent"],
  "director": "Director Name",
  "cast": ["Actor One", "Actor Two"],
  "kids_safe": false,
  "duration": 75,
  "description": "A detailed, engaging description of the film...",
  "thumbnail": "https://archive.org/services/img/IDENTIFIER",
  "embed_url": "https://archive.org/embed/IDENTIFIER",
  "source": "Internet Archive",
  "source_url": "https://archive.org/details/IDENTIFIER",
  "verified_public_domain": true,
  "pd_reason": "pre_1928",
  "pd_notes": "Published 1925. All US copyrights on pre-1928 works expired January 1, 2024."
}
```

5. Validate the JSON: `python -m json.tool public/movies.json > /dev/null`
6. Test locally: `npm run dev`
7. Commit and deploy

### Using the Scraper

See Section 4. The scraper automates steps 1–4 above at scale.

### Validation Checklist

Before committing a movies.json update:

- [ ] All `"verified_public_domain"` entries are `true`
- [ ] All entries have a valid `"pd_reason"` (pre_1928 / non_renewed / gov_work / explicit_pd)
- [ ] All entries have non-empty `"pd_notes"` explaining the verification
- [ ] All `"embed_url"` values are tested and working
- [ ] No duplicate `"id"` values
- [ ] Valid JSON (`python -m json.tool` passes)
- [ ] Films with sensitive content have `"kids_safe": false`

### Removing a Film

If a film is removed (disputed rights, broken embed, etc.):

1. Remove the entry from `movies.json`
2. Add the IA identifier to `scraper/config.py → BLOCKLIST`
3. Commit with message: `remove: [film title] - [reason]`

Removing a film does not affect users' `localStorage` data (they may still have it in favorites/playlists), but it won't be displayed.

---

## 10. Development Setup

### Prerequisites

- Node.js 18+
- npm 9+
- Python 3.10+ (for scraper only)

### Install & Run

```bash
git clone https://github.com/phil08533/VoidTV.git
cd VoidTV
npm install
npm run dev
```

The dev server runs at `http://localhost:3000` with hot module replacement.

### Build

```bash
npm run build
npm run preview   # Preview the production build
```

### Project Commands

| Command           | Description                              |
|-------------------|------------------------------------------|
| `npm run dev`     | Start development server                 |
| `npm run build`   | Build for production                     |
| `npm run preview` | Preview production build locally         |
| `npm run deploy`  | Build + deploy to GitHub Pages           |

---

## 11. Environment Variables

Create a `.env` file in the project root for local development:

```env
# Google AdSense
VITE_ADSENSE_PUBLISHER_ID=ca-pub-XXXXXXXXXXXXXXXXX
VITE_ADSENSE_SLOT_HERO=XXXXXXXXXX
VITE_ADSENSE_SLOT_DETAIL=XXXXXXXXXX
```

**Important:**
- Prefix with `VITE_` to expose to the browser bundle
- Never commit `.env` to git (it's in `.gitignore`)
- For GitHub Actions, use repository Secrets

Without these variables set, AdSense shows a development placeholder (a dashed border box labelled "AdSense Banner"). The site functions fully without them.

---

## 12. PWA & Service Worker

### Installation

VoidTV is installable as a PWA on:
- Android Chrome: "Add to Home Screen" from the browser menu
- iOS Safari: Share → "Add to Home Screen"
- Desktop Chrome/Edge: Install icon in address bar

### Service Worker Strategy

`public/sw.js` implements a two-tier caching strategy:

| Resource Type       | Strategy               | Notes                              |
|---------------------|------------------------|------------------------------------|
| Static assets (JS, CSS, fonts) | Cache-first | Served from cache, updated on next visit |
| `movies.json`       | Network-first, cache fallback | Always tries fresh data first |
| Video embeds        | Not intercepted        | Streamed directly from archive.org |
| AdSense scripts     | Not intercepted        | Third-party, loaded normally      |

The service worker enables **offline browsing of the UI** — users can navigate, view their favorites and playlists, and read film descriptions even without internet. Video playback requires connectivity.

### PWA Icons

The `public/icons/` directory includes:
- `icon.svg` — Scalable vector icon
- `generate-icons.html` — Open in browser to generate PNG sizes

To generate PNG icons:
1. Open `public/icons/generate-icons.html` in Chrome
2. Click each canvas to download PNG at that size
3. Save files as `icon-72.png`, `icon-96.png`, `icon-128.png`, `icon-192.png`, `icon-512.png`

---

## 13. Contributing

Contributions are welcome! VoidTV is an open-source project.

### Ways to Contribute

1. **Add verified public domain films** — See Section 9
2. **Improve the scraper** — Better metadata parsing, additional sources
3. **UI improvements** — Bug fixes, accessibility, performance
4. **Documentation** — Correct errors, add examples

### Contribution Guidelines

- All film additions must include full public domain verification per Section 2
- PRs adding films without proper `pd_reason`/`pd_notes` will not be merged
- Follow existing code style (no linter setup — just match the surrounding code)
- Test your changes locally before submitting a PR

### Reporting Issues

- Broken video embeds: [Open an issue](https://github.com/phil08533/VoidTV/issues)
- Copyright concerns: See Section 7 (DMCA)
- Security vulnerabilities: Open a private security advisory on GitHub

---

*VoidTV — Public domain cinema, preserved and accessible. Built with care.*
