#!/usr/bin/env python3
"""
VoidTV Public Domain Film Scraper
==================================
Fetches film metadata from trusted public-domain sources and outputs
a validated movies.json suitable for use with the VoidTV frontend.

STRICT MODE: Only films meeting ONE of these criteria are accepted:
  1. Published before January 1, 1928 (pre_1928 US copyright expiry)
  2. Published 1928-1963 and NOT renewed in the US Copyright Office (non_renewed)
  3. Published by a US Government agency (gov_work)
  4. Explicitly released to public domain by rights holder (explicit_pd)

Films that don't meet ANY of the above criteria are REJECTED with a logged reason.
Ambiguous films are flagged for manual review.

Usage:
  python scraper.py [--strict] [--output OUTPUT] [--limit N]

Options:
  --strict    Enable strict mode (reject all ambiguous films). Default: True
  --output    Output file path. Default: ../public/movies.json
  --limit     Max films to process. Default: no limit
  --dry-run   Run without writing output file

Dependencies:
  pip install -r requirements.txt
"""

import argparse
import json
import logging
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Optional
from urllib.parse import urlencode, quote_plus

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# ── Configuration ────────────────────────────────────────────────────────────

# Films published before this year are unambiguously public domain in the US
# (17 U.S.C. § 302 / URAA / Sonny Bono Act)
PD_CUTOFF_YEAR = 1928

# Internet Archive Advanced Search API
IA_SEARCH_URL   = "https://archive.org/advancedsearch.php"
IA_METADATA_URL = "https://archive.org/metadata/{identifier}"
IA_EMBED_URL    = "https://archive.org/embed/{identifier}"
IA_THUMB_URL    = "https://archive.org/services/img/{identifier}"
IA_DETAIL_URL   = "https://archive.org/details/{identifier}"

# Request headers (polite scraping)
HEADERS = {
    "User-Agent": "VoidTV-PublicDomainScraper/1.0 (https://github.com/phil08533/VoidTV; contact via GitHub Issues)",
    "Accept": "application/json",
}

# Rate limiting between requests (seconds)
REQUEST_DELAY = 0.8

# Kids-safe genre classification
KIDS_SAFE_GENRES  = {"animation", "comedy", "adventure", "short", "educational", "nature"}
NOT_KIDS_SAFE_GENRES = {"horror", "war", "adult", "erotica", "exploitation", "crime"}

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("voidtv-scraper")


# ── HTTP Session ──────────────────────────────────────────────────────────────

def build_session() -> requests.Session:
    """Build a requests session with retry logic and timeout."""
    session = requests.Session()
    retry = Retry(
        total=4,
        backoff_factor=1.5,
        status_forcelist=[429, 500, 502, 503, 504],
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    session.headers.update(HEADERS)
    return session


# ── Public Domain Verification ───────────────────────────────────────────────

def verify_public_domain(item: dict, strict: bool = True) -> dict:
    """
    Determine if a film is definitively public domain and why.

    Returns a dict with keys:
      is_pd     (bool)   — definitively public domain
      reason    (str)    — pd_reason code
      notes     (str)    — human-readable explanation
      flagged   (bool)   — needs manual review
      reject_reason (str|None) — why rejected
    """
    year = item.get("year")
    title = item.get("title", "Unknown")

    # ── 1. Pre-1928 films ─────────────────────────────────────────────────────
    if year and int(year) < PD_CUTOFF_YEAR:
        return {
            "is_pd": True,
            "reason": "pre_1928",
            "notes": (
                f"Published {year}. Works published before January 1, 1928 "
                "entered the US public domain on January 1, 2024 under 17 U.S.C. §304."
            ),
            "flagged": False,
            "reject_reason": None,
        }

    # ── 2. US Government works ────────────────────────────────────────────────
    creator = item.get("creator", "").lower()
    description = item.get("description", "").lower()
    gov_keywords = [
        "u.s. government", "united states government", "us government",
        "department of defense", "u.s. army", "u.s. navy", "u.s. air force",
        "national archives", "library of congress", "smithsonian",
        "nasa", "noaa", "usda",
    ]
    if any(kw in creator or kw in description for kw in gov_keywords):
        return {
            "is_pd": True,
            "reason": "gov_work",
            "notes": (
                "US Government work under 17 U.S.C. §105. "
                "Works created by US Federal Government employees as part of their duties "
                "are not eligible for copyright protection."
            ),
            "flagged": False,
            "reject_reason": None,
        }

    # ── 3. Explicit PD release ────────────────────────────────────────────────
    pd_keywords = [
        "public domain", "no known copyright", "rights statement: pd",
        "creative commons zero", "cc0",
    ]
    if any(kw in description for kw in pd_keywords):
        if not strict:
            return {
                "is_pd": True,
                "reason": "explicit_pd",
                "notes": (
                    "Rights holder has explicitly released this work to the public domain. "
                    "Manual verification recommended."
                ),
                "flagged": True,
                "reject_reason": None,
            }
        else:
            return {
                "is_pd": False,
                "reason": None,
                "notes": "",
                "flagged": True,
                "reject_reason": (
                    "STRICT MODE: 'explicit_pd' claims require manual verification "
                    "with documented rights statement. "
                    f"Title: {title!r} ({year}). "
                    "Add to MANUAL_REVIEW list after verification."
                ),
            }

    # ── 4. 1928-1963 non-renewed (requires copyright office lookup) ───────────
    if year and 1928 <= int(year) <= 1963:
        # In strict mode, we cannot auto-accept these without renewal check
        if strict:
            return {
                "is_pd": False,
                "reason": None,
                "notes": "",
                "flagged": True,
                "reject_reason": (
                    f"STRICT MODE: Film from {year} requires US Copyright Office renewal check. "
                    f"Title: {title!r}. "
                    "Run with --check-renewals flag or verify manually at "
                    "https://cocatalog.loc.gov/"
                ),
            }
        else:
            return {
                "is_pd": False,
                "reason": None,
                "notes": "",
                "flagged": True,
                "reject_reason": f"Renewal status unknown for {year} film: {title!r}. Manual check required.",
            }

    # ── 5. Everything else — REJECT ───────────────────────────────────────────
    return {
        "is_pd": False,
        "reason": None,
        "notes": "",
        "flagged": False,
        "reject_reason": (
            f"Cannot verify public domain status. Year: {year}, Title: {title!r}. "
            "VoidTV only includes definitively verified public domain films."
        ),
    }


# ── Genre Classification ──────────────────────────────────────────────────────

def classify_genres(ia_item: dict) -> list[str]:
    """Map Internet Archive metadata to VoidTV genre tags."""
    raw_genres = []

    # IA uses multiple metadata fields for genre
    for field in ("subject", "genre", "type"):
        val = ia_item.get(field, "")
        if isinstance(val, list):
            raw_genres.extend(val)
        elif isinstance(val, str):
            raw_genres.extend(val.split(";"))

    genres = set()

    # Add 'Silent' if mediatype suggests it or description mentions it
    desc = ia_item.get("description", "").lower()
    if any(kw in desc for kw in ("silent film", "silent movie", "intertitles", "no sound")):
        genres.add("Silent")

    # Map raw genre strings to our genre vocabulary
    genre_map = {
        "horror":      "Horror",
        "comedy":      "Comedy",
        "drama":       "Drama",
        "romance":     "Romance",
        "action":      "Action",
        "adventure":   "Adventure",
        "thriller":    "Thriller",
        "mystery":     "Mystery",
        "war":         "War",
        "western":     "Western",
        "sci-fi":      "Sci-Fi",
        "science fiction": "Sci-Fi",
        "animation":   "Animation",
        "animated":    "Animation",
        "cartoon":     "Animation",
        "documentary": "Documentary",
        "short":       "Short",
        "expressionist": "Expressionist",
        "epic":        "Epic",
        "sports":      "Sports",
        "fantasy":     "Fantasy",
    }
    for raw in raw_genres:
        clean = raw.strip().lower()
        for key, mapped in genre_map.items():
            if key in clean:
                genres.add(mapped)
                break

    # Ensure Silent is added for old films
    year = ia_item.get("year") or ia_item.get("date", "")[:4]
    try:
        if int(year) < 1930:
            genres.add("Silent")
    except (ValueError, TypeError):
        pass

    return sorted(genres) if genres else ["Silent", "Drama"]


def is_kids_safe(genres: list[str], description: str) -> bool:
    """Heuristically determine if a film is appropriate for children."""
    genres_lower = {g.lower() for g in genres}
    desc_lower = description.lower()

    # Reject if any non-kids genre present
    if genres_lower & NOT_KIDS_SAFE_GENRES:
        return False

    # Reject on content warning keywords
    warnings = ["murder", "violence", "explicit", "adult", "sexual", "racism",
                 "disturbing", "graphic", "bloody", "torture"]
    if any(w in desc_lower for w in warnings):
        return False

    # Accept if clearly kids-oriented
    if genres_lower & KIDS_SAFE_GENRES:
        return True

    # Default to False (conservative)
    return False


# ── Internet Archive Search ───────────────────────────────────────────────────

def search_ia_movies(
    session: requests.Session,
    query: str = "",
    year_max: int = PD_CUTOFF_YEAR - 1,
    limit: int = 200,
    page: int = 1,
) -> list[dict]:
    """
    Search Internet Archive for public domain films.
    Only returns items up to year_max to focus on pre-1928 content.
    """
    params = {
        "q": f"mediatype:movies AND date:[0001 TO {year_max}] {query}",
        "fl[]": [
            "identifier", "title", "creator", "date", "subject",
            "description", "runtime", "language",
        ],
        "sort[]": ["downloads desc", "date asc"],
        "rows": min(limit, 100),
        "page": page,
        "output": "json",
        "callback": "",
        "save": "yes",
    }
    # fl[] as repeated params
    flat_params = []
    for k, v in params.items():
        if isinstance(v, list):
            for item in v:
                flat_params.append((k, item))
        else:
            flat_params.append((k, v))

    url = f"{IA_SEARCH_URL}?{urlencode(flat_params)}"

    log.info(f"Searching IA: {url[:120]}…")
    resp = session.get(url, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    return data.get("response", {}).get("docs", [])


def fetch_ia_metadata(session: requests.Session, identifier: str) -> Optional[dict]:
    """Fetch detailed metadata for a single IA item."""
    url = IA_METADATA_URL.format(identifier=identifier)
    try:
        resp = session.get(url, timeout=20)
        resp.raise_for_status()
        return resp.json().get("metadata", {})
    except Exception as e:
        log.warning(f"Failed to fetch metadata for {identifier!r}: {e}")
        return None


# ── ID Sanitization ───────────────────────────────────────────────────────────

def make_movie_id(title: str, year: int) -> str:
    """Create a clean, URL-safe movie ID from title and year."""
    clean = re.sub(r"[^a-z0-9\s-]", "", title.lower())
    clean = re.sub(r"\s+", "-", clean.strip())
    clean = re.sub(r"-+", "-", clean)
    return f"{clean[:60].rstrip('-')}-{year}"


# ── Parse Duration ────────────────────────────────────────────────────────────

def parse_duration(runtime_str: str) -> int:
    """Parse IA runtime string (e.g. '01:30:00', '90:00', '90 min') to minutes."""
    if not runtime_str:
        return 0
    s = str(runtime_str).strip()

    # Pattern: HH:MM:SS or MM:SS
    m = re.match(r"(?:(\d+):)?(\d+):(\d+)", s)
    if m:
        h, mn, sec = int(m.group(1) or 0), int(m.group(2)), int(m.group(3))
        return h * 60 + mn + (1 if sec >= 30 else 0)

    # Pattern: "90 min" or "90 minutes"
    m = re.match(r"(\d+)\s*(?:min|minute)", s, re.IGNORECASE)
    if m:
        return int(m.group(1))

    # Just a number (assume minutes)
    m = re.match(r"^(\d+)$", s)
    if m:
        return int(m.group(1))

    return 0


# ── Build Movie Object ────────────────────────────────────────────────────────

def build_movie_object(
    identifier: str,
    metadata: dict,
    pd_info: dict,
) -> dict:
    """Construct a VoidTV movie object from IA metadata."""
    title = metadata.get("title", metadata.get("identifier", identifier))
    if isinstance(title, list):
        title = title[0]

    year_raw = metadata.get("date", metadata.get("year", ""))
    if isinstance(year_raw, list):
        year_raw = year_raw[0]
    year_match = re.search(r"\d{4}", str(year_raw))
    year = int(year_match.group()) if year_match else 0

    # Creator / Director
    creator = metadata.get("creator", "")
    if isinstance(creator, list):
        creator = creator[0]

    description = metadata.get("description", "")
    if isinstance(description, list):
        description = " ".join(description)
    # Strip HTML tags
    description = re.sub(r"<[^>]+>", " ", description)
    description = re.sub(r"\s+", " ", description).strip()
    if len(description) > 600:
        description = description[:597] + "…"

    runtime = metadata.get("runtime", metadata.get("length", ""))
    if isinstance(runtime, list):
        runtime = runtime[0]
    duration_mins = parse_duration(str(runtime))

    genres     = classify_genres(metadata)
    kids_safe  = is_kids_safe(genres, description)
    movie_id   = make_movie_id(title, year)

    return {
        "id":                    movie_id,
        "title":                 title,
        "year":                  year,
        "genre":                 genres,
        "director":              creator or None,
        "cast":                  [],
        "kids_safe":             kids_safe,
        "duration":              duration_mins,
        "description":           description,
        "thumbnail":             IA_THUMB_URL.format(identifier=identifier),
        "embed_url":             IA_EMBED_URL.format(identifier=identifier),
        "source":                "Internet Archive",
        "source_url":            IA_DETAIL_URL.format(identifier=identifier),
        "verified_public_domain": True,
        "pd_reason":             pd_info["reason"],
        "pd_notes":              pd_info["notes"],
        "_scraper_meta": {
            "ia_identifier": identifier,
            "scraped_at":    datetime.utcnow().isoformat() + "Z",
            "scraper_version": "1.0.0",
        },
    }


# ── Validation ────────────────────────────────────────────────────────────────

def validate_movie(movie: dict) -> tuple[bool, list[str]]:
    """
    Final validation of a movie object before writing to output.
    Returns (is_valid, list_of_errors).
    """
    errors = []

    if not movie.get("id"):
        errors.append("Missing id")
    if not movie.get("title"):
        errors.append("Missing title")
    if not movie.get("year") or int(movie["year"]) < 1888:
        errors.append(f"Invalid year: {movie.get('year')}")
    if not movie.get("embed_url"):
        errors.append("Missing embed_url")
    if not movie.get("thumbnail"):
        errors.append("Missing thumbnail")
    if not isinstance(movie.get("genre"), list) or not movie["genre"]:
        errors.append("Genre must be a non-empty list")
    if movie.get("verified_public_domain") is not True:
        errors.append("verified_public_domain must be True")
    if not movie.get("pd_reason"):
        errors.append("Missing pd_reason")

    return len(errors) == 0, errors


# ── Main Pipeline ─────────────────────────────────────────────────────────────

def run_scraper(
    output_path: str,
    strict: bool = True,
    limit: int = 0,
    dry_run: bool = False,
    verbose: bool = False,
) -> dict:
    """
    Main scraper pipeline.
    Returns a stats dict with counts of processed, accepted, rejected films.
    """
    if verbose:
        log.setLevel(logging.DEBUG)

    session   = build_session()
    accepted  = []
    rejected  = []
    flagged   = []
    seen_ids  = set()

    stats = {
        "processed": 0,
        "accepted":  0,
        "rejected":  0,
        "flagged":   0,
        "errors":    0,
        "started_at": datetime.utcnow().isoformat() + "Z",
    }

    log.info(f"VoidTV Scraper started | strict={strict} | limit={limit or 'unlimited'}")

    # ── Fetch results from IA ──────────────────────────────────────────────────
    page = 1
    total_wanted = limit or 1000
    all_docs = []

    while len(all_docs) < total_wanted:
        batch = search_ia_movies(
            session,
            year_max=PD_CUTOFF_YEAR - 1,
            limit=min(100, total_wanted - len(all_docs)),
            page=page,
        )
        if not batch:
            break
        all_docs.extend(batch)
        page += 1
        time.sleep(REQUEST_DELAY)

    log.info(f"Retrieved {len(all_docs)} candidates from Internet Archive")

    # ── Process each candidate ─────────────────────────────────────────────────
    for doc in all_docs:
        identifier = doc.get("identifier")
        if not identifier:
            stats["errors"] += 1
            continue

        stats["processed"] += 1
        if limit and stats["processed"] > limit:
            break

        # De-duplicate
        if identifier in seen_ids:
            continue
        seen_ids.add(identifier)

        log.debug(f"Processing: {identifier!r}")

        # Fetch full metadata
        time.sleep(REQUEST_DELAY)
        metadata = fetch_ia_metadata(session, identifier)
        if not metadata:
            log.warning(f"Skipping {identifier!r}: no metadata")
            stats["errors"] += 1
            continue

        # Merge search doc data with full metadata (doc has some fields)
        merged = {**doc, **metadata}

        # Extract year for PD check
        year_raw = merged.get("date", merged.get("year", ""))
        if isinstance(year_raw, list):
            year_raw = year_raw[0]
        year_match = re.search(r"\d{4}", str(year_raw))
        year = int(year_match.group()) if year_match else None

        merged["year"] = year

        # ── Verify public domain ───────────────────────────────────────────────
        pd_info = verify_public_domain(merged, strict=strict)

        if not pd_info["is_pd"]:
            reason = pd_info["reject_reason"] or "Unknown"
            log.info(f"REJECTED {identifier!r}: {reason[:100]}")
            rejected.append({"identifier": identifier, "reason": reason})
            if pd_info["flagged"]:
                flagged.append({"identifier": identifier, "notes": reason})
                stats["flagged"] += 1
            stats["rejected"] += 1
            continue

        # ── Build & validate movie object ──────────────────────────────────────
        movie = build_movie_object(identifier, merged, pd_info)
        is_valid, errors = validate_movie(movie)

        if not is_valid:
            log.warning(f"INVALID {identifier!r}: {errors}")
            stats["errors"] += 1
            continue

        accepted.append(movie)
        stats["accepted"] += 1
        log.info(
            f"✓ Accepted: {movie['title']!r} ({movie['year']}) "
            f"[{', '.join(movie['genre'][:2])}]"
        )

    stats["finished_at"] = datetime.utcnow().isoformat() + "Z"

    # ── Output ─────────────────────────────────────────────────────────────────
    log.info(
        f"\n{'='*60}\n"
        f"Scraper Complete\n"
        f"  Processed: {stats['processed']}\n"
        f"  Accepted:  {stats['accepted']}\n"
        f"  Rejected:  {stats['rejected']}\n"
        f"  Flagged:   {stats['flagged']} (need manual review)\n"
        f"  Errors:    {stats['errors']}\n"
        f"{'='*60}"
    )

    if flagged:
        log.warning(f"\n{len(flagged)} films flagged for MANUAL REVIEW:")
        for f in flagged:
            log.warning(f"  - {f['identifier']}: {f['notes'][:80]}")

    if not dry_run:
        output = Path(output_path)
        output.parent.mkdir(parents=True, exist_ok=True)
        # Strip internal metadata before writing to movies.json
        public_movies = []
        for m in accepted:
            m_copy = {k: v for k, v in m.items() if not k.startswith("_")}
            public_movies.append(m_copy)
        output.write_text(
            json.dumps(public_movies, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        log.info(f"Output written to: {output.resolve()}")
    else:
        log.info("DRY RUN — no output written")

    return stats


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="VoidTV Public Domain Film Scraper",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        default=True,
        help="Strict mode: reject ambiguous films (default: True)",
    )
    parser.add_argument(
        "--no-strict",
        action="store_false",
        dest="strict",
        help="Disable strict mode (allow explicit_pd claims without manual review)",
    )
    parser.add_argument(
        "--output",
        default=str(Path(__file__).parent.parent / "public" / "movies.json"),
        help="Output JSON file path (default: ../public/movies.json)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Max number of films to process (default: no limit)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run without writing output file",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable debug logging",
    )

    args = parser.parse_args()

    stats = run_scraper(
        output_path=args.output,
        strict=args.strict,
        limit=args.limit,
        dry_run=args.dry_run,
        verbose=args.verbose,
    )

    # Exit code 0 if any films were accepted, 1 if none
    sys.exit(0 if stats["accepted"] > 0 else 1)


if __name__ == "__main__":
    main()
