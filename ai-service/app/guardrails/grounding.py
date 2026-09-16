"""Guardrail: every number in the model's output must be traceable to the
aggregate payload that was supplied.

This is a deliberately simple cross-check suitable for a portfolio project:
extract all numeric tokens from the response text, then reject the response if
any of them never appears in the input payload. Percentages are compared with
rounding tolerance (the payload rounds to integers; the model may restate
e.g. "12.5" for a payload value of 12.5, but must not invent 37).

Ignored (not treated as data):
- structural counts like "1-3" or list positions in the prompt boilerplate
- ordinals/dates inside words (e.g. "Q1") are still checked by their numeric part
"""

from __future__ import annotations

import json
import math
import re
from typing import Any, Iterable

# 12, 12.5, 1,000 — but not "2.4.3"-style versions or hex/ids.
_NUMBER_RE = re.compile(r"(?<![A-Za-z0-9#])\d{1,3}(?:,\d{3})+(?:\.\d+)?|(?<![A-Za-z0-9#.])\d+(?:\.\d+)?")


def _extract_numbers(node: Any, found: list[float]) -> None:
    """Collect every numeric leaf value in the payload."""
    if isinstance(node, bool):
        return
    if isinstance(node, (int, float)):
        found.append(float(node))
    elif isinstance(node, str):
        for match in _NUMBER_RE.finditer(node):
            found.append(float(match.group(0).replace(",", "")))
    elif isinstance(node, dict):
        for value in node.values():
            _extract_numbers(value, found)
    elif isinstance(node, (list, tuple)):
        for item in node:
            _extract_numbers(item, found)


def payload_numbers(payload: dict[str, Any]) -> set[int]:
    """Integer keys of all numbers in the payload, at rounding precision."""
    values: list[float] = []
    _extract_numbers(payload, values)
    return {int(round(v)) for v in values}


def _response_numbers(response: dict[str, Any]) -> list[float]:
    values: list[float] = []
    _extract_numbers(response, values)
    return values


def _close(value: float, allowed: Iterable[float], tolerance: int = 1) -> bool:
    return any(abs(value - a) <= tolerance for a in allowed)


def check_groundedness(aggregate: dict[str, Any], response: dict[str, Any]) -> tuple[bool, list[float]]:
    """Return (is_grounded, fabricated_numbers).

    A response is grounded when every number it contains matches some number in
    the aggregate payload within rounding tolerance (±1 to absorb rounding).
    """
    allowed = payload_numbers(aggregate)
    fabricated: list[float] = []

    for value in _response_numbers(response):
        if not _close(value, allowed):
            fabricated.append(value)

    return (len(fabricated) == 0, fabricated)


def format_payload(payload: dict[str, Any]) -> str:
    return json.dumps(payload, indent=2, default=str)
