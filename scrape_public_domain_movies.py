#!/usr/bin/env python3
"""
VoidTV — Public Domain Movie Scraper
=====================================
Queries the Internet Archive advanced search index and verifies public domain
status using a multi-signal confidence scoring system.

Rules:
- Every film must score >= 90 to be included (NO manual review).
- Legal safety is prioritised over quantity.
- Films are embedded from archive.org — no files are downloaded or hosted.

Cron (weekly Sunday 3 AM):
    0 3 * * 0 python scrape_public_domain_movies.py
"""

import re
import os
import json
import time
import logging
import requests
import urllib.parse
from datetime import date, datetime, timezone

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("voidtv-scraper")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
ARCHIVE_SEARCH_URL = "https://archive.org/advancedsearch.php"
ARCHIVE_METADATA_URL = "https://archive.org/metadata/{}"
OMDB_API_URL = "http://www.omdbapi.com/"
OMDB_API_KEY = os.environ.get("OMDB_API_KEY", "")  # free key at omdbapi.com
CONFIDENCE_THRESHOLD = 90
ROWS_PER_PAGE = 500
OUTPUT_FILE = "verified_public_domain_movies.json"
REJECTED_FILE = "rejected_movies_log.json"
TODAY = date.today().isoformat()

# ---------------------------------------------------------------------------
# Adult / X-rated content blacklist (extensive)
# ---------------------------------------------------------------------------
ADULT_BLACKLIST = [
    # Explicit pornography terms
    "porn", "pornographic", "pornography", "porno", "xxx", "x-rated",
    "xrated", "adult film", "adult movie", "adult video", "adult content",
    "erotic", "erotica", "eroticism", "erotic film", "erotic movie",
    "hardcore", "softcore", "explicit", "explicit content",
    "nudist", "nudism", "naturist", "naturism",
    "nude", "nudity", "naked", "nakedness",
    "sex film", "sex movie", "sex video", "sex tape", "sex scene",
    "sexual content", "sexual explicit", "sexually explicit",
    "sexploitation", "sex exploitation",
    "smut", "lewd", "lewdness", "obscene", "obscenity",
    "nsfw", "not safe for work",
    "stag film", "stag movie", "blue film", "blue movie",
    "peep show", "peepshow",
    "fetish", "bondage", "bdsm",
    "playboy", "penthouse", "hustler", "club international",
    "stripclub", "strip club", "striptease", "strip tease",
    "burlesque film", "girlie film", "girlie movie",
    # Body / anatomy used in adult context
    "boobs", "tits", "breasts exposed", "topless", "bottomless",
    "genitals", "genital",
    # Agency / performer terms
    "call girl", "escort film", "prostitute film", "hooker film",
    # Common adult-film title words
    "debbie does", "deep throat", "behind the green door",
    "emanuelle", "emmanuelle",
    # Fetish / kink terms
    "spanking film", "whipping film", "torture porn",
    # Slang
    "jerk off", "masturbat", "orgasm film", "cum shot",
]

# Normalised (lowercase, spaces stripped) for fast substring matching
_ADULT_BLACKLIST_NORM = [w.lower().strip() for w in ADULT_BLACKLIST]

# ---------------------------------------------------------------------------
# Major studio blacklist
# ---------------------------------------------------------------------------
STUDIO_BLACKLIST = [
    "disney", "walt disney", "warner bros", "warner brothers",
    "warnermedia", "universal pictures", "universal studios",
    "paramount", "columbia pictures", "columbia broadcasting",
    "20th century fox", "twentieth century fox", "fox film",
    "mgm", "metro-goldwyn-mayer", "miramax", "dreamworks",
    "sony pictures", "lionsgate", "new line cinema",
    "touchstone pictures", "buena vista",
]
_STUDIO_BLACKLIST_NORM = [s.lower() for s in STUDIO_BLACKLIST]

# ---------------------------------------------------------------------------
# Trusted collections → +20 points
# ---------------------------------------------------------------------------
TRUSTED_COLLECTIONS = {
    "prelinger", "silent_films", "feature_films",
    "gov.archives", "prelinger_library",
}

# ---------------------------------------------------------------------------
# Public-domain licence keywords → +30 points
# ---------------------------------------------------------------------------
PD_LICENSE_KEYWORDS = [
    "publicdomain",
    "creativecommons.org/publicdomain",
    "cc0",
    "creativecommons.org/licenses/publicdomain",
]

# ---------------------------------------------------------------------------
# US Government creator patterns → +20 points
# ---------------------------------------------------------------------------
US_GOV_PATTERNS = [
    r"\bu\.?s\.?\s+government\b",
    r"\bunited states government\b",
    r"\bu\.?s\.?\s+army\b",
    r"\bu\.?s\.?\s+navy\b",
    r"\bu\.?s\.?\s+air force\b",
    r"\bu\.?s\.?\s+marine\b",
    r"\bu\.?s\.?\s+coast guard\b",
    r"\bu\.?s\.?\s+department\b",
    r"\bnational archives\b",
    r"\bfederal government\b",
    r"\bnasa\b",
    r"\busda\b",
    r"\bfda\b",
    r"\bcdc\b",
    r"\bpublic health service\b",
    r"\bwar department\b",
    r"\boffice of war information\b",
    r"\bwar production board\b",
    r"\bnational film board\b",
]
_GOV_REGEXES = [re.compile(p, re.IGNORECASE) for p in US_GOV_PATTERNS]

# ---------------------------------------------------------------------------
# Category keywords (for website navigation)
# ---------------------------------------------------------------------------
CATEGORY_KEYWORDS = {
    "horror": [
        "horror", "zombie", "vampire", "ghost", "haunted", "monster",
        "terror", "fright", "nightmare", "undead", "demon", "witch",
        "creature", "supernatural", "slasher", "gore", "werewolf",
        "frankenstein", "dracula", "mummy", "phantom", "cursed",
    ],
    "scifi": [
        "sci-fi", "science fiction", "space", "alien", "robot", "future",
        "dystopia", "utopia", "galaxy", "planet", "mars", "moon",
        "rocket", "invasion", "atomic", "radiation", "spaceship",
        "time travel", "teleport", "cybernetic", "android",
    ],
    "comedy": [
        "comedy", "humor", "humour", "funny", "comic", "slapstick",
        "farce", "parody", "satire", "laugh", "comedian", "gag",
        "chaplin", "keaton", "laurel", "hardy", "marx brothers",
    ],
    "drama": [
        "drama", "tragic", "tragedy", "emotional", "melodrama", "relationship",
        "family drama", "social drama", "courtroom",
    ],
    "romance": [
        "romance", "romantic", "love story", "love affair",
        "heart", "sweetheart",
    ],
    "action": [
        "action", "adventure", "war", "battle", "fight", "combat",
        "thriller", "chase", "spy", "espionage", "martial arts",
        "western", "cowboy", "outlaw", "gunfight", "heist",
        "swashbuckler", "pirate",
    ],
    "documentary": [
        "documentary", "documental", "non-fiction", "nonfiction",
        "educational", "history", "historical", "biography",
        "nature", "science", "propaganda", "newsreel", "travelogue",
        "industrial film", "instructional",
    ],
    "noir": [
        "noir", "detective", "mystery", "crime", "hardboiled",
        "gumshoe", "sleuth", "private eye", "femme fatale",
        "gangster", "racketeer",
    ],
    "kids": [
        "kids", "children", "family", "cartoon", "animation", "animated",
        "fairy tale", "fairytale", "puppet", "puppets",
    ],
}

# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------

def _normalise(text: str) -> str:
    """Lowercase and strip extra whitespace."""
    return re.sub(r"\s+", " ", (text or "").lower().strip())


def _contains_adult_content(text: str) -> bool:
    """Return True if the text contains any adult-content blacklist term."""
    norm = _normalise(text)
    return any(kw in norm for kw in _ADULT_BLACKLIST_NORM)


def _contains_studio(text: str) -> bool:
    """Return True if the text mentions a major studio."""
    norm = _normalise(text)
    return any(s in norm for s in _STUDIO_BLACKLIST_NORM)


def _is_gov_creator(creator: str) -> bool:
    """Return True if creator matches US government patterns."""
    if not creator:
        return False
    return any(rx.search(creator) for rx in _GOV_REGEXES)


def _classify_category(title: str, subjects) -> str:
    """Assign the best-matching category from CATEGORY_KEYWORDS."""
    if isinstance(subjects, list):
        text = _normalise(title + " " + " ".join(subjects))
    else:
        text = _normalise(title + " " + (subjects or ""))

    for cat, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in text for kw in keywords):
            return cat
    return "drama"  # default


def _dedup_key(title: str, year) -> str:
    return re.sub(r"[^a-z0-9]", "", _normalise(title)) + str(year)


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------

def calculate_confidence(identifier: str, title: str, year, creator: str,
                          collection: str, licenseurl: str,
                          subjects) -> tuple[int, list[str]]:
    """
    Return (confidence_score, evidence_list).
    Maximum possible score is 130 (threshold is 90).
    """
    score = 0
    evidence = []

    # +50 — Release year <= 1928 (US public domain by law)
    try:
        yr = int(year)
        if yr <= 1928:
            score += 50
            evidence.append("release_year_pre_1928")
    except (TypeError, ValueError):
        pass

    # +30 — Explicit public-domain licence URL
    lic_norm = _normalise(licenseurl or "")
    if any(kw in lic_norm for kw in PD_LICENSE_KEYWORDS):
        score += 30
        evidence.append("explicit_public_domain_license")

    # +20 — Trusted archive collection
    coll_norm = _normalise(collection or "").replace(" ", "_")
    if any(tc in coll_norm for tc in TRUSTED_COLLECTIONS):
        score += 20
        evidence.append("trusted_collection")

    # +10 — Subject metadata includes "public domain"
    if isinstance(subjects, list):
        subj_text = " ".join(subjects).lower()
    else:
        subj_text = _normalise(subjects or "")
    if "public domain" in subj_text:
        score += 10
        evidence.append("public_domain_subject_tag")

    # +20 — Creator is a US government entity
    if _is_gov_creator(creator or ""):
        score += 20
        evidence.append("us_government_creator")

    return score, evidence


# ---------------------------------------------------------------------------
# Rejection logic
# ---------------------------------------------------------------------------

def should_reject(title: str, year, creator: str, collection: str,
                  licenseurl: str, subjects, score: int) -> tuple[bool, str]:
    """
    Return (True, reason) if the film must be rejected, else (False, '').
    Checks are in priority order.
    """
    combined_text = " ".join(filter(None, [
        title, creator, collection,
        " ".join(subjects) if isinstance(subjects, list) else (subjects or ""),
    ]))

    # 1. Adult / X-rated content
    if _contains_adult_content(combined_text):
        return True, "adult_content_detected"

    # 2. Missing year
    try:
        yr = int(year)
    except (TypeError, ValueError):
        return True, "missing_year"

    # 3. Major studio detected
    if _contains_studio(combined_text):
        return True, "major_studio_detected"

    # 4. Post-1963 without explicit public-domain licence
    lic_norm = _normalise(licenseurl or "")
    has_explicit_license = any(kw in lic_norm for kw in PD_LICENSE_KEYWORDS)
    if yr > 1963 and not has_explicit_license:
        return True, "post_1963_no_pd_license"

    # 5. Confidence below threshold
    if score < CONFIDENCE_THRESHOLD:
        return True, f"confidence_below_threshold_{score}"

    return False, ""


# ---------------------------------------------------------------------------
# Internet Archive search
# ---------------------------------------------------------------------------

class ArchiveScraper:
    QUERY = (
        "(mediatype:movies) AND ("
        "licenseurl:*publicdomain* "
        "OR licenseurl:*creativecommons.org/publicdomain* "
        "OR subject:\"public domain\" "
        "OR collection:prelinger "
        "OR collection:silent_films"
        ")"
    )
    FIELDS = ["identifier", "title", "year", "creator", "collection",
              "licenseurl", "subject"]

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "VoidTV-PublicDomainScraper/3.0 "
                          "(legal public domain archive; contact: dmca@voidtv.com)"
        })
        self.accepted: list[dict] = []
        self.rejected: list[dict] = []
        self._seen_keys: set[str] = set()

    # ------------------------------------------------------------------
    def _item_accessible(self, identifier: str) -> bool:
        """
        Verify the item actually exists and is publicly accessible on
        the Internet Archive by fetching its metadata endpoint.
        Returns True only if the item has a non-empty title in its metadata.
        """
        url = ARCHIVE_METADATA_URL.format(identifier)
        for attempt in range(3):
            try:
                resp = self.session.get(url, timeout=20)
                if resp.status_code == 404:
                    return False
                resp.raise_for_status()
                meta = resp.json()
                # A missing or error key means the item is gone / private
                if meta.get("error"):
                    return False
                title = (meta.get("metadata") or {}).get("title")
                return bool(title)
            except Exception as exc:
                wait = 2 ** attempt
                log.warning(
                    "Metadata check %s: %s — retry in %ds", identifier, exc, wait
                )
                time.sleep(wait)
        log.warning("Metadata check failed for %s after 3 attempts", identifier)
        return False  # Treat as inaccessible if we can't confirm

    # ------------------------------------------------------------------
    def _fetch_poster(self, title: str, year, identifier: str) -> str:
        """
        Return the best poster URL available for this film.

        Priority:
          1. OMDB API (set OMDB_API_KEY env var — free at omdbapi.com)
          2. archive.org services/img thumbnail (always available)
        """
        if OMDB_API_KEY:
            try:
                params = {
                    "t": title,
                    "y": str(year) if year else "",
                    "apikey": OMDB_API_KEY,
                    "type": "movie",
                }
                resp = self.session.get(OMDB_API_URL, params=params, timeout=10)
                data = resp.json()
                poster = data.get("Poster", "N/A")
                if poster and poster != "N/A":
                    log.info("OMDB poster found for %s (%s)", title, year)
                    return poster
            except Exception as exc:
                log.warning("OMDB lookup failed for %s: %s", title, exc)

        # Fallback — archive.org auto-generated thumbnail
        return f"https://archive.org/services/img/{identifier}"

    # ------------------------------------------------------------------
    def _fetch_page(self, page: int) -> list[dict]:
        # Build the URL manually so fl[] brackets are NOT percent-encoded.
        # requests encodes fl[] → fl%5B%5D which Archive.org does not recognise,
        # causing it to silently return zero fields and therefore zero docs.
        fields_qs = "&".join(f"fl[]={f}" for f in self.FIELDS)
        base_qs = urllib.parse.urlencode({
            "q": self.QUERY,
            "rows": ROWS_PER_PAGE,
            "page": page,
            "output": "json",
        })
        url = f"{ARCHIVE_SEARCH_URL}?{base_qs}&{fields_qs}"

        for attempt in range(5):
            try:
                resp = self.session.get(url, timeout=60)
                resp.raise_for_status()
                data = resp.json()
                docs = data.get("response", {}).get("docs", [])
                log.info("Page %d — received %d items", page, len(docs))
                return docs
            except Exception as exc:
                wait = 2 ** attempt
                log.warning("Page %d fetch error: %s — retry in %ds", page, exc, wait)
                time.sleep(wait)
        log.error("Page %d failed after 5 attempts — skipping", page)
        return []

    # ------------------------------------------------------------------
    def _process_item(self, item: dict) -> None:
        identifier = item.get("identifier", "").strip()
        title = (item.get("title") or "").strip()
        year = item.get("year")
        creator = (item.get("creator") or "")
        if isinstance(creator, list):
            creator = ", ".join(creator)
        collection = item.get("collection", "")
        if isinstance(collection, list):
            collection = collection[0] if collection else ""
        licenseurl = (item.get("licenseurl") or "")
        if isinstance(licenseurl, list):
            licenseurl = licenseurl[0] if licenseurl else ""
        subjects = item.get("subject", [])
        if isinstance(subjects, str):
            subjects = [subjects]

        # Basic sanity
        if not identifier or not title:
            return

        # Deduplication
        dk = _dedup_key(title, year)
        if dk in self._seen_keys:
            return
        self._seen_keys.add(dk)

        # Score first (so we can include it in rejection log)
        score, evidence = calculate_confidence(
            identifier, title, year, creator,
            collection, licenseurl, subjects
        )

        # Rejection check
        rejected, reason = should_reject(
            title, year, creator, collection,
            licenseurl, subjects, score
        )

        if rejected:
            self.rejected.append({
                "title": title,
                "year": year,
                "identifier": identifier,
                "confidence_score": score,
                "rejection_reason": reason,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
            return

        # Verify the item is actually accessible on archive.org before accepting
        if not self._item_accessible(identifier):
            log.warning("Item not accessible on Archive.org — skipping: %s", identifier)
            self.rejected.append({
                "title": title,
                "year": year,
                "identifier": identifier,
                "confidence_score": score,
                "rejection_reason": "item_not_accessible",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
            return

        category = _classify_category(title, subjects)
        poster = self._fetch_poster(title, year, identifier)

        self.accepted.append({
            "title": title,
            "year": int(year),
            "creator": creator or "Unknown",
            "identifier": identifier,
            "category": category,
            "poster": poster,
            "embed_url": f"https://archive.org/embed/{identifier}",
            "source": "Internet Archive",
            "confidence_score": score,
            "public_domain_evidence": evidence,
            "source_page": f"https://archive.org/details/{identifier}",
            "verified_at": TODAY,
        })

    # ------------------------------------------------------------------
    def run(self) -> None:
        log.info("Starting multi-run Internet Archive scrape…")

        for run_index in range(4000):  # repeat 4 times
            log.info("=== Run %d ===", run_index + 1)

            page = 3
            total_fetched = 0

            while True:
                docs = self._fetch_page(page)
                if not docs:
                    break

                for item in docs:
                    self._process_item(item)

                total_fetched += len(docs)
                log.info(
                    "Progress — fetched: %d | accepted: %d | rejected: %d",
                    total_fetched, len(self.accepted), len(self.rejected)
                )

                if len(docs) < ROWS_PER_PAGE:
                    break

                page += 1
                time.sleep(1)

            log.info(
                "Run %d complete — accepted: %d | rejected: %d",
                run_index + 1, len(self.accepted), len(self.rejected)
            )
            self._log_rejection_summary()

    # ------------------------------------------------------------------
    def _log_rejection_summary(self) -> None:
        reasons: dict[str, int] = {}
        for r in self.rejected:
            key = r["rejection_reason"].rsplit("_", 1)[0] \
                if r["rejection_reason"].startswith("confidence_below") \
                else r["rejection_reason"]
            reasons[key] = reasons.get(key, 0) + 1
        log.info("Rejection breakdown: %s", json.dumps(reasons, indent=2))

    # ------------------------------------------------------------------
    def save(self) -> None:
        # ---- Verified output ----
        category_counts = {}
        for m in self.accepted:
            cat = m.get("category", "drama")
            category_counts[cat] = category_counts.get(cat, 0) + 1

        output = {
            "version": "3.0",
            "updated": datetime.now(timezone.utc).isoformat(),
            "total_movies": len(self.accepted),
            "source_info": {
                "primary": "Internet Archive (archive.org)",
                "verification": (
                    "Automated confidence scoring — minimum "
                    f"{CONFIDENCE_THRESHOLD}% required for inclusion"
                ),
                "disclaimer": (
                    "All content has been automatically verified as public domain "
                    "via multi-signal confidence scoring. "
                    "Films are embedded from archive.org — no files are hosted. "
                    "For DMCA notices see dmca.html."
                ),
            },
            "categories": list(CATEGORY_KEYWORDS.keys()),
            "category_counts": category_counts,
            "movies": self.accepted,
        }

        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
        log.info("Saved %d movies → %s", len(self.accepted), OUTPUT_FILE)

        # ---- Rejected log ----
        with open(REJECTED_FILE, "w", encoding="utf-8") as f:
            json.dump(self.rejected, f, ensure_ascii=False, indent=2)
        log.info("Saved %d rejections → %s", len(self.rejected), REJECTED_FILE)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    scraper = ArchiveScraper()
    scraper.run()
    scraper.save()
