from __future__ import annotations

from datetime import date, timedelta

# 식품별 보관 방법에 따른 유통기한 기본값 (일)
SHELF_LIFE_TABLE: dict[str, dict[str, int]] = {
    "우유": {"냉장": 7, "냉동": 30, "실온": 1},
    "계란": {"냉장": 21, "냉동": 60, "실온": 7},
    "두부": {"냉장": 5, "냉동": 30, "실온": 1},
    "돼지고기": {"냉장": 3, "냉동": 90, "실온": 0},
    "소고기": {"냉장": 3, "냉동": 90, "실온": 0},
    "닭고기": {"냉장": 2, "냉동": 60, "실온": 0},
    "생선": {"냉장": 2, "냉동": 60, "실온": 0},
    "양파": {"냉장": 30, "냉동": 90, "실온": 30},
    "당근": {"냉장": 14, "냉동": 60, "실온": 7},
    "감자": {"냉장": 30, "냉동": 90, "실온": 14},
    "대파": {"냉장": 7, "냉동": 30, "실온": 2},
    "시금치": {"냉장": 5, "냉동": 30, "실온": 1},
    "배추": {"냉장": 14, "냉동": 60, "실온": 3},
    "상추": {"냉장": 5, "냉동": 14, "실온": 1},
    "토마토": {"냉장": 7, "냉동": 30, "실온": 3},
    "오이": {"냉장": 7, "냉동": 30, "실온": 2},
    "버섯": {"냉장": 5, "냉동": 30, "실온": 1},
    "두유": {"냉장": 7, "냉동": 30, "실온": 1},
    "요구르트": {"냉장": 14, "냉동": 30, "실온": 0},
    "치즈": {"냉장": 30, "냉동": 90, "실온": 0},
    "버터": {"냉장": 30, "냉동": 90, "실온": 1},
    "된장": {"냉장": 180, "냉동": 365, "실온": 90},
    "간장": {"냉장": 365, "냉동": 365, "실온": 180},
    "고추장": {"냉장": 180, "냉동": 365, "실온": 90},
    "밥": {"냉장": 3, "냉동": 30, "실온": 1},
}
DEFAULT_SHELF_LIFE: dict[str, int] = {"냉장": 7, "냉동": 30, "실온": 3}


def shelf_life_days(name: str, storage: str) -> int:
    for key, val in SHELF_LIFE_TABLE.items():
        if key in name:
            return val.get(storage, DEFAULT_SHELF_LIFE.get(storage, 7))
    return DEFAULT_SHELF_LIFE.get(storage, 7)


def compute_status(expiry_date: date | None) -> str:
    if expiry_date is None:
        return "ok"
    today = date.today()
    if expiry_date < today:
        return "expired"
    if expiry_date <= today + timedelta(days=3):
        return "expiring_soon"
    return "ok"
