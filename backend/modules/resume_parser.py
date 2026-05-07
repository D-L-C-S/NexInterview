"""Resume Parser — PDF text extraction + Gemini-powered structured parsing."""

from __future__ import annotations

import json
import pdfplumber
import google.generativeai as genai

from backend.config import settings

genai.configure(api_key=settings.gemini_api_key)
_model = genai.GenerativeModel("gemini-1.5-flash")


def extract_text_from_pdf(file_path: str) -> str:
    """Return all text from a PDF file, page-by-page, stripped of excess whitespace."""
    pages: list[str] = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                pages.append(text.strip())
    return "\n\n".join(pages)


def parse_resume(file_path: str) -> dict:
    """Extract structured fields (name, skills, experience, projects, education) from a resume PDF."""
    raw_text = extract_text_from_pdf(file_path)
    prompt = (
        "Parse the following resume and return a JSON object with keys: "
        "name, email, phone, skills (list), experience (list of {title, company, duration, bullets}), "
        "projects (list of {name, description, tech}), education (list of {degree, institution, year}), "
        "inferred_roles (list of up to 3 job roles this person is suited for).\n\n"
        f"Resume:\n{raw_text}\n\nReturn only valid JSON, no markdown fences."
    )
    response = _model.generate_content(prompt)
    text = response.text.strip()
    # Strip accidental markdown fences
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())
