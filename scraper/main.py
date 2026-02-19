"""
Sarkari Job Scraper
====================
Uses Serper API (Google Search) to discover new government job notifications,
then Gemini AI to extract structured job data with strict accuracy validation.

Architecture:
  - Scraper searches Google via Serper API
  - Gemini AI extracts structured job data from search snippets
  - Job data is sent to the secure ingest-jobs Edge Function
  - Edge Function writes to the database using service-role access

Accuracy Guarantees:
  1. DOMAIN WHITELIST     — Only .gov.in / .nic.in URLs are processed.
  2. STRICT JSON SCHEMA   — Gemini must return 'N/A' for any uncertain field.
  3. VALIDATION LAYER     — Post-extraction check rejects weak/incomplete data.
  4. HASH DEDUPLICATION   — MD5(title|org) prevents duplicate DB entries.
  5. AUTO-EXPIRY          — Jobs past their last_date are archived automatically.
"""

import os
import json
import logging
import hashlib
import re
from datetime import datetime, date
from typing import Optional
from urllib.parse import urlparse
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
SERPER_API_KEY   = os.environ["SERPER_API_KEY"]
GEMINI_API_KEY   = os.environ["GEMINI_API_KEY"]
SCRAPER_API_KEY  = os.environ["SCRAPER_API_KEY"]
SUPABASE_PROJECT = os.environ["SUPABASE_PROJECT_ID"]   # e.g. ivwctxktrtbvpuwbmtyv

# Edge Function endpoint (no service role key needed — auth via SCRAPER_API_KEY)
INGEST_URL = f"https://{SUPABASE_PROJECT}.supabase.co/functions/v1/ingest-jobs"
INGEST_HEADERS = {
    "Content-Type": "application/json",
    "x-scraper-key": SCRAPER_API_KEY,
}

# ── 1. STRICT DOMAIN WHITELIST ──────────────────────────────────────────────
ALLOWED_DOMAINS = (".gov.in", ".nic.in")

# Minimum number of non-N/A fields required to accept a job entry
MIN_VALID_FIELDS = 3

GEMINI_MODEL    = "gemini-1.5-flash"
GEMINI_ENDPOINT = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent"
)

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

# ─── 1. Domain Whitelist ───────────────────────────────────────────────────────
def is_official_domain(url: str) -> bool:
    try:
        hostname = urlparse(url).hostname or ""
        return any(hostname.endswith(d) for d in ALLOWED_DOMAINS)
    except Exception:
        return False

def extract_domain(url: str) -> str:
    try:
        return urlparse(url).hostname or ""
    except Exception:
        return ""

# ─── 2. Strict JSON Schema Prompt ──────────────────────────────────────────────
EXTRACTION_PROMPT = """
You are a strict, read-only government job data extractor.

RULES — you MUST follow all of them:
1. Return ONLY valid JSON. No markdown, no code fences, no explanation.
2. If you are NOT 100% certain about a value, return "N/A". NEVER guess.
3. Dates MUST be in YYYY-MM-DD format or "N/A" — never any other format.
4. "posts" MUST be an integer string (e.g. "120") or "N/A".
5. "category" MUST be exactly one of: "latest", "admit-card", "results", "archived".
6. "tags" MUST be a JSON array of short lowercase strings (e.g. ["ssc","central"]).
7. Do NOT infer data from the source domain name alone.

Job Snippet:
---
{snippet}
---
Source URL: {url}
Source Domain: {domain}

Return EXACTLY this JSON structure (no extra keys):
{{
  "title": "Full official job title or N/A",
  "organization": "Organization name or N/A",
  "department": "Ministry or department or N/A",
  "category": "latest|admit-card|results",
  "posts": "Integer or N/A",
  "last_date": "YYYY-MM-DD or N/A",
  "notification_date": "YYYY-MM-DD or N/A",
  "location": "State or All India or N/A",
  "qualification": "Required qualification or N/A",
  "age_limit": "Age range or N/A",
  "salary": "Pay scale or N/A",
  "tags": ["tag1", "tag2"]
}}
"""

# ─── 3. Validation Layer ────────────────────────────────────────────────────────
SCORED_FIELDS = [
    "title", "organization", "department",
    "last_date", "location", "qualification",
    "age_limit", "salary", "posts",
]

def validate_job_data(data: dict) -> tuple[bool, str]:
    ALLOWED_CATEGORIES = {"latest", "admit-card", "results", "archived"}

    if not data.get("title") or data["title"] == "N/A":
        return False, "Missing required field: title"
    if not data.get("organization") or data["organization"] == "N/A":
        return False, "Missing required field: organization"

    category = data.get("category", "")
    if category not in ALLOWED_CATEGORIES:
        data["category"] = "latest"

    last_date_str = data.get("last_date", "N/A")
    if last_date_str != "N/A":
        try:
            date.fromisoformat(last_date_str)
        except ValueError:
            return False, f"Invalid last_date format: {last_date_str}"

    notif_date_str = data.get("notification_date", "N/A")
    if notif_date_str and notif_date_str != "N/A":
        try:
            date.fromisoformat(notif_date_str)
        except ValueError:
            data["notification_date"] = None

    populated = sum(
        1 for f in SCORED_FIELDS
        if data.get(f) and data[f] != "N/A"
    )
    if populated < MIN_VALID_FIELDS:
        return False, (
            f"Too few valid fields ({populated}/{len(SCORED_FIELDS)}); "
            f"minimum required: {MIN_VALID_FIELDS}"
        )

    return True, "OK"

# ─── 4. Hash-based Deduplication ───────────────────────────────────────────────
def make_job_id(title: str, organization: str) -> str:
    raw = f"{title.lower().strip()}|{organization.lower().strip()}"
    return hashlib.md5(raw.encode()).hexdigest()[:16]

# ─── Serper Search ─────────────────────────────────────────────────────────────
def search_jobs(query: str, num: int = 10) -> list[dict]:
    try:
        resp = requests.post(
            "https://google.serper.dev/search",
            headers={"X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json"},
            json={"q": query, "gl": "in", "hl": "en", "num": num},
            timeout=15,
        )
        resp.raise_for_status()
        results = resp.json().get("organic", [])
        verified = [r for r in results if is_official_domain(r.get("link", ""))]
        rejected = len(results) - len(verified)
        log.info(
            f"Query: '{query[:60]}' → {len(results)} results, "
            f"{len(verified)} verified, {rejected} rejected (non-govt domain)"
        )
        return verified
    except Exception as e:
        log.error(f"Serper search failed: {e}")
        return []

# ─── Gemini Extraction ─────────────────────────────────────────────────────────
def extract_with_gemini(snippet: str, url: str, domain: str) -> Optional[dict]:
    prompt = EXTRACTION_PROMPT.format(snippet=snippet[:2000], url=url, domain=domain)
    try:
        resp = requests.post(
            f"{GEMINI_ENDPOINT}?key={GEMINI_API_KEY}",
            json={"contents": [{"parts": [{"text": prompt}]}]},
            timeout=20,
        )
        resp.raise_for_status()
        text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
        text = re.sub(r"```json\s*|```\s*", "", text).strip()
        return json.loads(text)
    except json.JSONDecodeError as e:
        log.warning(f"Gemini returned invalid JSON for {url}: {e}")
        return None
    except Exception as e:
        log.error(f"Gemini extraction error for {url}: {e}")
        return None

# ─── Edge Function Calls ───────────────────────────────────────────────────────
def call_edge(payload: dict, timeout: int = 15) -> Optional[dict]:
    """POST to the ingest-jobs edge function and return parsed JSON or None."""
    try:
        resp = requests.post(INGEST_URL, headers=INGEST_HEADERS, json=payload, timeout=timeout)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        log.error(f"Edge function call failed (action={payload.get('action')}): {e}")
        return None

def get_existing_ids() -> set[str]:
    result = call_edge({"action": "get_ids"})
    if result and result.get("success"):
        return set(result.get("ids", []))
    return set()

def archive_expired_jobs():
    result = call_edge({"action": "archive_expired"})
    if result and result.get("success"):
        log.info("Archived expired jobs via edge function ✓")
    else:
        log.error("Failed to archive expired jobs")

def upsert_job(job_data: dict) -> bool:
    result = call_edge({"action": "upsert", "job": job_data})
    return bool(result and result.get("success"))

# ─── Status Helper ─────────────────────────────────────────────────────────────
def compute_status(last_date_str: str) -> str:
    if last_date_str == "N/A" or not last_date_str:
        return "active"
    try:
        days_left = (date.fromisoformat(last_date_str) - date.today()).days
        if days_left < 0:
            return "expired"
        if days_left <= 5:
            return "expiring"
    except ValueError:
        pass
    return "active"

# ─── Main Pipeline ─────────────────────────────────────────────────────────────
def main():
    log.info("=" * 60)
    log.info("Sarkari Job Scraper started")
    log.info(f"Run time       : {datetime.now().isoformat()}")
    log.info(f"Domain whitelist: {ALLOWED_DOMAINS}")
    log.info(f"Min valid fields: {MIN_VALID_FIELDS}")
    log.info(f"Ingest endpoint : {INGEST_URL}")
    log.info("=" * 60)

    # Step 1: Archive expired jobs
    log.info("Step 1: Archiving expired jobs …")
    archive_expired_jobs()

    # Step 2: Deduplication — fetch existing IDs
    log.info("Step 2: Fetching existing job IDs …")
    existing_ids = get_existing_ids()
    log.info(f"  → {len(existing_ids)} existing jobs in database")

    # Step 3: Search across all queries
    all_results: list[dict] = []
    for query in SEARCH_QUERIES:
        all_results.extend(search_jobs(query, num=10))

    # Deduplicate search results by URL
    seen_urls: set[str] = set()
    unique_results = [
        r for r in all_results
        if not (r.get("link", "") in seen_urls or seen_urls.add(r.get("link", "")))  # type: ignore[func-returns-value]
    ]
    log.info(f"Step 3: {len(unique_results)} unique verified URLs to process")

    # Step 4: Extract → Validate → Deduplicate → Upsert
    new_count      = 0
    skipped_dup    = 0
    skipped_domain = 0
    skipped_valid  = 0
    error_count    = 0

    for result in unique_results:
        url     = result.get("link", "")
        domain  = extract_domain(url)
        snippet = f"{result.get('title', '')} {result.get('snippet', '')}"

        # ── Guard 1: domain whitelist ──────────────────────────────────────────
        if not is_official_domain(url):
            log.warning(f"[DOMAIN REJECTED] {url}")
            skipped_domain += 1
            continue

        # ── Gemini extraction ──────────────────────────────────────────────────
        extracted = extract_with_gemini(snippet, url, domain)
        if not extracted:
            log.warning(f"[GEMINI FAILED] {url}")
            error_count += 1
            continue

        # ── Guard 2: post-extraction validation layer ──────────────────────────
        is_valid, reason = validate_job_data(extracted)
        if not is_valid:
            log.warning(f"[VALIDATION FAILED] {reason} | {url}")
            skipped_valid += 1
            continue

        # ── Guard 3: hash-based deduplication ─────────────────────────────────
        job_id = make_job_id(extracted["title"], extracted["organization"])
        if job_id in existing_ids:
            log.debug(f"[DUPLICATE] {extracted['title'][:60]}")
            skipped_dup += 1
            continue

        # ── Build DB row ───────────────────────────────────────────────────────
        last_date_str = extracted.get("last_date", "N/A")
        notif_date    = extracted.get("notification_date")
        if notif_date == "N/A":
            notif_date = None

        job_row = {
            "id":                job_id,
            "title":             extracted["title"],
            "organization":      extracted["organization"],
            "department":        extracted.get("department", "N/A"),
            "category":          extracted.get("category", "latest"),
            "status":            compute_status(last_date_str),
            "posts":             extracted.get("posts", "N/A"),
            "last_date":         last_date_str if last_date_str != "N/A" else None,
            "notification_date": notif_date,
            "source_url":        url,
            "source_domain":     domain,
            "is_verified_source": True,
            "location":          extracted.get("location", "N/A"),
            "qualification":     extracted.get("qualification", "N/A"),
            "age_limit":         extracted.get("age_limit", "N/A"),
            "salary":            extracted.get("salary", "N/A"),
            "tags":              extracted.get("tags", []),
            "scraped_at":        datetime.now().isoformat(),
        }

        success = upsert_job(job_row)
        if success:
            new_count += 1
            existing_ids.add(job_id)
            log.info(f"✓ Added  : {extracted['title'][:70]}")
        else:
            error_count += 1
            log.error(f"✗ Upsert failed for: {extracted['title'][:70]}")

    # ── Summary ────────────────────────────────────────────────────────────────
    log.info("=" * 60)
    log.info("Scraper run complete:")
    log.info(f"  ✓ New jobs added        : {new_count}")
    log.info(f"  ↩ Duplicates skipped    : {skipped_dup}")
    log.info(f"  ✗ Domain rejected       : {skipped_domain}")
    log.info(f"  ✗ Validation failed     : {skipped_valid}")
    log.info(f"  ✗ Extraction errors     : {error_count}")
    log.info("=" * 60)


if __name__ == "__main__":
    main()
