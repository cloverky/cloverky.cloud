---
omd: "0.1"
brand: FridgeAI
bootstrapped_from: kurly
bootstrapped_at: "2026-08-04"
mode: inspired
scope: lucky (Next.js frontend of cloverky.cloud)
tokens:
  source: local-codebase
  extracted: "2026-08-04"
  note: >
    All visual tokens below are read directly from lucky/app/globals.css and
    lucky/components.json — nothing is inherited from the kurly reference.
    kurly is used only for this document's section skeleton, evidence-citation
    style, and food/grocery-commerce domain grounding. Do not replace these
    values with kurly's captured tokens (#5f0080 purple, Pretendard, 0-4px
    radius) on a future re-sync.
  colors:
    background: "oklch(0.99 0 0)"
    foreground: "oklch(0.13 0 0)"
    card: "oklch(1 0 0)"
    primary: "oklch(0.13 0 0)"
    primary-foreground: "oklch(0.99 0 0)"
    secondary: "oklch(0.96 0 0)"
    muted: "oklch(0.96 0 0)"
    muted-foreground: "oklch(0.45 0 0)"
    accent: "oklch(0.52 0.14 155)"
    accent-foreground: "oklch(0.99 0 0)"
    brand-text: "oklch(0.42 0.1 155)"
    brand-text-soft: "oklch(0.55 0.07 155)"
    destructive: "oklch(0.577 0.245 27.325)"
    border: "oklch(0.9 0 0)"
    ring: "oklch(0.52 0.14 155)"
  typography:
    family: { sans: "Noto Sans KR", display: "Jua", mono: "ui-monospace" }
  radius: { base: "0.625rem", sm: "calc(base - 4px)", md: "calc(base - 2px)", lg: "base", xl: "calc(base + 4px)" }
  components_harvested: true
---

# Design System Harness of FridgeAI (structure inspired by Kurly / 마켓컬리)

## 1. Visual Theme & Atmosphere

FridgeAI is the web frontend (`lucky/`) of an AI-based grocery/food-inventory service under the `cloverky.cloud` product — it recognizes what's in a user's fridge, tracks expiry, and recommends recipes from what's about to expire (`../CLAUDE.md` §프로젝트 정체성). This document does not introduce a new visual identity: it codifies the design system already implemented in `app/globals.css` and `components.json` (shadcn/ui, "new-york" style, `baseColor: neutral`, Tailwind CSS v4) so that future UI work stays consistent with what is already shipped, rather than accumulating one-off styling.

Kurly (마켓컬리) is used here structurally only — its DESIGN.md is itself evidence-strict (live-captured tokens, no invented states), and that discipline is the part being borrowed: cite the actual source (file + line), don't presume an unobserved value. Kurly is also the closest cataloged domain match (fresh-grocery commerce), which is why its Do's/Don'ts framing and food-domain agent-prompt phrasing transfer more directly than a generic SaaS reference would.

**Key characteristics (as implemented today):**

- A near-neutral base (`background`/`foreground`/`card` all near-white/near-black, `oklch(... 0 0)` — zero chroma) with a single green-hued accent (`--accent: oklch(0.52 0.14 155)`) reserved for brand emphasis, active states, and the AI-assistant surfaces — not for every interactive element. `--primary` is achromatic (near-black in light mode, near-white in dark), used for default buttons/links; accent is a distinct, narrower-use token (`app/globals.css:24,30`).
- Two type families with different jobs: `--font-sans` (Noto Sans KR) for body/UI text, `--font-display` (Jua — a rounded, bold, friendly Korean display face) for headings/hero — this pairing is what gives the product its approachable, non-corporate voice compared to a commerce reference like Kurly's single-family Pretendard system (`app/globals.css:92-93`).
- A consistently rounded system (`--radius: 0.625rem`, scaled to `sm/md/lg/xl`), used everywhere via shadcn's `rounded-md`/`rounded-xl` utility classes (`components/ui/button.tsx:8`, `components/ui/card.tsx:10`). This is the opposite of Kurly's flat, 0-4px commerce surfaces — intentionally kept as-is (§7).
- Full light/dark parity — every token in `:root` has a `.dark` counterpart (`app/globals.css:54-89`), toggled via `next-themes` (`lucky/CLAUDE.md`).

## 2. Color Palette & Roles

### Implemented tokens (light / dark — `app/globals.css`)

| Role | Light | Dark | Use |
|------|-------|------|-----|
| `background` / `foreground` | `oklch(0.99 0 0)` / `oklch(0.13 0 0)` | `oklch(0.09 0 0)` / `oklch(0.98 0 0)` | Page canvas / body text |
| `card` | `oklch(1 0 0)` | `oklch(0.12 0 0)` | Card surfaces (`components/ui/card.tsx`) |
| `primary` | `oklch(0.13 0 0)` | `oklch(0.98 0 0)` | Default button/link — achromatic, not the brand green |
| `secondary` / `muted` | `oklch(0.96 0 0)` | `oklch(0.18 0 0)` | Low-emphasis fills, muted text |
| `accent` | `oklch(0.52 0.14 155)` | `oklch(0.72 0.12 155)` | Brand green — CTAs, active nav, focus ring, AI-assistant chrome |
| `brand-text` / `brand-text-soft` | `oklch(0.42 0.1 155)` / `oklch(0.55 0.07 155)` | `oklch(0.78 0.09 155)` / `oklch(0.62 0.07 155)` | Green-tinted text where accent-as-background would be too heavy |
| `destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.396 0.141 25.723)` | Delete actions, error/expired states |
| `border` / `input` | `oklch(0.9 0 0)` / `oklch(0.94 0 0)` | `oklch(0.25 0 0)` / `oklch(0.18 0 0)` | Hairlines, form fields |
| `chart-1..5` | hues 155/175/140/84/70 | same hues, adjusted L/C | Consumption-pattern charts (`recharts`) |

`--brand-hue: 155` is the single source of truth — every green-family token derives from it (`app/globals.css:16`). Changing the brand color means changing this one variable, not hunting through components.

### Boundary (kept from the Kurly evidence discipline)

Do not add a second accent hue "for variety." Do not use `accent` as a full-page background — the codebase reserves it for emphasis (buttons, active states, rings), consistent with how `--accent` is scoped in `buttonVariants` (`components/ui/button.tsx:12-20`: only `outline`/`ghost` hover states touch `bg-accent`).

## 3. Typography Rules

### Implemented family stack (`app/globals.css:92-94`)

- `--font-sans`: `var(--font-noto-sans-kr), 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif` — body/UI default.
- `--font-display`: `var(--font-jua), 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif` — headings, hero, marketing surfaces. Jua is a single-weight, rounded, high-contrast-to-body Korean display face; it is what reads as "friendly AI product" rather than "enterprise dashboard."
- `--font-mono`: system monospace stack — code/CSV previews only (Titanic feature).

Both fonts are loaded as Next.js `next/font` variables (referenced as `var(--font-noto-sans-kr)` / `var(--font-jua)`); do not substitute a system font or a third family without updating both `app/layout.tsx`'s font loader and this table.

### Observed hierarchy

No formal type-scale file exists yet (unlike Kurly's captured px/weight/line-height table) — sizing is currently ad hoc via Tailwind utility classes per component (e.g. `text-3xl font-bold md:text-4xl` for page H1 in `components/inventory-feature-page.tsx:411`). **This is a gap, not a decision** — [FILL IN: a formal type scale should be extracted from actual usage if/when this becomes a recurring inconsistency].

## 4. Component Stylings

Components are shadcn/ui "new-york" style, generated into `components/ui/` and used as-is (`lucky/CLAUDE.md`: "shadcn/ui 컴포넌트를 우선 사용한다. 없을 때만 직접 작성한다."). The following are the actual implemented states, cited from source — not inferred.

### Button (`components/ui/button.tsx`)

- Default: `bg-primary text-primary-foreground`; hover: `hover:bg-primary/90`
- Outline: `border bg-background shadow-xs`; hover: `hover:bg-accent hover:text-accent-foreground`
- Destructive: `bg-destructive text-white`; hover: `hover:bg-destructive/90`
- Focus: `focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]`
- Disabled: `disabled:pointer-events-none disabled:opacity-50`
- Invalid: `aria-invalid:ring-destructive/20 aria-invalid:border-destructive`
- Radius: `rounded-md` (all sizes)

### Card (`components/ui/card.tsx:10`)

- `bg-card text-card-foreground rounded-xl border py-6 shadow-sm` — the largest radius step (`--radius-xl`) and the only default-visible `shadow` token besides `shadow-xs` on outline buttons.

### Badge / status pill (`components/ui/badge.tsx`, applied via `statusBadgeClass` in `components/inventory-feature-page.tsx:68-76`)

Project-specific semantic states, not a shadcn default:

- 임박/긴급 (expiring soon / urgent): `border-destructive/40 bg-destructive/10 text-destructive`
- 부족 (low stock): `border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400`
- default/ok: `border-accent/30 bg-accent/10 text-accent`

This is the project's real "inventory status" state system — reuse these three classes for any new expiry/stock-adjacent badge rather than inventing a fourth color.

## 5. Layout Principles

- Feature pages follow the pattern in `components/inventory-feature-page.tsx`: `max-w-5xl` centered container, `px-6 pt-28 pb-16` (room for the fixed header), decorative blurred accent orb (`bg-accent/15 blur-[100px]`) top-right.
- `scroll-padding-top: 5.5rem` is set globally for anchor links under the fixed header (`app/globals.css:143`).
- `scrollbar-gutter: stable` and the `[data-scroll-locked]` padding override exist specifically to stop horizontal layout shift when Radix dialogs open/close (`app/globals.css:141,149-154`) — don't remove these when touching `globals.css`.
- No documented grid/breakpoint system beyond Tailwind defaults + ad hoc `sm:`/`md:`/`lg:` per component. [FILL IN: formalize if a grid inconsistency actually shows up].

## 6. Depth & Elevation

Two elevation steps only, both light-touch: `shadow-xs` (outline button) and `shadow-sm` (card). No modal/dropdown-specific elevation scale is separately documented — Radix + shadcn defaults apply (`components/ui/dialog.tsx`, `dropdown-menu.tsx`) and haven't been overridden.

## 7. Do's and Don'ts

### Do

- Style exclusively with **Tailwind CSS utility classes + shadcn/ui components** (`components/ui/`). This is the single styling system for `lucky/` going forward.
- Reuse an existing `components/ui/*` component before writing a new one; only hand-write markup when shadcn has no matching primitive (`lucky/CLAUDE.md`).
- Derive any new green-family token from `--brand-hue: 155`, not a hardcoded hex/oklch literal.
- Reuse the three status-badge classes from §4 for any expiry/stock-related state.
- Keep light/dark parity — every new CSS variable needs both a `:root` and a `.dark` value (`app/globals.css` pattern).

### Don't

- Don't introduce inline `style={{...}}` for anything Tailwind already expresses, a second CSS-in-JS library, or a plain `.css`/`.module.css` file for component styling — `app/globals.css` is the only hand-written stylesheet, and it exists for tokens/base layer/global fixes, not component styling.
- Don't adopt Kurly's captured tokens (`#5f0080`, Pretendard, 0-4px radius) — they are this document's structural reference, not this product's palette.
- Don't flatten the existing `--radius: 0.625rem` rounded system to look more like a commerce reference; the 40+ already-built `components/ui/*` files assume it.
- Don't touch `components/ui/` beyond what shadcn regenerates — it's generated code (`lucky/CLAUDE.md` §자주 하는 실수).

## 8. Responsive Behavior

No formal breakpoint spec exists beyond Tailwind's defaults (`sm`/`md`/`lg`) applied ad hoc per component, mirroring Kurly's own "desktop capture only, responsive rules unspecified" boundary — this is an honest gap here too, not a hidden system. [FILL IN: document real breakpoint decisions if/when a page needs one formalized].

## 9. Agent Prompt Guide

- "Use `components/ui/card.tsx`'s existing classes (`bg-card rounded-xl border py-6 shadow-sm`) for any new content card — don't restate the values as a literal className string from scratch."
- "For a new status indicator (expiring/low-stock/ok), reuse `statusBadgeClass` from `components/inventory-feature-page.tsx` rather than picking a new color."
- "Any new component ships with Tailwind + shadcn/ui only. If shadcn has no matching primitive, ask before hand-rolling one from raw CSS."
- "New CSS variables go in `app/globals.css` under both `:root` and `.dark`, following the existing oklch-based token pattern — not as one-off Tailwind arbitrary values (`bg-[#123456]`)."

## 10. Voice & Tone

FridgeAI's own copy (`lib/feature-pages.ts`, `app/layout.tsx`) is practical and benefit-first, addressed directly to the user in polite-imperative Korean (`-세요`), without exclamation-driven hype:

| Context | Actual shipped copy | Direction |
|---------|---------------------|-----------|
| Page title/meta | `FridgeAI - AI 냉장고 관리·맞춤 레시피` | Function before flourish — lead with what it does |
| Feature subtitle | `냉장고 안 식재료를 한눈에 파악하세요.` | Second-person, one concrete outcome per sentence |
| Feature subtitle | `지금 있는 재료로 무엇을 만들지 AI가 골라줍니다.` | State the mechanism (AI가 고른다), not a vague promise |
| Feature subtitle | `유통기한·재고 부족을 미리 알려 음식물 낭비를 줄입니다.` | Cause → effect, ends on the real-world benefit (food waste), not the feature |
| Empty state | `등록된 식재료가 없습니다. 위에서 추가해 보세요.` (`components/inventory-feature-page.tsx:793-795`) | Plain statement of fact + one next action, no apology-filler |

This is close to Kurly's own "practical, discriminating, responsible" register (§10 of the kurly reference), which is part of why kurly's structure transfers cleanly — but FridgeAI's copy is warmer and more second-person-direct than Kurly's corporate/service-principle framing, matching the friendlier Jua display face (§3).

## 11. Brand Narrative

FridgeAI is the AI-based grocery/food-inventory product of `cloverky.cloud`: it recognizes and remembers what's in a user's fridge, prioritizes ingredients closest to expiry to reduce food waste, and recommends recipes built from what should be used soonest (`../CLAUDE.md` §프로젝트 정체성; `app/layout.tsx` meta description: "AI가 재고를 챙기고 취향에 맞는 레시피를 추천하는 냉장고 관리 서비스"). The four shipped feature pillars are 실시간 재고 관리, 맞춤형 레시피 추천, 스마트 알림, 소비 패턴 분석 (`lib/feature-pages.ts`).

[FILL IN: exact founding date — not present in the codebase or provided; do not infer one from the © 2026 footer copyright year alone.]

## 12. Principles

1. **Expiry-first triage.** The product's stated purpose is surfacing what's about to expire before anything else (`../CLAUDE.md` §프로젝트 정체성). *UI implication:* an expiring-soon item is never visually equal-weight to a fresh one — this is why §4's destructive-tinted badge exists as a distinct class, not a generic "warning" gray.
2. **Mechanism over hype.** Copy states what the AI actually does (recognizes, prioritizes, recommends) rather than abstract promises (§10). *UI implication:* microcopy names the mechanism ("AI가 골라줍니다") instead of a vague benefit claim.
3. **One system, no exceptions.** Tailwind CSS + shadcn/ui is the only styling path (§7) — this was an explicit ask for this harness, not inherited from Kurly. *UI implication:* a PR introducing inline styles or a second styling library is a regression to flag, not a style preference to accept.

## 13. Personas

No officially declared personas exist in the codebase or product docs — the following are inferred from the shipped feature set (재고 관리, 유통기한 알림, 소비 패턴 리포트) and are explicitly a working assumption, not a sourced fact (mirroring Kurly's own refusal to fabricate personas in §13 of the reference):

- 자취생 / 1인 가구 — small, frequently-changing inventory; expiry alerts matter most.
- 맞벌이/육아 가정 — recipe recommendations from what's on hand save planning time.
- 식비·음식물 낭비에 관심 있는 사용자 — consumption-pattern reports (§12.1) are the primary draw.

[FILL IN: replace with real user research if/when it exists — these three are a placeholder derived from feature copy, not validated personas.]

## 14. States

| Component | Default | Hover | Focus | Disabled | Invalid | Source |
|-----------|---------|-------|-------|----------|---------|--------|
| Button (default) | `bg-primary text-primary-foreground` | `hover:bg-primary/90` | `focus-visible:ring-ring/50 ring-[3px]` | `opacity-50 pointer-events-none` | `aria-invalid:ring-destructive/20 border-destructive` | `components/ui/button.tsx:8-21` |
| Badge (status) | see §4 three classes | — (static indicator, not interactive) | — | — | — | `components/inventory-feature-page.tsx:68-76` |
| Card | `shadow-sm border` | — (cards are not interactive by default) | — | — | — | `components/ui/card.tsx:10` |

Empty/loading/success/skeleton states are handled ad hoc per page today (e.g. `Loader2` spinner + `sonner` toast pattern in `components/inventory-feature-page.tsx:432-435,788-791`) rather than as a documented system. [FILL IN: formalize if a second feature page reimplements this differently].

## 15. Motion & Easing

No documented duration/easing tokens exist. Observed usage is limited to Tailwind's default `animate-spin` (loading spinners) and `transition-colors` (button/badge hover) — both framework defaults, not custom-tuned values. [FILL IN: only add specific duration/easing tokens if a real interaction actually needs one; don't invent a motion system preemptively].
