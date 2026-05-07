"""Job Recommender — searches live listings via JSearch (RapidAPI) and returns ranked results."""
from __future__ import annotations

import asyncio

import httpx

from backend.config import settings

_JSEARCH_URL = "https://jsearch.p.rapidapi.com/search"
_HEADERS = {
    "X-RapidAPI-Key": settings.rapidapi_key,
    "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
}


async def search_jobs(
    role: str,
    location: str = "United States",
    num_results: int = 5,
) -> list[dict]:
    """Fetch top job listings for the given role via JSearch on RapidAPI.

    Args:
        role:        target job title to search, e.g. "Backend Engineer"
        location:    city or country string appended to the query (default: US-wide)
        num_results: max number of listings to return (default 5)

    Returns a list of dicts, each with:
        title, company, location, url, match_reason

    Raises:
        httpx.HTTPStatusError: if the RapidAPI request fails
    """
    params = {
        "query": f"{role} in {location}",
        "page": "1",
        "num_pages": "1",
        "date_posted": "month",
    }

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(_JSEARCH_URL, headers=_HEADERS, params=params)
        resp.raise_for_status()

    data = resp.json().get("data", [])[:num_results]
    return [_format_job(job, role) for job in data]


def _format_job(job: dict, role: str) -> dict:
    """Extract and normalise relevant fields from a raw JSearch job record.

    Builds a human-readable match_reason from job highlights if available,
    falling back to the first 200 chars of the description.
    """
    highlights = job.get("job_highlights", {})
    qualifications = highlights.get("Qualifications", [])
    if qualifications:
        match_reason = "; ".join(qualifications[:2])
    else:
        description = (job.get("job_description") or "")[:200]
        match_reason = description or f"Matches inferred role: {role}"

    return {
        "title": job.get("job_title", ""),
        "company": job.get("employer_name", ""),
        "location": job.get("job_city") or job.get("job_country") or "",
        "url": job.get("job_apply_link") or job.get("job_google_link", ""),
        "match_reason": match_reason,
    }


if __name__ == "__main__":
    results = asyncio.run(search_jobs("Backend Engineer"))
    for r in results:
        print(f"{r['title']} — {r['company']} ({r['location']})")
