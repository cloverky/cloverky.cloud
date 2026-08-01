"""WMO 날씨 코드를 OpenWeather 아이콘 코드·한글 설명으로 옮긴다.

두 서비스의 응답 모양을 맞추기 위한 순수 변환이라 게이트웨이 옆에 둔다.
"""

from __future__ import annotations


def to_icon(code: int, *, night: bool = False) -> str:
    suffix = "n" if night else "d"
    if code == 0:
        return f"01{suffix}"
    if code in (1, 2):
        return f"02{suffix}"
    if code == 3:
        return f"04{suffix}"
    if code in (45, 48):
        return "50d"
    if code in (51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82):
        return "10d"
    if code in (71, 73, 75, 77, 85, 86):
        return "13d"
    if code in (95, 96, 99):
        return "11d"
    return f"03{suffix}"


def to_description_ko(code: int) -> str:
    if code == 0:
        return "맑음"
    if code in (1, 2):
        return "대체로 맑음"
    if code == 3:
        return "흐림"
    if code in (45, 48):
        return "안개"
    if code in (51, 53, 55):
        return "이슬비"
    if code in (56, 57):
        return "진눈깨비"
    if code in (61, 63, 65):
        return "비"
    if code in (66, 67):
        return "진눈깨비"
    if code in (71, 73, 75):
        return "눈"
    if code in (77, 85, 86):
        return "눈보라"
    if code in (80, 81, 82):
        return "소나기"
    if code in (95, 96, 99):
        return "뇌우"
    return "흐림"
