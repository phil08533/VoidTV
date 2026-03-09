#!/usr/bin/env python3
"""
VoidTV — Archive.org Identifier Validator
==========================================
Checks every movie in verified_public_domain_movies.json against the
Internet Archive metadata API to confirm the item exists and is publicly
accessible. Removes dead/missing items and saves the cleaned file.

Usage:
    python validate_movies.py                        # check + auto-clean
    python validate_movies.py --dry-run              # report only, no save
    python validate_movies.py --input custom.json    # check a different file
"""

import argparse
import json
import logging
import sys
import time

import requests

# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("voidtv-validator")

ARCHIVE_METADATA_URL = "https://archive.org/metadata/{}"
DEFAULT_INPUT = "verified_public_domain_movies.json"
SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "VoidTV-Validator/1.0 (contact: dmca@voidtv.com)"
})

# ---------------------------------------------------------------------------

def check_identifier(identifier: str) -> tuple[bool, str]:
    """
    Return (accessible, reason).
    accessible=True  → item exists and has a title on archive.org
    accessible=False → item is missing, private, or errored
    reason           → human-readable explanation
    """
    url = ARCHIVE_METADATA_URL.format(identifier)
    for attempt in range(3):
        try:
            resp = SESSION.get(url, timeout=20)
            if resp.status_code == 404:
                return False, "HTTP 404 — item not found"
            resp.raise_for_status()
            meta = resp.json()
            err = meta.get("error")
            if err:
                return False, f"Archive error: {err}"
            title = (meta.get("metadata") or {}).get("title")
            if not title:
                return False, "No title in metadata (item may be dark/private)"
            mediatype = (meta.get("metadata") or {}).get("mediatype", "")
            if mediatype and mediatype != "movies":
                return False, f"Wrong mediatype: {mediatype!r} (expected 'movies')"
            return True, title if isinstance(title, str) else title[0]
        except Exception as exc:
            wait = 2 ** attempt
            log.warning("Attempt %d for %s failed: %s — retry in %ds",
                        attempt + 1, identifier, exc, wait)
            time.sleep(wait)
    return False, "Network error after 3 attempts"


def validate(input_file: str, dry_run: bool) -> None:
    with open(input_file, encoding="utf-8") as f:
        data = json.load(f)

    movies = data.get("movies", [])
    log.info("Checking %d movies in %s…", len(movies), input_file)

    ok: list[dict] = []
    dead: list[dict] = []

    for i, movie in enumerate(movies, 1):
        identifier = movie.get("identifier", "")
        title = movie.get("title", "?")
        log.info("[%d/%d] %s  →  %s", i, len(movies), identifier, title)

        accessible, reason = check_identifier(identifier)
        if accessible:
            log.info("  ✓  %s", reason)
            ok.append(movie)
        else:
            log.warning("  ✗  %s", reason)
            dead.append({"identifier": identifier, "title": title, "reason": reason})

        time.sleep(0.3)  # polite crawl delay

    # ---- Summary ----
    print("\n" + "=" * 60)
    print(f"RESULTS: {len(ok)} accessible, {len(dead)} dead/missing")
    if dead:
        print("\nDead items:")
        for d in dead:
            print(f"  {d['identifier']:40s}  {d['reason']}")
    print("=" * 60 + "\n")

    if dry_run:
        log.info("Dry-run mode — no changes written.")
        if dead:
            sys.exit(1)  # non-zero exit so CI can catch failures
        return

    if not dead:
        log.info("All items are accessible — nothing to remove.")
        return

    # ---- Write cleaned file ----
    data["movies"] = ok
    data["total_movies"] = len(ok)
    # Update category counts
    counts: dict[str, int] = {}
    for m in ok:
        cat = m.get("category", "drama")
        counts[cat] = counts.get(cat, 0) + 1
    data["category_counts"] = counts

    with open(input_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    log.info("Saved cleaned file: %d movies kept, %d removed → %s",
             len(ok), len(dead), input_file)


# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Validate archive.org identifiers")
    parser.add_argument(
        "--input", default=DEFAULT_INPUT,
        help=f"JSON file to validate (default: {DEFAULT_INPUT})"
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Report only — do not modify the file"
    )
    args = parser.parse_args()
    validate(args.input, args.dry_run)


if __name__ == "__main__":
    main()
