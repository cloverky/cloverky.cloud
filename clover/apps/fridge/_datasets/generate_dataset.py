"""냉장고 재고 관리 SFT 데이터셋 생성기 (EXAONE 3.5 파인튜닝용).

유형 A: 유통기한/재고 질의 300개
유형 B: 보유 재료 기반 레시피 추천 300개

핵심 보장:
  - system 메시지에 재고 JSON을 넣고, assistant 답변은 그 데이터에서만 파생 (환각 방지)
  - expiry_date - 오늘 = 답변의 'N일 남았습니다' 가 항상 일치 (생성 시 계산 → 생성 후 재검증)

사용법:  python generate_dataset.py
출력:    fridge_typeA_inventory.jsonl / fridge_typeB_recipe.jsonl / fridge_sft_all.jsonl
"""
from __future__ import annotations

import json
import os
import random
import re
import sys
from datetime import date, timedelta

from foods_db import FOODS, GRAM_FOODS, KG_FOODS
from recipes_db import RECIPES, amt

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

SEED = 20260714
random.seed(SEED)

HERE = os.path.dirname(os.path.abspath(__file__))
ALL_FOODS = list(FOODS.keys())

SYSTEM_TMPL = (
    "너는 냉장고 재고 관리 도우미야. 오늘 날짜는 {today}이다. "
    "아래는 사용자의 현재 냉장고 재고 데이터이다. 반드시 이 데이터에 근거해서만 답변하라.\n\n"
    "재고 데이터:\n{inv}"
)

STORAGE_LABEL = {"냉장": "냉장실", "냉동": "냉동실", "실온": "실온 보관"}


# --------------------------------------------------------------------------- #
# 한국어 조사 처리
# --------------------------------------------------------------------------- #
def _has_batchim(word: str) -> bool:
    for ch in reversed(word):
        if "가" <= ch <= "힣":
            return (ord(ch) - 0xAC00) % 28 != 0
        if ch.isdigit():
            return ch in "1367890"  # 일·삼·육·칠·팔·영 등 받침 있음
        if ch.isalpha():
            return False
    return False


def _josa(word, has, no):
    return word + (has if _has_batchim(word) else no)


def eun(w):  # 은/는
    return _josa(w, "은", "는")


def iga(w):  # 이/가
    return _josa(w, "이", "가")


def eul(w):  # 을/를
    return _josa(w, "을", "를")


def wagwa(w):  # 과/와
    return _josa(w, "과", "와")


def euro(w):  # 으로/로 (ㄹ받침은 '로')
    for ch in reversed(w):
        if "가" <= ch <= "힣":
            b = (ord(ch) - 0xAC00) % 28
            return w + ("로" if b in (0, 8) else "으로")
        if ch.isalnum():
            return w + "로"
    return w + "로"


def join_and(items):
    if len(items) == 1:
        return items[0]
    if len(items) == 2:
        return wagwa(items[0]) + " " + items[1]
    return wagwa(items[0]) + " " + items[1] + " 등"


# --------------------------------------------------------------------------- #
# 재고 아이템 생성
# --------------------------------------------------------------------------- #
def rand_today():
    start = date(2026, 2, 1)
    return start + timedelta(days=random.randint(0, 300))  # 2026-02-01 ~ 2026-11-27


def pick_storage(food, avoid=None, only=None):
    storages = list(FOODS[food][2].keys())
    if only and only in storages:
        return only
    if avoid:
        storages = [s for s in storages if s != avoid] or list(FOODS[food][2].keys())
    # 냉장을 우선 가중
    weights = [3 if s == "냉장" else 2 for s in storages]
    return random.choices(storages, weights=weights)[0]


def make_quantity(food, low=False):
    min_q = FOODS[food][3]
    if food in KG_FOODS:
        return 1 if low else random.choice([2, 4, 5, 10])
    if food in GRAM_FOODS:
        return random.choice([80, 100]) if low else random.choice([150, 200, 250, 300, 400, 500])
    if low:
        return max(1, min_q)
    return random.randint(min_q + 1, min_q + 5)


def status_of(days_left, qty, min_q):
    if days_left < 0:
        return "expired"
    if days_left <= 3:
        return "expiring_soon"
    if qty <= min_q:
        return "low_stock"
    return "normal"


def make_item(food, today, force=None, storage=None):
    """force: None | 'normal' | 'expiring' | 'expired' | 'low'"""
    st = storage or pick_storage(food, avoid=("냉동" if force in ("expiring", "expired") and "냉동" in FOODS[food][2] and len(FOODS[food][2]) > 1 else None))
    shelf_min, shelf_max = FOODS[food][2][st]
    min_q = FOODS[food][3]

    if force == "expiring":
        days_left = random.randint(0, 3)
    elif force == "expired":
        days_left = -random.randint(1, 7)
    elif force in ("normal", "low"):
        days_left = random.randint(5, min(max(shelf_max, 6), 60))
    else:  # None → 자연 분포 (대부분 정상, 일부 임박)
        r = random.random()
        if r < 0.10:
            days_left = random.randint(0, 3)
        elif r < 0.14:
            days_left = -random.randint(1, 5)
        else:
            days_left = random.randint(4, min(max(shelf_max, 6), 60))

    expiry = today + timedelta(days=days_left)
    shelf = random.randint(shelf_min, shelf_max)
    purchased = expiry - timedelta(days=shelf)
    if purchased > today:
        purchased = today - timedelta(days=random.randint(0, 2))
    if purchased < today - timedelta(days=400):
        purchased = today - timedelta(days=random.randint(30, 400))

    qty = make_quantity(food, low=(force == "low"))
    status = status_of(days_left, qty, min_q)

    return {
        "name": food,
        "quantity": qty,
        "unit": FOODS[food][1],
        "expiry_date": expiry.isoformat(),
        "purchased_date": purchased.isoformat(),
        "storage": st,
        "status": status,
    }


def days_left_of(item, today):
    return (date.fromisoformat(item["expiry_date"]) - today).days


def days_phrase(dleft):
    if dleft < 0:
        return f"유통기한이 {-dleft}일 지났습니다"
    if dleft == 0:
        return "오늘까지입니다"
    if dleft == 1:
        return "1일 남았습니다"
    return f"{dleft}일 남았습니다"


def qty_str(item):
    return f"{item['quantity']}{item['unit']}"


# --------------------------------------------------------------------------- #
# 유형 A: 유통기한 / 재고 질의
# --------------------------------------------------------------------------- #
Q_URGENT = [
    "지금 유통기한 급한 거 뭐야?", "뭐 먼저 먹어야 돼?", "곧 상하는 거 있어?",
    "이번 주 안에 먹어야 하는 거 있어?", "빨리 먹어야 할 거 알려줘", "뭐 급해?",
    "임박한 재료 뭐 있지?", "유통기한 얼마 안 남은 거 있나?", "서둘러 먹어야 하는 거?",
    "곧 버려야 할 것 같은 거 있어?", "유통기한 임박한거 알려줘", "빨리 소진해야 하는 거 뭐 있어?",
]
Q_EXPIRED = [
    "상한 거 있어?", "버려야 할 거 있나?", "유통기한 지난 거 뭐야?",
    "이미 지난 거 있어?", "폐기해야 할 거 있어?", "기한 넘긴 거 알려줘", "상해서 버릴 거 있나?",
]
Q_LOW = [
    "다 떨어져가는 거 뭐야?", "뭐 사야 돼?", "부족한 거 있어?", "얼마 안 남은 재료 알려줘",
    "장 봐야 할 거 있나?", "떨어져가는 거 있어?", "재고 부족한 거 뭐 있지?", "슬슬 채워야 할 거?",
]
Q_STORAGE = {
    "냉동": ["냉동실에 뭐 있어?", "냉동실에 뭐뭐 있지?", "얼려둔 거 뭐 있어?", "냉동실 재고 알려줘"],
    "냉장": ["냉장실에 뭐 있어?", "냉장칸에 뭐뭐 있지?", "냉장 보관중인 거 알려줘"],
    "실온": ["실온에 둔 거 뭐 있어?", "밖에 둔 거 뭐 있지?", "실온 보관중인 거 알려줘"],
}
Q_WHATS_IN = [
    "지금 뭐 있어?", "냉장고에 뭐뭐 있어?", "재고 알려줘", "지금 있는 재료 알려줘",
    "냉장고 좀 확인해줘", "뭐뭐 들어있지?", "우리집 냉장고 뭐 있더라?",
]


def sample_foods(k, exclude=None):
    exclude = exclude or set()
    pool = [f for f in ALL_FOODS if f not in exclude]
    k = min(k, len(pool))
    return random.sample(pool, k)


def sort_urgent(items, today):
    return sorted(items, key=lambda it: days_left_of(it, today))


def gen_typeA_urgency(today, negative):
    n = random.randint(4, 12)
    items, used = [], set()
    if not negative:
        for _ in range(random.randint(1, 3)):
            f = sample_foods(1, used)[0]
            used.add(f)
            items.append(make_item(f, today, force=random.choice(["expiring", "expiring", "expired"])))
    for f in sample_foods(n - len(items), used):
        used.add(f)
        items.append(make_item(f, today, force=("normal" if negative else random.choice(["normal", "normal", "normal", "low"]))))
    random.shuffle(items)

    q = random.choice(Q_URGENT)
    urgent = sort_urgent([it for it in items if it["status"] in ("expired", "expiring_soon")], today)
    if not urgent:
        a = random.choice([
            "지금 3일 이내로 임박한 재료는 없습니다. 여유 있게 드셔도 괜찮아요.",
            "급하게 드셔야 할 재료는 없네요. 유통기한이 넉넉한 것들뿐입니다.",
            "당장 서둘러 소진할 재료는 없습니다. 안심하셔도 됩니다.",
        ])
    else:
        lines = []
        for it in urgent:
            d = days_left_of(it, today)
            lines.append(f"- {it['name']} ({qty_str(it)}): {days_phrase(d)}")
        head = "유통기한이 급한 순서대로 정리했습니다." if len(urgent) > 1 else "임박한 재료가 있습니다."
        tail_item = urgent[0]["name"]
        tail = f"\n\n{eul(tail_item)} 가장 먼저 드시는 게 좋겠습니다."
        a = head + "\n" + "\n".join(lines) + tail
    return today, items, q, a


def gen_typeA_expired(today, negative):
    n = random.randint(4, 11)
    items, used = [], set()
    if not negative:
        for _ in range(random.randint(1, 2)):
            f = sample_foods(1, used)[0]
            used.add(f)
            items.append(make_item(f, today, force="expired"))
    for f in sample_foods(n - len(items), used):
        used.add(f)
        items.append(make_item(f, today, force="normal"))
    random.shuffle(items)

    q = random.choice(Q_EXPIRED)
    expired = sort_urgent([it for it in items if it["status"] == "expired"], today)
    if not expired:
        a = random.choice([
            "유통기한이 지난 재료는 없습니다. 아직 폐기할 것은 없어요.",
            "상해서 버려야 할 재료는 없습니다. 모두 기한 내에 있습니다.",
        ])
    else:
        lines = [f"- {it['name']} ({qty_str(it)}): {days_phrase(days_left_of(it, today))}" for it in expired]
        a = "유통기한이 지난 재료입니다. 상태를 확인하시고 폐기하는 게 좋겠습니다.\n" + "\n".join(lines)
    return today, items, q, a


def gen_typeA_low(today, negative):
    n = random.randint(4, 11)
    items, used = [], set()
    if not negative:
        for _ in range(random.randint(1, 3)):
            f = sample_foods(1, used)[0]
            used.add(f)
            items.append(make_item(f, today, force="low"))
    for f in sample_foods(n - len(items), used):
        used.add(f)
        items.append(make_item(f, today, force="normal"))
    random.shuffle(items)

    q = random.choice(Q_LOW)
    low = [it for it in items if it["status"] == "low_stock"]
    if not low:
        a = random.choice([
            "지금 부족한 재료는 없습니다. 재고가 넉넉해요.",
            "따로 채워야 할 만큼 떨어진 재료는 없습니다.",
        ])
    else:
        lines = [f"- {it['name']}: {qty_str(it)} 남음" for it in low]
        names = join_and([it["name"] for it in low])
        a = "재고가 얼마 남지 않은 재료입니다. 장 보실 때 참고하세요.\n" + "\n".join(lines) + f"\n\n{eul(names)} 채워두시면 좋겠습니다."
    return today, items, q, a


def gen_typeA_storage(today, negative):
    target = random.choice(["냉동", "냉장", "실온"])
    n = random.randint(4, 12)
    items, used = [], set()
    if negative:
        # 대상 보관장소에 아무것도 없도록: 해당 storage 를 피할 수 있는 식품만
        cand = [f for f in ALL_FOODS if any(s != target for s in FOODS[f][2])]
        for f in random.sample(cand, min(n, len(cand))):
            used.add(f)
            items.append(make_item(f, today, storage=pick_storage(f, avoid=target)))
    else:
        cand = [f for f in ALL_FOODS if target in FOODS[f][2]]
        for f in random.sample(cand, min(random.randint(2, 4), len(cand))):
            used.add(f)
            items.append(make_item(f, today, storage=target))
        for f in sample_foods(max(0, n - len(items)), used):
            used.add(f)
            items.append(make_item(f, today))
    random.shuffle(items)

    q = random.choice(Q_STORAGE[target])
    here = [it for it in items if it["storage"] == target]
    label = STORAGE_LABEL[target]
    if not here:
        a = f"{label}에는 지금 보관 중인 재료가 없습니다."
    else:
        lines = [f"- {it['name']} {qty_str(it)}" for it in here]
        urgent = sort_urgent([it for it in here if it["status"] in ("expired", "expiring_soon")], today)
        a = f"{label}에는 다음 재료가 있습니다.\n" + "\n".join(lines)
        if urgent:
            it = urgent[0]
            a += f"\n\n이 중 {eun(it['name'])} {days_phrase(days_left_of(it, today))}. 먼저 사용하세요."
    return today, items, q, a


def gen_typeA_specific(today, absent):
    n = random.randint(4, 11)
    used = set()
    if absent:
        target = random.choice(ALL_FOODS)
        used.add(target)  # 재고에서 제외
        items = []
        for f in sample_foods(n, used):
            used.add(f)
            items.append(make_item(f, today))
    else:
        target = random.choice(ALL_FOODS)
        used.add(target)
        target_item = make_item(today=today, food=target, force=random.choice(["normal", "normal", "expiring", "expired", "low"]))
        items = [target_item]
        for f in sample_foods(n - 1, used):
            used.add(f)
            items.append(make_item(f, today))
    random.shuffle(items)

    templates = [f"{target} 아직 괜찮아?", f"{target} 유통기한 언제까지야?", f"{target} 상했나?",
                 f"{target} 얼마나 남았어?", f"{target} 아직 먹어도 돼?", f"{target} 몇 개 남았지?"]
    q = random.choice(templates)
    if absent:
        a = random.choice([
            f"{eun(target)} 지금 냉장고에 없습니다. 재고 목록에 등록된 재료가 아니에요.",
            f"현재 재고에는 {eul(target)} 찾을 수 없습니다. 없는 것 같아요.",
        ])
    else:
        it = next(x for x in items if x["name"] == target)
        d = days_left_of(it, today)
        if it["status"] == "expired":
            a = f"{eun(target)} {days_phrase(d)}. 상태를 확인하시고 폐기하는 게 좋겠습니다."
        elif it["status"] == "expiring_soon":
            a = f"{eun(target)} {days_phrase(d)}. 얼마 안 남았으니 곧 드시는 걸 추천합니다. (수량 {qty_str(it)})"
        elif it["status"] == "low_stock":
            a = f"{eun(target)} {qty_str(it)} 남아 있고 {days_phrase(d)}. 수량이 얼마 없으니 참고하세요."
        else:
            a = f"{eun(target)} 아직 괜찮습니다. {days_phrase(d)}. (수량 {qty_str(it)})"
    return today, items, q, a


def gen_typeA_whatsin(today, negative):
    n = random.randint(5, 13)
    items = [make_item(f, today) for f in sample_foods(n)]
    random.shuffle(items)
    q = random.choice(Q_WHATS_IN)
    shown = items[:8]
    listed = ", ".join(f"{it['name']} {qty_str(it)}" for it in shown)
    more = f" 외 {len(items) - 8}종" if len(items) > 8 else ""
    a = f"지금 냉장고에는 총 {len(items)}종이 있습니다: {listed}{more}."
    urgent = sort_urgent([it for it in items if it["status"] in ("expired", "expiring_soon")], today)
    if urgent:
        it = urgent[0]
        a += f" 이 중 {eun(it['name'])} {days_phrase(days_left_of(it, today))}, 가장 급하니 먼저 드세요."
    return today, items, q, a


def build_typeA():
    plan = [
        ("urgency", 84, 13, gen_typeA_urgency),
        ("specific", 60, 15, gen_typeA_specific),
        ("storage", 45, 5, gen_typeA_storage),
        ("low_stock", 42, 6, gen_typeA_low),
        ("expired", 33, 8, gen_typeA_expired),
        ("whats_in", 36, 0, gen_typeA_whatsin),
    ]
    out = []
    for name, total, neg, fn in plan:
        for i in range(total):
            negative = i < neg
            today = rand_today()
            today, items, q, a = fn(today, negative)
            out.append(make_sample(today, items, q, a, meta={"type": "A", "subtype": name, "negative": negative}))
    random.shuffle(out)
    return out


# --------------------------------------------------------------------------- #
# 유형 B: 레시피 추천
# --------------------------------------------------------------------------- #
Q_B = {
    "general": ["지금 있는 재료로 뭐 만들 수 있어?", "저녁 뭐 해먹지?", "뭐 해먹으면 좋을까?",
                "지금 재료로 요리 추천해줘", "점심 메뉴 추천 좀", "이걸로 뭐 만들 수 있을까?"],
    "time": ["10분 안에 되는 요리 있어?", "빨리 되는 거 뭐 해먹지?", "간단하게 만들 수 있는 거 추천해줘",
             "후딱 만들 수 있는 메뉴 있나?"],
    "아이용": ["아이 먹을 만한 거 뭐 해줄까?", "애기 반찬 추천해줘", "아이용으로 뭐 만들면 좋을까?"],
    "매운": ["매운 거 당기는데 뭐 해먹지?", "얼큰한 거 추천해줘", "매콤한 요리 뭐 있을까?"],
    "야식": ["야식으로 뭐가 좋을까?", "밤에 먹을 만한 거 추천해줘", "야식 뭐 해먹지?"],
    "도시락": ["도시락 반찬 추천해줘", "내일 도시락 뭐 싸지?", "도시락에 넣을 반찬 뭐 있을까?"],
    "임박": ["유통기한 임박한 거로 만들 수 있는 요리 추천해줘", "곧 상하는 재료로 뭐 해먹을까?",
             "임박한 재료 소진할 만한 요리 있어?"],
}


def recipe_matches_mode(r, mode):
    tags = r["tags"]
    if mode == "time":
        return r["time"] <= 15 or "간단" in tags
    if mode == "아이용":
        return "아이용" in tags
    if mode == "매운":
        return "매운" in tags or any(x in r["pantry"] for x in ["고추장", "고춧가루"])
    if mode == "야식":
        return "야식" in tags
    if mode == "도시락":
        return "도시락" in tags
    return True  # general / 임박


def choose_recipe(mode, need_multi_core=False):
    cand = [r for r in RECIPES if recipe_matches_mode(r, mode)]
    if need_multi_core:
        cand = [r for r in cand if len(r["core"]) >= 2] or [r for r in RECIPES if len(r["core"]) >= 2]
    if not cand:
        cand = RECIPES
    return random.choice(cand)


def gen_typeB(mode, near_miss, force_expiring):
    recipe = choose_recipe(mode, need_multi_core=near_miss)
    core = list(recipe["core"])
    subs = list(recipe["sub"])

    missing = None
    present_core = list(core)
    if near_miss:
        missing = random.choice(core)
        present_core = [c for c in core if c != missing]

    # 조리 단계에 '이름이 명시된' 부재료는 반드시 재고에 있어야 그라운딩이 지켜진다.
    # ("채소와 고기를 볶는다" 같은 총칭 표현은 특정 품목을 지칭하지 않으므로 강제 대상이 아님)
    step_subs = [s for s in subs if any(s in st for st in recipe["steps"])]
    extra_subs = [s for s in subs if s not in step_subs]
    chosen_extra = random.sample(extra_subs, k=random.randint(0, min(2, len(extra_subs)))) if extra_subs else []
    chosen_subs = list(dict.fromkeys(step_subs + chosen_extra))

    # 재고에 넣을 재료: 보유 core + (단계에 명시된 sub 전부 + 일부 sub) + 잡음(noise)
    inv_foods = list(dict.fromkeys(present_core + chosen_subs))
    noise = sample_foods(random.randint(2, 5), exclude=set(inv_foods) | ({missing} if missing else set()))
    inv_foods = list(dict.fromkeys(inv_foods + noise))

    today = rand_today()
    # 임박 처리: 레시피 재료 중 하나를 임박으로
    exp_target = None
    if force_expiring:
        pool = present_core + chosen_subs
        if pool:
            exp_target = random.choice(pool)

    items = []
    for f in inv_foods:
        force = "expiring" if f == exp_target else random.choice(["normal", "normal", "normal", "low", None])
        items.append(make_item(f, today, force=force))
    random.shuffle(items)

    inv_names = {it["name"] for it in items}
    present_subs = [s for s in chosen_subs if s in inv_names]

    # 임박 재료(레시피에 쓰이는 것) 찾기
    used_ing = set(present_core) | set(present_subs)
    exp_items = sort_urgent([it for it in items if it["name"] in used_ing and it["status"] in ("expiring_soon", "expired")], today)

    q = random.choice(Q_B[mode])
    a = build_recipe_answer(recipe, present_core, present_subs, missing, exp_items, near_miss)
    # 그라운딩 검증 시 예외 허용: 요리 이름(콩나물무침→'무', 토마토파스타→'토마토' 등
    # 식품명을 부분문자열로 포함) + 기본 양념(pantry) + 근접메뉴의 부족 재료(missing)
    mask_extra = [recipe["name"]] + list(recipe["pantry"]) + ([missing] if missing else [])
    return today, items, q, a, mask_extra


def build_recipe_answer(recipe, present_core, present_subs, missing, exp_items, near_miss):
    name = recipe["name"]
    hook_pool = present_core + present_subs
    hook = join_and(hook_pool[:2]) if hook_pool else name

    if near_miss:
        head = (f"지금 재료로 딱 맞는 메뉴는 마땅치 않지만, {missing}만 더 있으면 "
                f"{eul(name)} 만들 수 있어요. 아래 재료를 참고해 주세요.")
    else:
        head = random.choice([
            f"{iga(hook)} 있으니 {eun(name)} 어떠세요?",
            f"{name} 어떠세요? 마침 {iga(hook)} 있네요.",
            f"{euro(hook)} {eul(name)} 만들어 보시는 건 어때요?",
        ])
    if exp_items and not near_miss:
        head += f" 유통기한이 임박한 {eul(exp_items[0]['name'])} 먼저 쓰기 좋습니다."

    # 재료 목록
    lines = ["[재료]"]
    for c in recipe["core"]:
        if c == missing:
            lines.append(f"- {c} {amt(c)} (부족, 준비 필요)")
        elif c in present_core:
            lines.append(f"- {c} {amt(c)} (보유)")
    for s in present_subs:
        lines.append(f"- {s} {amt(s)} (보유)")
    if recipe["pantry"]:
        lines.append(f"- 기본 양념: {', '.join(recipe['pantry'])} (필요 시 준비)")

    steps = ["[만드는 법]"]
    for i, st in enumerate(recipe["steps"], 1):
        steps.append(f"{i}. {st}")

    return head + "\n\n" + "\n".join(lines) + "\n\n" + "\n".join(steps)


def build_typeB():
    modes = (["general"] * 96 + ["time"] * 42 + ["아이용"] * 33 + ["매운"] * 27
             + ["야식"] * 30 + ["도시락"] * 30 + ["임박"] * 42)
    random.shuffle(modes)
    assert len(modes) == 300, len(modes)

    out = []
    near_miss_left = 54
    for mode in modes:
        # 근접 메뉴(재료 부족)는 general/time 모드에서만 자연스럽게 배치
        near_miss = False
        if mode in ("general", "time") and near_miss_left > 0 and random.random() < 0.45:
            near_miss = True
            near_miss_left -= 1
        force_expiring = True if mode == "임박" else (random.random() < 0.4 and not near_miss)
        today, items, q, a, mask_extra = gen_typeB(mode, near_miss, force_expiring)
        out.append(make_sample(today, items, q, a,
                               meta={"type": "B", "mode": mode, "near_miss": near_miss, "mask_extra": mask_extra}))
    random.shuffle(out)
    return out


# --------------------------------------------------------------------------- #
# 샘플 조립 / 직렬화
# --------------------------------------------------------------------------- #
def make_sample(today, items, question, answer, meta):
    inv_json = json.dumps(items, ensure_ascii=False, indent=2)
    system = SYSTEM_TMPL.format(today=today.isoformat(), inv=inv_json)
    sample = {
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": question},
            {"role": "assistant", "content": answer},
        ]
    }
    sample["_meta"] = {"today": today.isoformat(), "inventory": items, **meta}
    return sample


def write_jsonl(path, samples):
    with open(path, "w", encoding="utf-8") as f:
        for s in samples:
            row = {"messages": s["messages"]}
            f.write(json.dumps(row, ensure_ascii=False) + "\n")


# --------------------------------------------------------------------------- #
# 검증
# --------------------------------------------------------------------------- #
NUM_LEFT = re.compile(r"(\d+)일 남았")
NUM_PAST = re.compile(r"(\d+)일 지났")


def verify(samples):
    errors = []
    for i, s in enumerate(samples):
        meta = s["_meta"]
        today = date.fromisoformat(meta["today"])
        inv = meta["inventory"]
        assistant = s["messages"][2]["content"]

        # 1) status 필드 정합성
        for it in inv:
            d = (date.fromisoformat(it["expiry_date"]) - today).days
            exp = status_of(d, it["quantity"], FOODS[it["name"]][3])
            if it["status"] != exp:
                errors.append((i, f"status 불일치 {it['name']}: {it['status']} != {exp}"))

        # 2) 날짜 산수: 답변의 'N일 남았/지났' 가 재고 어떤 항목과 일치해야 함
        left_days = {(date.fromisoformat(it["expiry_date"]) - today).days for it in inv}
        past_days = {-(date.fromisoformat(it["expiry_date"]) - today).days for it in inv
                     if (date.fromisoformat(it["expiry_date"]) - today).days < 0}
        for m in NUM_LEFT.findall(assistant):
            if int(m) not in left_days:
                errors.append((i, f"'{m}일 남았' 가 재고와 불일치 (가능: {sorted(left_days)})"))
        for m in NUM_PAST.findall(assistant):
            if int(m) not in past_days:
                errors.append((i, f"'{m}일 지났' 가 재고와 불일치 (가능: {sorted(past_days)})"))

        # 3) 이름 그라운딩: 답변에 등장한 식품명은 모두 재고에 있어야 함
        #    재고 품목명을 먼저 마스킹해 부분문자열 오탐(김치→김, 순두부→두부 등)을 제거
        inv_names = {it["name"] for it in inv}
        if meta.get("type") == "A":
            # 없는 재료 질문에 대한 '없습니다' 답변의 대상 품목은 예외
            if meta.get("subtype") == "specific" and meta.get("negative"):
                continue
            mask = inv_names
        else:  # 유형 B: 재고 + 기본 양념 + 근접메뉴 부족 재료는 허용
            mask = inv_names | set(meta.get("mask_extra", []))
        # 소유를 주장하는 영역(추천 문장 + [재료])만 검사한다. 조리 단계 산문은
        # 1글자 식품명(무·김 등)이 동사에 오탐되므로 구조적 보장(step_subs 강제)으로 대체.
        region = assistant.split("[만드는 법]")[0] if meta.get("type") == "B" else assistant
        for leak in grounding_leaks(region, mask):
            errors.append((i, f"그라운딩 위반: '{leak}' 이(가) 재고에 없는데 답변에 등장 (type={meta.get('type')})"))
    return errors


def grounding_leaks(assistant, mask_names):
    masked = assistant
    for nm in sorted(mask_names, key=len, reverse=True):
        masked = masked.replace(nm, "·")
    leaks = []
    for food in sorted(ALL_FOODS, key=len, reverse=True):
        if food in masked:  # mask 에 없는 식품명이 그대로 남아있으면 누수
            leaks.append(food)
            masked = masked.replace(food, "·")  # 자기 부분문자열 재보고 방지
    return leaks


# --------------------------------------------------------------------------- #
# 통계
# --------------------------------------------------------------------------- #
def stats(samples, key):
    from collections import Counter
    c = Counter()
    for s in samples:
        m = s["_meta"]
        c[m.get(key)] += 1
    return dict(c)


def main():
    typeA = build_typeA()
    typeB = build_typeB()
    alls = typeA + typeB
    random.shuffle(alls)

    errors = verify(alls)

    write_jsonl(os.path.join(HERE, "fridge_typeA_inventory.jsonl"), typeA)
    write_jsonl(os.path.join(HERE, "fridge_typeB_recipe.jsonl"), typeB)
    write_jsonl(os.path.join(HERE, "fridge_sft_all.jsonl"), alls)

    print("=" * 60)
    print(f"유형 A (유통기한/재고): {len(typeA)}개")
    print(f"  서브타입: {stats(typeA, 'subtype')}")
    print(f"  부정(없음) 답변: {sum(1 for s in typeA if s['_meta'].get('negative'))}개")
    print(f"유형 B (레시피 추천): {len(typeB)}개")
    print(f"  모드: {stats(typeB, 'mode')}")
    print(f"  근접메뉴(재료부족): {sum(1 for s in typeB if s['_meta'].get('near_miss'))}개")
    print("-" * 60)
    if errors:
        print(f"[검증 실패] {len(errors)}건")
        for i, msg in errors[:25]:
            print(f"  #{i}: {msg}")
        sys.exit(1)
    print(f"[검증 통과] 날짜 산수 · status · 그라운딩 전부 정상 (총 {len(alls)}개)")
    print("=" * 60)


if __name__ == "__main__":
    main()
