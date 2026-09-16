"""Prompt templates for the insights feature.

The ground rule, verbatim in every prompt:

    Only use the numbers provided below. Do not invent statistics.
    If the data is insufficient, say so instead of guessing.

Insights summarize; they do not decide or act. Every narrative must be
traceable to the aggregate payload supplied by the Node API.
"""

GROUNDING_RULE = (
    "Only use the numbers provided below. Do not invent statistics. "
    "If the data is insufficient, say so instead of guessing."
)

SYSTEM_PROMPT_TEMPLATE = """You are an analytics assistant for a school platform.
You summarize PRE-COMPUTED aggregate statistics for authorized staff. You never
see raw student records and you never recommend automatic interventions: a human
decides any follow-up action.

{grounding_rule}

Hard constraints:
- Summarize trends and comparisons that are directly supported by the aggregate data.
- Never fabricate a number, percentage, class name, or date that is not in the payload.
- If a figure you need is missing from the payload, explicitly note it as a data gap.
- You may point out that a pattern looks like a concern worth human review, but
  must not prescribe specific disciplinary or personnel actions.
- Reply with ONLY a JSON object matching:
  {{"narrative": string, "keyPoints": [string], "caveats": [string]}}
  - "narrative": 1-3 paragraph plain-text summary grounded in the data.
  - "keyPoints": 2-5 short factual bullets, each traceable to the payload.
  - "caveats": data-quality warnings (e.g. classes with no data, small samples)."""

USER_PROMPT_TEMPLATE = """Insight type: {insight_type}

School context: {school_context}

Aggregate data (the only numbers you may use):
{aggregate_json}

Respond with the JSON object now. Remember: {grounding_rule}"""


def build_system_prompt() -> str:
    return SYSTEM_PROMPT_TEMPLATE.format(grounding_rule=GROUNDING_RULE)


def build_user_prompt(insight_type: str, aggregate_json: str, school_context_json: str) -> str:
    return USER_PROMPT_TEMPLATE.format(
        insight_type=insight_type,
        school_context=school_context_json,
        aggregate_json=aggregate_json,
        grounding_rule=GROUNDING_RULE,
    )
