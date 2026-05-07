"""Resume Parser — PDF/text extraction + Gemini-powered structured parsing."""
from __future__ import annotations

import asyncio
import json
from pathlib import Path

import pdfplumber
from backend.config import llm_client as _client, LLM_MODEL



_PARSE_PROMPT = """\
Parse the following resume. Return a JSON object with these exact keys:
  name            (str)
  email           (str)
  phone           (str)
  skills          (list[str] — lowercase, deduplicated)
  experience_years (int — total years of work experience, estimated from dates)
  experience      (list of {{title, company, duration, bullets: list[str]}})
  projects        (list of {{name, description, tech: list[str]}})
  education       (list of {{degree, institution, year}})
  inferred_roles  (list[str] — up to 3 specific job titles this person suits best)

Resume text:
{text}

Return only valid JSON. No markdown fences, no extra commentary.\
"""


def extract_text_from_pdf(file_path: str) -> str:
    """Return concatenated page text from a PDF file.

    Joins non-empty pages with a blank line separator.
    Raises ValueError if no text could be extracted.
    """
    pages: list[str] = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                pages.append(text.strip())
    if not pages:
        raise ValueError(f"No text could be extracted from {file_path!r}")
    return "\n\n".join(pages)


def extract_text_from_txt(file_path: str) -> str:
    """Return the full text of a plain-text (.txt) resume file.

    Raises ValueError if the file is empty.
    """
    text = Path(file_path).read_text(encoding="utf-8", errors="replace").strip()
    if not text:
        raise ValueError(f"File {file_path!r} is empty")
    return text


def _strip_fences(text: str) -> str:
    """Remove accidental markdown code fences from an LLM response."""
    text = text.strip()
    if text.startswith("```"):
        parts = text.split("```")
        text = parts[1]
        if text.startswith("json"):
            text = text[4:]
    return text.strip()


async def parse_resume(file_path: str) -> dict:
    """Parse a PDF or .txt resume and return structured fields via Gemini.

    Runs pdfplumber in a thread (it is synchronous) so the event loop is not blocked.

    Args:
        file_path: path to the resume file (.pdf or .txt)

    Returns a dict with keys:
        name, email, phone, skills, experience_years,
        experience, projects, education, inferred_roles

    Raises:
        ValueError: unsupported file type or empty file
        RuntimeError: Gemini returned unparseable JSON
    """
    suffix = Path(file_path).suffix.lower()
    if suffix == ".pdf":
        raw_text = await asyncio.to_thread(extract_text_from_pdf, file_path)
    elif suffix in (".txt", ".text"):
        raw_text = extract_text_from_txt(file_path)
    else:
        raise ValueError(f"Unsupported file type: {suffix!r}. Use .pdf or .txt")

    response = await _client.chat.completions.create(
        model=LLM_MODEL,
        messages=[{"role": "user", "content": _PARSE_PROMPT.format(text=raw_text)}],
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
    import sys

    path = sys.argv[1] if len(sys.argv) > 1 else "sample_data/sample_resume.txt"
    result = asyncio.run(parse_resume(path))
    print(json.dumps(result, indent=2))
