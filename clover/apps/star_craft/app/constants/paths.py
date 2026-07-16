from __future__ import annotations

from pathlib import Path

# clover/apps/star_craft/app/constants/paths.py -> parents[3] == clover/apps
_APPS_DIR = Path(__file__).resolve().parents[3]

# 결과물은 fridge 리소스 디렉터리에 적재한다 (사용자 지정).
_FRIDGE_RESOURCES = _APPS_DIR / "fridge" / "resources"

CRAWLED_DIR = str(_FRIDGE_RESOURCES / "crawled")
SCRAPED_DIR = str(_FRIDGE_RESOURCES / "scraped")
