---
name: patterns
description: Coding conventions for this repo live in .claude/rules/*.md with paths frontmatter — read the matching rule file before writing code
metadata: 
  node_type: memory
  type: reference
  originSessionId: 81be4e31-c1f9-4848-902a-e4bf9532c1cb
  modified: 2026-07-29T02:41:04.054Z
---

이 리포의 코딩 컨벤션은 `.claude/rules/` 아래 주제별 `.md` 파일에 있다. 각 파일은
`paths:` 프론트매터로 적용 대상 glob을 선언한다.

| 파일 | 적용 대상 | 상태 |
|------|----------|------|
| `.claude/rules/typescript.md` | `**/*.ts`, `**/*.tsx` | 작성됨 (2026-07-29) |
| `.claude/rules/api-standards.md` | — | **비어 있음 (0바이트)** |
| `.claude/rules/testing.md` | — | **비어 있음 (0바이트)** |
| `.claude/rules/security/` | — | 미확인 |

`typescript.md`는 `lucky/`의 실제 코드에서 역으로 도출한 것이다 — `lucky/tsconfig.json`
(strict, isolatedModules, bundler, `@/*`)과 `lucky/eslint.config.mjs`가 error로 강제하는
규칙(`no-explicit-any`, `no-non-null-assertion`, `consistent-type-imports`, `no-console`)이
근거다. 관찰된 지배적 패턴: `type` 별칭 우선(`interface`는 8개 파일뿐), Props는
`type Props = {}`, 컴포넌트는 `export function`(`React.FC` 0건), API 타입은 `lib/*-api.ts`에
`export type`으로 두고 백엔드 snake_case를 유지.

**Why:** 컨벤션을 매 세션 코드에서 다시 추론하면 느리고 일관성이 깨진다. 이미 문서화된
규칙 파일이 있으므로 그것을 단일 출처로 삼는다.

**How to apply:** `.ts`/`.tsx`를 건드리기 전에 `.claude/rules/typescript.md`를 먼저 읽는다.
빈 규칙 파일(`api-standards.md`, `testing.md`)을 채워달라는 요청을 받으면, 추측하지 말고
`typescript.md`와 같은 방식으로 실제 코드에서 패턴을 관찰해 도출한다.
관련: [[claude-md-structure]], [[debugging]]
