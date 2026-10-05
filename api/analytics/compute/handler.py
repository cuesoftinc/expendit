"""compute.requested -> compute.results (system-design.md §6.4, §6.5).

Results echo the request's data_version; api/common drops any result older
than the org's current version, so recomputation races are harmless.
"""

import logging

from compute.derive.statement import validate
from compute.ratios.engine import compute_report
from compute.summary import dashboard
from compute.tax.engine import estimate
from compute.tax.rulesets import RulesetBook, RulesetUnavailable
from extract.ai.enhancer import AIEnhancer

log = logging.getLogger(__name__)


class ComputeHandler:
    def __init__(self, rulesets: RulesetBook, ai: AIEnhancer | None):
        self.rulesets = rulesets
        self._ai = ai

    async def run(self, msg: dict) -> dict:
        result = {
            "request_id": msg["request_id"],
            "org_id": msg["org_id"],
            "kind": msg["kind"],
            "data_version": msg["data_version"],
        }
        inputs = msg["inputs"]
        try:
            match msg["kind"]:
                case "statement_validation":
                    body = {"validation": validate(inputs["kind"], inputs["line_items"], inputs["mapping_version"])}
                case "ratios":
                    body = {"ratios": compute_report(inputs)}
                case "tax_estimate":
                    body = {"estimates": estimate(inputs, self.rulesets)}
                case "filing":
                    body = {"estimates": estimate(inputs, self.rulesets, for_filing=True)}
                case "dashboard_summary":
                    ai = self._ai if msg.get("ai_allowed") else None
                    if ai is None:
                        return result | {"status": "failed", "error_code": "ai_unavailable"}
                    body = {"summary": await dashboard.generate(ai, inputs)}
        except RulesetUnavailable:
            return result | {"status": "failed", "error_code": "ruleset_unavailable"}
        except PermissionError as exc:
            return result | {"status": "failed", "error_code": str(exc)}
        except (KeyError, ValueError, TypeError):
            log.exception("compute failed", extra={"request_id": msg["request_id"], "kind": msg["kind"]})
            return result | {"status": "failed", "error_code": "processing_error"}
        return result | {"status": "ok"} | body
