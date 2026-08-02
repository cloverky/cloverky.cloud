---
name: debugging
description: "Root CLAUDE.md's harness section commands scripts/validate-harness.py and pre-commit reference files that do not exist — they will fail"
metadata: 
  node_type: memory
  type: project
  originSessionId: 81be4e31-c1f9-4848-902a-e4bf9532c1cb
  modified: 2026-07-29T02:41:14.179Z
---

루트 `CLAUDE.md`의 `## 하네스` 절과 `## 스타 토폴로지` 절이 **존재하지 않는 파일**을
실행하라고 지시한다 (2026-07-29 확인).

| CLAUDE.md가 지시하는 것 | 실제 |
|------------------------|------|
| `python scripts/validate-harness.py` | ❌ 없음 — `scripts/`에는 `generate_jwt_keys.sh` 하나뿐 |
| `pre-commit install` / `pre-commit run --all-files` | ❌ `.pre-commit-config.yaml` 없음 |
| `cd clover && python -m importlinter` | ✅ `clover/.importlinter` 존재 — 정상 동작 |

`.markdownlint.yaml`, `.prettierrc`도 미확인 상태다.

**Why:** CLAUDE.md는 지시문이라 에이전트가 그대로 실행하는데, 위 두 명령은 반드시 실패한다.
"린터 에러는 절대 무시하지 않는다"는 지침과 맞물려 존재하지 않는 도구를 고치려다 시간을
낭비하거나, 없는 파일을 임의로 만들어내는 실패 모드로 이어진다.

**How to apply:** 하네스 검증을 요구받으면 `validate-harness.py`/`pre-commit`이 아직
없다는 점을 먼저 알리고, 실제로 동작하는 것(`ruff`, `mypy`, `npm run lint`,
`flutter analyze`, `python -m importlinter`)으로 검증한다. 사용자가 원하면 누락된
스크립트를 새로 작성하는 것이 올바른 해결이며, CLAUDE.md의 해당 줄을 지우는 것은
사용자 승인 없이 하지 않는다.
관련: [[patterns]]
