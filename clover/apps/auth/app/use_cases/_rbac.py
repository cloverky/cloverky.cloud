"""role → permission 매핑. Role 자체는 core.rbac에서 공유 어휘로 가져온다."""

from __future__ import annotations

from enum import StrEnum

from core.rbac import Role


class Permission(StrEnum):
    INVENTORY_READ = "inventory:read"
    INVENTORY_WRITE = "inventory:write"
    ADMIN_FULL = "admin:full"


ROLE_PERMISSIONS: dict[Role, frozenset[Permission]] = {
    Role.USER: frozenset({Permission.INVENTORY_READ, Permission.INVENTORY_WRITE}),
    Role.ADMIN: frozenset(
        {Permission.INVENTORY_READ, Permission.INVENTORY_WRITE, Permission.ADMIN_FULL}
    ),
}
