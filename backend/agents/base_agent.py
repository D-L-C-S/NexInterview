"""Base Agent — abstract base class for all NexInterview agents.

Each agent follows a think → act → observe loop:
  1. think()  — LLM-powered reasoning about what to do next
  2. act()    — execute the decided action using tools (modules)
  3. observe() — record the outcome in shared SessionMemory
"""
from __future__ import annotations

import json
from abc import ABC, abstractmethod

from backend.config import llm_client as _client, LLM_MODEL
from backend.agents.session_memory import SessionMemory


class BaseAgent(ABC):
    """Abstract base agent with LLM-powered reasoning.

    Subclasses must implement:
        agent_name  — human-readable agent name
        system_prompt — the system prompt that defines this agent's persona
        run()       — the main entry point that orchestrates think → act → observe
    """

    @property
    @abstractmethod
    def agent_name(self) -> str:
        """Human-readable name for this agent (used in logs and memory)."""
        ...

    @property
    @abstractmethod
    def system_prompt(self) -> str:
        """System prompt that defines this agent's persona and capabilities."""
        ...

    async def reason(self, prompt: str, temperature: float = 0.3) -> str:
        """Ask the LLM to reason about a situation and return its thinking.

        This is the core 'think' step of the agent loop. The agent receives
        the full session context plus a specific question, and the LLM
        produces a reasoned response.

        Args:
            prompt:      the user-facing prompt (session context + specific question)
            temperature: LLM temperature (lower = more deterministic)

        Returns the LLM's reasoning as a string.
        """
        response = await _client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": prompt},
            ],
            temperature=temperature,
        )
        return response.choices[0].message.content.strip()

    async def reason_json(self, prompt: str, temperature: float = 0.3) -> dict:
        """Ask the LLM to reason and return structured JSON output.

        Args:
            prompt:      must instruct the LLM to return valid JSON
            temperature: LLM temperature

        Returns the parsed JSON dict.

        Raises:
            RuntimeError: if the LLM returns unparseable JSON
        """
        text = await self.reason(prompt, temperature)
        text = self._strip_fences(text)
        try:
            return json.loads(text)
        except json.JSONDecodeError as exc:
            raise RuntimeError(
                f"[{self.agent_name}] LLM returned invalid JSON: {exc}\n"
                f"Raw (first 300 chars): {text[:300]}"
            ) from exc

    def log(self, memory: SessionMemory, message: str) -> None:
        """Record an observation or decision in shared session memory."""
        memory.orchestrator_notes.append(f"[{self.agent_name}] {message}")

    @staticmethod
    def _strip_fences(text: str) -> str:
        """Remove markdown code fences from LLM output."""
        text = text.strip()
        if text.startswith("```"):
            parts = text.split("```")
            text = parts[1]
            if text.startswith("json"):
                text = text[4:]
        return text.strip()
