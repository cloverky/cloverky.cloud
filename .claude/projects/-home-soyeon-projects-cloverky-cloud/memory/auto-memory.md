---
name: auto-memory
description: "How Claude Code auto memory works and where this repo's memory actually lives — only the ~/.claude copy loads; the in-repo copy is an inert mirror"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 81be4e31-c1f9-4848-902a-e4bf9532c1cb
  modified: 2026-07-29T02:53:46.821Z
---

## 이 리포에서 실제로 로드되는 경로

git 저장소 루트(`git rev-parse --show-toplevel`) = `/home/soyeon/projects/cloverky.cloud`
→ 슬러그 `-home-soyeon-projects-cloverky-cloud`

```
/home/soyeon/.claude/projects/-home-soyeon-projects-cloverky-cloud/memory/   ← 이것만 로드됨
```

`cloverky.cloud/.claude/projects/…` 아래에도 **같은 내용의 사본**이 있으나, 이는 사용자가
리포에 두려고 만든 미러일 뿐 세션 시작 시 로드되지 않는다. **메모리를 갱신하면 홈 쪽이
정본이고, 미러는 수동으로 맞춰야 한다.**

## 동작 규칙

| 항목 | 내용 |
|------|------|
| 자동 로드 | `MEMORY.md`의 **첫 200줄만** 세션 시작 시 시스템 프롬프트에 삽입 |
| 200줄 초과분 | 자동 로드 안 됨 — 필요할 때 직접 읽어야 함 |
| 주제 파일 | `debugging.md`, `patterns.md` 등은 **필요할 때만** 읽힘 (시작 시 전부 로드 X) |
| 200줄 제한 범위 | `MEMORY.md` 전용. `CLAUDE.md`는 길이 무관 전체 로드 |
| 경로 결정 | git 저장소 루트 기준. 하위 디렉터리와 **Git Worktree가 하나의 메모리를 공유** |
| git 밖에서 실행 | 현재 디렉터리 기준으로 경로 결정 |
| 범위 | **머신 로컬.** 다른 PC·클라우드 환경과 공유되지 않음 |
| 기본 상태 | 활성화. 이 리포의 `settings.json`·`settings.local.json`에 관련 설정 없음(= 기본값) |

비활성화: `export CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` 또는 settings.json에
`"autoMemoryEnabled": false`. 서브에이전트도 커스텀 설정에서 켜면 독립적인 메모리를 쌓는다.

## 기록 대상

프로젝트 패턴(빌드·테스트 컨벤션, 코드 스타일) · 디버깅 인사이트(까다로운 문제의 해결책,
흔한 에러 원인) · 아키텍처 메모(핵심 파일, 모듈 관계) · 사용자 선호도(소통 스타일, 워크플로우).

**Why:** `CLAUDE.md`가 사람이 쓰는 지시사항이라면 자동 메모리는 에이전트가 스스로 남기는
메모다. 둘을 섞으면 리포 문서가 오염되고, 반대로 메모리에 리포가 이미 기록하는 내용을
중복 저장하면 낡은 정보가 컨텍스트를 차지한다.

**How to apply:** `MEMORY.md`는 한 줄 인덱스만 유지하고 본문은 주제 파일에 둔다(200줄 예산
보호). 코드 구조·과거 수정 이력·`CLAUDE.md`가 이미 담은 내용은 저장하지 않는다. 메모리를
갱신했으면 리포 미러도 함께 맞출지 사용자에게 확인한다.
관련: [[patterns]], [[debugging]]
