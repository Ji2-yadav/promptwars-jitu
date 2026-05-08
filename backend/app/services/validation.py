import json
import re
from typing import TypeVar

from pydantic import BaseModel, ValidationError


ModelT = TypeVar("ModelT", bound=BaseModel)


def extract_json(text: str) -> dict:
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
    try:
        data = extract_json(text)
        return model.model_validate(data)
    except (json.JSONDecodeError, ValidationError, TypeError) as exc:
        raise ValueError(str(exc)) from exc
