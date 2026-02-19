"""
Sarkari Job Scraper
====================
Uses Serper API (Google Search) to discover new government job notifications,
then Gemini AI to extract structured job data with strict accuracy validation.
Only accepts official .gov.in / .nic.in domain sources.
Deduplicates entries before pushing to the database.
"""

import os
import json
import logging
import hashlib
import re
from datetime import datetime, date
from typing import Optional
import requests

# ─── Logging Setup ─────────────────────────────────────────────────────────────
os.makedirs("scraper/logs", exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(f"scraper/logs/run_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"),
        logging.StreamHandler(),
    ],
)
log = logging.getLogger(__name__)

# ─── Config ────────────────────────────────────────────────────────────────────
SERPER_API_KEY = os.environ["SERPER_API_KEY"]
GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

ALLOWED_DOMAINS = (".gov.in", ".nic.in")
GEMINI_MODEL = "gemini-1.5-flash"
GEMINI_ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

SEARCH_QUERIES = [
    "site:gov.in OR site:nic.in sarkari job vacancy 2025 notification",
    "site:upsc.gov.in recruitment notification 2025",
    "site:ssc.nic.in recruitment 2025",
    "site:rrbcdg.gov.in recruitment 2025",
    "site:ibps.in recruitment 2025",
    "site:navodaya.gov.in recruitment notification 2025",
    "site:drdo.gov.in recruitment 2025",
    "site:isro.gov.in recruitment 2025",
    "site:indianarmy.nic.in recruitment 2025",
    "site:crpf.gov.in recruitment notification 2025",
]

# ─── Domain Verification ───────────────────────────────────────────────────────
def is_official_domain(url: str) -> bool:
    """Only allow .gov.in or .nic.in domains."""
    return any(url.lower().replace("https://", "").replace("http://", "").split("/")[0].endswith(d) for d in ALLOWED_DOMAINS)

def extract_domain(url: str) -> str:
    return url.replace("https://", "").replace("http://", "").split("/")[0]

# ─── Deduplication ─────────────────────────────────────────────────────────────
def make_job_id(title: str, organization: str) -> str:
    """Generate a stable hash-based ID to prevent duplicates."""
    raw = f"{title.lower().strip()}|{organization.lower().strip()}"
    return hashlib.md5(raw.encode()).hexdigest()[:16]

# ─── Serper Search ─────────────────────────────────────────────────────────────
def search_jobs(query: str, num: int = 10) -> list[dict]:
    """Call Serper API to search Google and return organic results."""
    try:
        resp = requests.post(
            "https://google.serper.dev/search",
            headers={"X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json"},
            json={"q": query, "gl": "in", "hl": "en", "num": num},
            timeout=15,
        )
        resp.raise_for_status()
        results = resp.json().get("organic", [])
        # Filter to official domains only
        verified = [r for r in results if is_official_domain(r.get("link", ""))]
        log.info(f"Query: '{query[:60]}' → {len(results)} results, {len(verified)} verified")
        return verified
    except Exception as e:
        log.error(f"Serper search failed: {e}")
        return []

# ─── Gemini Extraction ─────────────────────────────────────────────────────────
EXTRACTION_PROMPT = """
You are a strict government job data extractor. Extract structured data from the job notification snippet below.

STRICT RULES:
1. If you are NOT 100% certain about a field, return "N/A" — NEVER guess.
2. Dates must be in YYYY-MM-DD format or "N/A".
3. Posts must be a number or "N/A".
4. Return ONLY valid JSON, no markdown, no explanation.

Job Snippet:
---
{snippet}
---
Source URL: {url}
Source Domain: {domain}

Return this exact JSON structure:
{{
  "title": "Full official job title or N/A",
  "organization": "Organization name or N/A",
  "department": "Ministry or department or N/A",
  "category": "latest|admit-card|results",
  "posts": "Number or N/A",
  "last_date": "YYYY-MM-DD or N/A",
  "notification_date": "YYYY-MM-DD or N/A",
  "location": "State/All India or N/A",
  "qualification": "Required qualification or N/A",
  "age_limit": "Age range or N/A",
  "salary": "Pay scale or N/A",
  "tags": ["tag1", "tag2"]
}}
"""

def extract_with_gemini(snippet: str, url: str, domain: str) -> Optional[dict]:
    """Use Gemini to extract structured job data with strict N/A policy."""
    prompt = EXTRACTION_PROMPT.format(snippet=snippet[:2000], url=url, domain=domain)
    try:
        resp = requests.post(
            f"{GEMINI_ENDPOINT}?key={GEMINI_API_KEY}",
            json={"contents": [{"parts": [{"text": prompt}]}]},
            timeout=20,
        )
        resp.raise_for_status()
        text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
        # Strip any markdown code fences
        text = re.sub(r"```json\s*|```\s*", "", text).strip()
        data = json.loads(text)
        return data
    except json.JSONDecodeError as e:
        log.warning(f"Gemini returned invalid JSON for {url}: {e}")
        return None
    except Exception as e:
        log.error(f"Gemini extraction error for {url}: {e}")
        return None

# ─── Database Operations ───────────────────────────────────────────────────────
def get_existing_ids() -> set[str]:
    """Fetch all existing job IDs from Supabase to prevent duplicates."""
    try:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/jobs?select=id",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
            },
            timeout=15,
        )
        resp.raise_for_status()
        return {r["id"] for r in resp.json()}
    except Exception as e:
        log.error(f"Failed to fetch existing IDs: {e}")
        return set()

def archive_expired_jobs():
    """Move jobs past their last_date to archived status."""
    today_str = date.today().isoformat()
    try:
        resp = requests.patch(
            f"{SUPABASE_URL}/rest/v1/jobs?last_date=lt.{today_str}&status=neq.expired",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal",
            },
            json={"status": "expired", "category": "archived"},
            timeout=15,
        )
        log.info(f"Archived expired jobs: HTTP {resp.status_code}")
    except Exception as e:
        log.error(f"Failed to archive expired jobs: {e}")

def upsert_job(job_data: dict):
    """Insert a new job if it doesn't exist (no duplicates)."""
    try:
        resp = requests.post(
            f"{SUPABASE_URL}/rest/v1/jobs",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "resolution=ignore-duplicates",
            },
            json=job_data,
            timeout=15,
        )
        return resp.status_code in (200, 201)
    except Exception as e:
        log.error(f"Failed to upsert job: {e}")
        return False

# ─── Main Pipeline ─────────────────────────────────────────────────────────────
def main():
    log.info("=" * 60)
    log.info("Sarkari Job Scraper started")
    log.info(f"Run time: {datetime.now().isoformat()}")
    log.info("=" * 60)

    # Step 1: Archive expired jobs
    log.info("Step 1: Archiving expired jobs...")
    archive_expired_jobs()

    # Step 2: Fetch existing IDs for deduplication
    log.info("Step 2: Fetching existing job IDs...")
    existing_ids = get_existing_ids()
    log.info(f"Found {len(existing_ids)} existing jobs in database")

    # Step 3: Search and extract
    all_results: list[dict] = []
    for query in SEARCH_QUERIES:
        results = search_jobs(query, num=10)
        all_results.extend(results)

    # Deduplicate search results by URL
    seen_urls: set[str] = set()
    unique_results = []
    for r in all_results:
        url = r.get("link", "")
        if url not in seen_urls:
            seen_urls.add(url)
            unique_results.append(r)

    log.info(f"Step 3: {len(unique_results)} unique verified URLs to process")

    # Step 4: Extract & upsert
    new_count = 0
    skipped_count = 0
    error_count = 0

    for result in unique_results:
        url = result.get("link", "")
        snippet = f"{result.get('title', '')} {result.get('snippet', '')}"
        domain = extract_domain(url)

        extracted = extract_with_gemini(snippet, url, domain)
        if not extracted or extracted.get("title") == "N/A":
            log.warning(f"Skipping (no valid data): {url}")
            error_count += 1
            continue

        job_id = make_job_id(
            extracted.get("title", ""),
            extracted.get("organization", "")
        )

        if job_id in existing_ids:
            log.debug(f"Duplicate, skipping: {extracted.get('title', '')[:60]}")
            skipped_count += 1
            continue

        today = date.today()
        last_date_str = extracted.get("last_date", "N/A")
        status = "active"
        if last_date_str != "N/A":
            try:
                last_date = date.fromisoformat(last_date_str)
                days_left = (last_date - today).days
                if days_left < 0:
                    status = "expired"
                elif days_left <= 5:
                    status = "expiring"
            except ValueError:
                pass

        job_row = {
            "id": job_id,
            "title": extracted.get("title", "N/A"),
            "organization": extracted.get("organization", "N/A"),
            "department": extracted.get("department", "N/A"),
            "category": extracted.get("category", "latest"),
            "status": status,
            "posts": extracted.get("posts", "N/A"),
            "last_date": last_date_str if last_date_str != "N/A" else None,
            "notification_date": extracted.get("notification_date", None),
            "source_url": url,
            "source_domain": domain,
            "is_verified_source": True,
            "location": extracted.get("location", "N/A"),
            "qualification": extracted.get("qualification", "N/A"),
            "age_limit": extracted.get("age_limit", "N/A"),
            "salary": extracted.get("salary", "N/A"),
            "tags": extracted.get("tags", []),
            "scraped_at": datetime.now().isoformat(),
        }

        success = upsert_job(job_row)
        if success:
            new_count += 1
            existing_ids.add(job_id)
            log.info(f"✓ Added: {extracted.get('title', '')[:70]}")
        else:
            error_count += 1

    # Summary
    log.info("=" * 60)
    log.info("Scraper run complete:")
    log.info(f"  ✓ New jobs added : {new_count}")
    log.info(f"  ↩ Duplicates skipped: {skipped_count}")
    log.info(f"  ✗ Errors/skipped : {error_count}")
    log.info("=" * 60)


if __name__ == "__main__":
    main()
