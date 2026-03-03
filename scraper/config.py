"""
VoidTV Scraper Configuration
============================
Edit this file to customise scraper behaviour, add manual review items,
or override metadata for specific films.
"""

# ── Public Domain Cutoff ──────────────────────────────────────────────────────
# Films published BEFORE this year are unambiguously in the US public domain.
# As of Jan 1, 2024: the cutoff is 1928.
# This advances by 1 year every January 1st (Sonny Bono Copyright Term Extension Act).
PD_CUTOFF_YEAR = 1928

# ── Trusted Sources ───────────────────────────────────────────────────────────
TRUSTED_SOURCES = [
    "archive.org",       # Internet Archive
]

# ── Manual Review Queue ───────────────────────────────────────────────────────
# Films that were automatically flagged as needing manual review.
# After you have manually verified a film's PD status, move it to
# MANUALLY_VERIFIED below with a citation.
NEEDS_MANUAL_REVIEW = [
    # Example:
    # {
    #     "ia_identifier": "some-film-1935",
    #     "title": "Some Film",
    #     "year": 1935,
    #     "reason": "Copyright renewal check needed",
    # }
]

# ── Manually Verified Films ───────────────────────────────────────────────────
# Films that have been manually verified as public domain, with citations.
# These are added to the output regardless of automatic checks.
MANUALLY_VERIFIED = [
    # Example:
    # {
    #     "ia_identifier": "some-film-1935",
    #     "pd_reason": "non_renewed",
    #     "pd_notes": "Verified: no renewal found in US Copyright Office records. "
    #                 "Checked 2024-01-15 at https://cocatalog.loc.gov/ "
    #                 "under registration class 'MP' (Motion Pictures).",
    #     "verified_by": "YourName",
    #     "verified_date": "2024-01-15",
    #     "source_url": "https://cocatalog.loc.gov/...",
    # }
]

# ── Blocklist ─────────────────────────────────────────────────────────────────
# IA identifiers to always skip, even if they would otherwise pass PD checks.
# Use for films with disputed rights, known issues, or that you've chosen
# not to include for editorial reasons.
BLOCKLIST = [
    # "some-disputed-film-1920",
]

# ── Override Metadata ─────────────────────────────────────────────────────────
# Override scraped metadata for specific films.
# Keys match IA identifier. Values are merged on top of scraped data.
METADATA_OVERRIDES = {
    # Example:
    # "Nosferatu": {
    #     "title": "Nosferatu: A Symphony of Horror",
    #     "director": "F.W. Murnau",
    #     "kids_safe": False,
    #     "genre": ["Horror", "Silent"],
    # }
}

# ── Content Warnings ──────────────────────────────────────────────────────────
# Add content warnings for specific films that will be shown before playback.
CONTENT_WARNINGS = {
    "ThebirthofanationBirth1915": (
        "Contains extreme racial prejudice, glorification of the KKK, "
        "and deeply offensive depictions of Black Americans. "
        "Presented for historical/educational purposes only."
    ),
}

# ── Rate Limiting ─────────────────────────────────────────────────────────────
REQUEST_DELAY_SECONDS = 0.8
MAX_RETRIES           = 4
REQUEST_TIMEOUT       = 30

# ── Output ────────────────────────────────────────────────────────────────────
DEFAULT_OUTPUT_PATH = "../public/movies.json"
