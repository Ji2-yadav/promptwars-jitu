"""JSON extraction and Pydantic model validation utilities.

Provides two thin helpers that wrap Python's ``json`` module and Pydantic's
``model_validate`` to give callers a uniform ``ValueError`` on bad input.
"""
import json
import re
from typing import TypeVar

from pydantic import BaseModel, ValidationError

ModelT = TypeVar("ModelT", bound=BaseModel)


def extract_json(text: str) -> dict:
    """Extract and parse the first JSON object found in *text*.

    Handles three common LLM output formats:
    - Raw JSON (the ideal case).
    - Markdown-fenced blocks (triple-backtick json ... triple-backtick).
    - JSON embedded inside surrounding prose.

    Raises:
        json.JSONDecodeError: If no valid JSON object can be found.
    """
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
        cleaned = re.sub(r"```$", "", cleaned).strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise
        return json.loads(cleaned[start : end + 1])


def validate_json(text: str, model: type[ModelT]) -> ModelT:
    """Parse *text* as JSON and validate it against *model*.

    Args:
        text: Raw text (possibly with markdown fencing) containing a JSON object.
        model: The Pydantic model class to validate against.

    Returns:
        A validated model instance.

    Raises:
        ValueError: Wrapping any ``JSONDecodeError`` or ``ValidationError``.
    """
    try:
        data = extract_json(text)
        return model.model_validate(data)
    except (json.JSONDecodeError, ValidationError, TypeError) as exc:
        raise ValueError(str(exc)) from exc
