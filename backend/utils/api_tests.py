"""api_tests.py — smoke-test every external API integration.

Run with:
    python -m backend.utils.api_tests
"""

from __future__ import annotations

import tempfile
import os
import sys


def _ok(name: str) -> None:
    print(f"  [PASS] {name}")


def _fail(name: str, err: Exception) -> None:
    print(f"  [FAIL] {name}: {err}")


# ── 1. Google Gemini ──────────────────────────────────────────────────────────

def test_gemini() -> bool:
    try:
        from google import genai
        from backend.config import settings

        client = genai.Client(api_key=settings.gemini_api_key)
        resp = client.models.generate_content(
            model=GEMINI_MODEL, contents="Reply with exactly: pong"
        )
        assert resp.text.strip(), "Empty response from Gemini"
        _ok(f"Gemini gemini-2.0-flash → {resp.text.strip()!r}")
        return True
    except Exception as exc:
        _fail("Gemini", exc)
        return False


# ── 2. Groq ───────────────────────────────────────────────────────────────────

def test_groq() -> bool:
    try:
        from groq import Groq
        from backend.config import settings

        client = Groq(api_key=settings.groq_api_key)
        chat = client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[{"role": "user", "content": "Reply with exactly: pong"}],
            max_tokens=10,
        )
        reply = chat.choices[0].message.content.strip()
        assert reply, "Empty response from Groq"
        _ok(f"Groq llama3-8b-8192 → {reply!r}")
        return True
    except Exception as exc:
        _fail("Groq", exc)
        return False


# ── 3. JSearch / RapidAPI ─────────────────────────────────────────────────────

def test_jsearch() -> bool:
    try:
        import httpx
        from backend.config import settings

        resp = httpx.get(
            "https://jsearch.p.rapidapi.com/search",
            headers={
                "X-RapidAPI-Key": settings.rapidapi_key,
                "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
            },
            params={"query": "software engineer", "page": "1", "num_pages": "1"},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json().get("data", [])
        _ok(f"JSearch → {len(data)} listings returned")
        return True
    except Exception as exc:
        _fail("JSearch (RapidAPI)", exc)
        return False


# ── 4. pdfplumber ─────────────────────────────────────────────────────────────

def test_pdfplumber() -> bool:
    try:
        import pdfplumber
        from backend.modules.resume_parser import extract_text_from_pdf

        # Use the bundled sample resume if it's a PDF; otherwise write a minimal one
        sample_pdf = os.path.join(
            os.path.dirname(__file__), "..", "..", "sample_data", "sample_resume.pdf"
        )
        if not os.path.exists(sample_pdf):
            # Create a minimal 1-page PDF in a temp file using reportlab if available,
            # otherwise just verify pdfplumber imports correctly.
            try:
                from reportlab.pdfgen import canvas

                with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
                    sample_pdf = f.name
                c = canvas.Canvas(sample_pdf)
                c.drawString(72, 720, "Test resume: Python, FastAPI, Machine Learning")
                c.save()
                text = extract_text_from_pdf(sample_pdf)
                os.unlink(sample_pdf)
                assert "Python" in text or text.strip(), "pdfplumber returned empty text"
                _ok(f"pdfplumber (reportlab PDF) → {len(text)} chars extracted")
            except ImportError:
                # reportlab not installed — just verify import
                _ok("pdfplumber → import OK (no sample PDF; install reportlab to run full test)")
        else:
            text = extract_text_from_pdf(sample_pdf)
            _ok(f"pdfplumber (sample resume) → {len(text)} chars extracted")
        return True
    except Exception as exc:
        _fail("pdfplumber", exc)
        return False


# ── Runner ────────────────────────────────────────────────────────────────────

def run_all() -> None:
    print("\nNexInterview — API connection tests\n" + "=" * 40)
    results = {
        "Gemini":     test_gemini(),
        "Groq":       test_groq(),
        "JSearch":    test_jsearch(),
        "pdfplumber": test_pdfplumber(),
    }
    print()
    passed = sum(results.values())
    total = len(results)
    print(f"Results: {passed}/{total} passed")
    if passed < total:
        failed = [k for k, v in results.items() if not v]
        print(f"Failed:  {', '.join(failed)}")
        print("Check that all keys in .env are filled in correctly.\n")
        sys.exit(1)
    else:
        print("All API integrations are working.\n")


if __name__ == "__main__":
    run_all()
