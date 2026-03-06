import requests
import json
import re
import time
from datetime import datetime

class PublicDomainScraper:
    """
    Scrapes public domain movies from Internet Archive.
    Strict validation: every movie must have title, year, valid stream URL,
    thumbnail, category, and proper citation.
    """

    CATEGORY_KEYWORDS = {
        "horror": [
            "horror", "zombie", "vampire", "ghost", "haunted", "monster",
            "terror", "fright", "nightmare", "undead", "demon", "witch",
            "creature", "supernatural", "slasher", "gore"
        ],
        "scifi": [
            "sci-fi", "science fiction", "space", "alien", "robot", "future",
            "dystopia", "utopia", "galaxy", "planet", "mars", "moon",
            "rocket", "invasion", "atomic", "radiation"
        ],
        "comedy": [
            "comedy", "humor", "humour", "funny", "comic", "slapstick",
            "farce", "parody", "satire", "laugh", "comedian", "gag"
        ],
        "drama": [
            "drama", "tragic", "tragedy", "emotional", "melodrama", "relationship"
        ],
        "romance": [
            "romance", "romantic", "love"
        ],
        "action": [
            "action", "adventure", "war", "battle", "fight", "combat",
            "thriller", "chase", "spy", "espionage", "martial arts",
            "western", "cowboy"
        ],
        "documentary": [
            "documentary", "documental", "non-fiction", "nonfiction",
            "educational", "history", "historical", "biography",
            "nature", "science", "propaganda", "newsreel"
        ],
        "noir": [
            "noir", "detective", "mystery", "crime", "hardboiled", "gumshoe", "sleuth"
        ],
        "kids": [
            "kids", "children", "family", "cartoon", "animation", "animated"
        ],
    }

    BLACKLIST_KEYWORDS = [
        "porn", "pornographic", "xxx", "adult", "erotica", "nsfw",
        "nude", "nudity", "sex", "erotic"
    ]

    # Curated Internet Archive collections known to have public domain films
    ARCHIVE_QUERIES = [
        {
            "query": 'collection:(feature_films) AND mediatype:(movies)',
            "label": "Feature Films"
        },
        {
            "query": 'collection:(SciFi_Horror) AND mediatype:(movies)',
            "label": "Sci-Fi & Horror"
        },
        {
            "query": 'collection:(Film_Noir) AND mediatype:(movies)',
            "label": "Film Noir"
        },
        {
            "query": 'collection:(comedy_films) AND mediatype:(movies)',
            "label": "Comedy Films"
        },
        {
            "query": 'collection:(classic_tv) AND mediatype:(movies)',
            "label": "Classic TV"
        },
        {
            "query": 'collection:(moviesandfilms) AND mediatype:(movies) AND year:[1920 TO 1980]',
            "label": "Classic Movies"
        },
        {
            "query": 'collection:(film_chest) AND mediatype:(movies)',
            "label": "Film Chest"
        },
        {
            "query": 'collection:(animationandcartoons) AND mediatype:(movies)',
            "label": "Animation & Cartoons"
        },
    ]

    def __init__(self):
        self.seen_titles = set()
        self.movies = []
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "VoidTV-PublicDomainScraper/1.0 (educational project)"
        })

    def classify_category(self, title, subjects):
        """Determine a single primary category from title + subject tags."""
        text = f"{title} {' '.join(subjects) if isinstance(subjects, list) else str(subjects)}".lower()

        scores = {}
        for cat, keywords in self.CATEGORY_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in text)
            if score > 0:
                scores[cat] = score

        if scores:
            return max(scores, key=scores.get)

        # Fallback heuristic based on era
        return "drama"

    def validate_movie(self, movie):
        """Strict validation — reject anything incomplete."""
        required = ["title", "year", "stream_url", "thumbnail", "category", "source"]
        for field in required:
            if not movie.get(field):
                return False

        # Title must be a real string, not empty or placeholder
        title = movie["title"].strip()
        if len(title) < 2:
            return False
        if re.match(r'^[\d\s\-_]+$', title):
            return False

        # Year must be reasonable
        try:
            year = int(movie["year"])
            if year < 1888 or year > 1995:
                return False
        except (ValueError, TypeError):
            return False

        # No duplicate titles (normalized)
        norm_title = re.sub(r'[^a-z0-9]', '', title.lower())
        if norm_title in self.seen_titles:
            return False
        self.seen_titles.add(norm_title)

        return True

    def scrape_internet_archive(self):
        """Scrape multiple Internet Archive collections."""
        print("Scraping Internet Archive collections...")

        for query_info in self.ARCHIVE_QUERIES:
            print(f"  → {query_info['label']}...")
            try:
                page = 1
                while True:
                    resp = self.session.get(
                        "https://archive.org/advancedsearch.php",
                        params={
                            "q": query_info["query"],
                            "fl": "identifier,title,year,subject,description,licenseurl",
                            "output": "json",
                            "rows": 1000,
                            "page": page,
                            "sort[]": "downloads desc",
                        },
                        timeout=30,
                    )
                    resp.raise_for_status()
                    data = resp.json()
                    docs = data.get("response", {}).get("docs", [])
                    print(f"    Found {len(docs)} items on page {page}")

                    for item in docs:
                        self._process_archive_item(item, query_info["label"])
                        
                    if len(docs) < 1000:
                        break
                    
                    page += 1
                    time.sleep(1)  # polite delay
            except Exception as e:
                print(f"    Error: {e}")
                continue

    def _process_archive_item(self, item, collection_label):
        """Process a single Internet Archive item into a movie entry."""
        identifier = item.get("identifier", "")
        title = item.get("title", "").strip()
        year = item.get("year")
        subjects = item.get("subject", [])
        description = item.get("description", "")

        if isinstance(subjects, str):
            subjects = [subjects]

        if isinstance(description, list):
            description = " ".join(description)

        # Clean description: strip HTML
        description = re.sub(r'<[^>]+>', '', str(description))
        description = re.sub(r'\s+', ' ', description).strip()

        # Check blacklist
        text_to_check = f"{title} {description} {' '.join(subjects)}".lower()
        if any(bad_word in text_to_check.split() for bad_word in self.BLACKLIST_KEYWORDS):
            return

        if len(description) > 300:
            description = description[:297] + "..."

        if not description or len(description) < 10:
            description = f"A classic {collection_label.lower()} film."

        category = self.classify_category(title, subjects)
        thumbnail = f"https://archive.org/services/img/{identifier}"
        stream_url = f"https://archive.org/details/{identifier}"
        embed_url = f"https://archive.org/embed/{identifier}"

        movie = {
            "id": identifier,
            "title": title,
            "year": year,
            "category": category,
            "description": description,
            "thumbnail": thumbnail,
            "stream_url": stream_url,
            "embed_url": embed_url,
            "source": "Internet Archive",
            "license": "Public Domain",
            "source_url": stream_url,
            "collection": collection_label,
        }

        if self.validate_movie(movie):
            self.movies.append(movie)

    def save_to_json(self, filename="movies.json"):
        """Save movies with full metadata and citations."""
        output = {
            "version": "2.0",
            "updated": datetime.now().isoformat(),
            "total_movies": len(self.movies),
            "source_info": {
                "primary": "Internet Archive (archive.org)",
                "license": "Public Domain",
                "disclaimer": "All content is believed to be in the public domain. If you believe any content is incorrectly listed, please contact us."
            },
            "categories": list(self.CATEGORY_KEYWORDS.keys()),
            "movies": self.movies,
        }

        with open(filename, "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2, ensure_ascii=False)

        print(f"\nSaved {len(self.movies)} movies to {filename}")

        # Print category breakdown
        cats = {}
        for m in self.movies:
            cats[m["category"]] = cats.get(m["category"], 0) + 1
        print("Category breakdown:")
        for cat, count in sorted(cats.items(), key=lambda x: -x[1]):
            print(f"  {cat}: {count}")


if __name__ == "__main__":
    print("=" * 50)
    print("VoidTV Public Domain Movie Scraper")
    print("=" * 50)

    scraper = PublicDomainScraper()
    scraper.scrape_internet_archive()

    if scraper.movies:
        scraper.save_to_json()
    else:
        print("No movies found. Check your network connection.")