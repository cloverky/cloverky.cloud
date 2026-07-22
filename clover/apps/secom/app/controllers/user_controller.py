import logging

from sqlalchemy.ext.asyncio import AsyncSession
from users.adapter.user import User

from secom.app.schemas.user_schema import (
    ChangePasswordSchema,
    LoginResultSchema,
    LoginSchema,
    UpdateUsernameSchema,
    UserSchema,
)
from secom.app.services.user_service import UserService
from secom.app.utils.log_helper import log_login_layer, log_save_user_layer

logger = logging.getLogger(__name__)


class UserController:
    def __init__(self) -> None:
        self._user_service = UserService()

    async def save_user(self, db: AsyncSession, user_schema: UserSchema) -> User:
        log_save_user_layer("Controller", user_schema)
        logger.info("[Controller] → Service.save_user 호출")
        user = await self._user_service.save_user(db, user_schema)
        logger.info(
            "[Controller] save_user 완료 — id=%s username=%r", user.id, user.username
        )
        return user

    async def login_user(
        self,
        db: AsyncSession,
        login_schema: LoginSchema,
    ) -> LoginResultSchema:
        log_login_layer("Controller", login_schema)
        logger.info("[Controller] → Service.login_user 호출")
        result = await self._user_service.login_user(db, login_schema)
        logger.info(
            "[Controller] login_user 완료 — username=%r email=%r role=%r",
            result.username,
            result.email,
            result.role,
        )
        return result

    async def update_username(
        self, db: AsyncSession, update_schema: UpdateUsernameSchema
    ) -> LoginResultSchema:
        logger.info("[Controller] → Service.update_username 호출")
        return await self._user_service.update_username(db, update_schema)

    async def change_password(
        self, db: AsyncSession, change_schema: ChangePasswordSchema
    ) -> None:
        logger.info("[Controller] → Service.change_password 호출")
        await self._user_service.change_password(db, change_schema)
