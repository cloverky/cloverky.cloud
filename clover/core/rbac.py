"""JWT roles claim 어휘 — auth 게이트웨이와 모든 검증측이 공유.

users.adapter.user.UserRole과 값을 동일하게 맞추되, core가 특정 스포크의 ORM을
import하지 않도록 의도적으로 독립 정의한다.
"""

from enum import StrEnum


class Role(StrEnum):
    ADMIN = "admin"
    USER = "user"
