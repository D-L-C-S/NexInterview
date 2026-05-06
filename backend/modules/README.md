# modules/

Self-contained processing modules — each does one job and exposes a clean interface to the agents.

| File | Responsibility |
|------|---------------|
| `resume_parser.py` | Extracts raw text from PDF/plain-text and heuristically structures fields |
| `role_inferencer.py` | Maps parsed resume signals to likely target job roles |
| `question_generator.py` | Calls Claude API to generate role-appropriate questions at a given difficulty |
| `audio_analyzer.py` | Whisper STT + librosa analysis → confidence score, communication clarity |
| `video_analyzer.py` | MediaPipe + DeepFace → engagement score, stress/nervousness indicators |
| `technical_evaluator.py` | LLM semantic scoring + keyword/intent matching → correctness + knowledge depth |
| `job_recommender.py` | Crawls job boards, scores postings against the candidate profile, returns ranked matches |
