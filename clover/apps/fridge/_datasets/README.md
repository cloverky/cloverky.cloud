# 냉장고 재고 관리 SFT 데이터셋

EXAONE 3.5 7.8B 파인튜닝용 한국어 데이터셋 생성기.
재고 JSON을 컨텍스트로 주고, 그 데이터에 **근거해서만** 답하는 어시스턴트를 학습시킨다.

## 파일

| 파일 | 내용 | 개수 |
|------|------|------|
| `fridge_typeA_inventory.jsonl` | 유통기한/재고 질의·응답 | 300 |
| `fridge_typeB_recipe.jsonl` | 보유 재료 기반 레시피 추천 | 300 |
| `fridge_sft_all.jsonl` | 위 둘을 섞은 통합 학습셋 | 600 |
| `generate_dataset.py` | 생성기 + 자동 검증 | — |
| `foods_db.py` / `recipes_db.py` | 식품 마스터(약 70종) / 레시피(45종) | — |

## 포맷 (ChatML messages)

```json
{"messages": [
  {"role": "system", "content": "너는 냉장고 재고 관리 도우미야. 오늘 날짜는 2026-05-24이다. ...\n재고 데이터:\n[ {...} ]"},
  {"role": "user", "content": "냉동실 재고 알려줘"},
  {"role": "assistant", "content": "냉동실에는 다음 재료가 있습니다.\n- ..."}
]}
```

- system 에 `오늘 날짜` + 재고 JSON 배열을 넣는다. 재고 항목 필드는 실제 DTO와 동일:
  `name, quantity, unit, expiry_date, purchased_date, storage, status`
  (`storage` = 냉장/냉동/실온, `status` = normal/expiring_soon/expired/low_stock — 파생 필드)
- TRL / LLaMA-Factory / axolotl 의 `messages` 포맷을 그대로 사용. EXAONE 토크나이저의
  `apply_chat_template` 가 system/user/assistant 역할을 처리한다.

## 데이터 구성

**유형 A (300)** — 서브타입: urgency 84, specific 60, storage 45, low_stock 42, expired 33, whats_in 36.
부정(해당 없음) 답변 47개(약 16%)로 "지어내지 않고 없다고 답하기"를 학습.

**유형 B (300)** — 모드: general 96, time 42, 임박 42, 아이용 33, 야식/도시락 각 30, 매운 27.
근접 메뉴(재료 부족) 54개(18%)로 "부족한 재료 안내"를 학습. 임박 재료가 있으면 우선 소진하도록 추천.

## 품질 보증 (생성 시 자동 검증)

`python generate_dataset.py` 는 다음을 모두 통과해야 파일을 남긴다:

1. **날짜 산수** — 답변의 "N일 남았습니다 / N일 지났습니다" 가 `expiry_date - 오늘` 과 정확히 일치.
2. **status 정합성** — 재고의 status 필드가 (days_left, quantity) 로부터 재계산한 값과 일치.
3. **그라운딩** — 추천 문장·[재료] 목록에 등장하는 식품명은 모두 재고에 존재(기본 양념 제외).
   조리 단계에 이름이 명시된 부재료는 재고에 강제로 포함시켜 산문 단계도 근거를 유지.

## 재생성 / 규모 조절

```bash
python generate_dataset.py
```

- 개수는 `build_typeA` / `build_typeB` 의 plan/모드 가중치에서 조절.
- `SEED` 로 재현 가능. 시드를 바꾸면 다른 분포로 다시 뽑힌다.
- 실서비스 연동 시 `InventoryItemDto` → 위 재고 JSON 형태로 직렬화하면 학습 분포와 동일해진다.
