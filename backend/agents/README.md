# agents/

Agentic layer — three Claude-powered agents that drive the interview lifecycle.

| File | Role |
|------|------|
| `context_agent.py` | Parses resume → builds `CandidateProfile` (inferred roles, skills, focus areas) |
| `orchestrator.py` | Central decision-maker — generates questions, adapts difficulty in real time |
| `feedback_agent.py` | Produces structured post-session coaching report (technical gaps, communication tips) |

Agents call into `modules/` for heavy lifting and use the Claude API for reasoning steps.
