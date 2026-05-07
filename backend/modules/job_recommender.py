"""Job Recommender — searches live listings via JSearch (RapidAPI) and ranks by role fit."""

from __future__ import annotations

import httpx

from backend.config import settings

_JSEARCH_URL = "https://jsearch.p.rapidapi.com/search"
_HEADERS = {
    "X-RapidAPI-Key": settings.rapidapi_key,
    "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
}


def search_jobs(role: str, location: str = "United States", num_results: int = 5) -> list[dict]:
    """Return top *num_results* job listings matching *role*.

    Each entry has: title, company, location, url, match_reason.
    """
    params = {
        "query": f"{role} in {location}",
        "page": "1",
        "num_pages": "1",
        "date_posted": "month",
    }
    with httpx.Client(timeout=15) as client:
        resp = client.get(_JSEARCH_URL, headers=_HEADERS, params=params)
        resp.raise_for_status()

    data = resp.json().get("data", [])[:num_results]
    results: list[dict] = []
    for job in data:
        results.append(
            {
                "title": job.get("job_title", ""),
                "company": job.get("employer_name", ""),
                "location": job.get("job_city") or job.get("job_country", ""),
                "url": job.get("job_apply_link") or job.get("job_google_link", ""),
                "match_reason": _build_match_reason(job, role),
            }
        )
    return results


def _build_match_reason(job: dict, role: str) -> str:
    highlights = job.get("job_highlights", {})
    qualifications = highlights.get("Qualifications", [])
    if qualifications:
        return "; ".join(qualifications[:2])
    description = (job.get("job_description") or "")[:200]
    return description or f"Matches inferred role: {role}"
