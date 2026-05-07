"""Role Inferencer — derives target job roles and interview focus areas from parsed resume data."""
from __future__ import annotations

import asyncio
import json

from backend.config import llm_client as _client, LLM_MODEL



_INFER_PROMPT = """\
You are an expert technical recruiter. Given this candidate profile, return a JSON object with:
  inferred_role    (str)       — single best-fit job title, e.g. "Backend Engineer"
  all_roles        (list[str]) — up to 3 suitable roles ranked by fit
  focus_areas      (list[str]) — exactly 5 specific interview topic areas tailored to this
                                  candidate, e.g. "Horizontal scaling with Redis", not "Databases"
  experience_years (int)       — your calibrated estimate of total relevant experience
  seniority        (str)       — one of: junior | mid | senior | lead

Candidate profile:
{context}

Return only valid JSON. No markdown, no commentary.\
"""


def _strip_fences(text: str) -> str:
    """Remove accidental markdown code fences from an LLM response."""
    text = text.strip()
    if text.startswith("```"):
        parts = text.split("```")
        text = parts[1]
        if text.startswith("json"):
            text = text[4:]
    return text.strip()


async def infer_roles(parsed_resume: dict) -> dict:
    """Analyse a parsed resume dict and produce a refined role + focus area profile.

    Args:
        parsed_resume: output dict from resume_parser.parse_resume()

    Returns a dict with:
        inferred_role (str)      — primary best-fit job title
        all_roles (list[str])    — up to 3 suitable roles ranked by fit
        focus_areas (list[str])  — 5 specific interview topic areas
        experience_years (int)   — calibrated years of relevant experience
        seniority (str)          — junior | mid | senior | lead

    Raises:
        RuntimeError: if Gemini returns unparseable JSON
    """
    context = json.dumps({
        "skills": parsed_resume.get("skills", []),
        "experience_years": parsed_resume.get("experience_years", 0),
        "recent_titles": [e.get("title", "") for e in parsed_resume.get("experience", [])[:3]],
        "project_techs": [
            t
            for p in parsed_resume.get("projects", [])
            for t in p.get("tech", [])
        ],
        "raw_inferred_roles": parsed_resume.get("inferred_roles", []),
    })

    response = await _client.chat.completions.create(
        model=LLM_MODEL,
        messages=[{"role": "user", "content": _INFER_PROMPT.format(context=context)}],
        temperature=0.2,
    )
    text = _strip_fences(response.choices[0].message.content)

    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        raise RuntimeError(
            f"Gemini returned invalid JSON: {exc}\nRaw response (first 300 chars): {text[:300]}"
        ) from exc


if __name__ == "__main__":
    sample = {
        "skills": ["python", "fastapi", "postgresql", "redis", "docker", "aws"],
        "experience_years": 3,
        "experience": [{"title": "Software Engineer", "company": "Acme Corp"}],
        "projects": [{"tech": ["fastapi", "postgresql", "redis"]}],
        "inferred_roles": ["Backend Engineer", "Full Stack Engineer"],
    }
    result = asyncio.run(infer_roles(sample))
    print(json.dumps(result, indent=2))
