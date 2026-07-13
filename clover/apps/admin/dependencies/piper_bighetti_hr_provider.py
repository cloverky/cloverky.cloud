from admin.adapter.outbound.repositories.piper_bighetti_hr_repository import (
    BighettiHrPgRepository,
)
from admin.app.ports.input.piper_bighetti_hr_use_case import BighettiHrUseCase
from admin.app.use_cases.piper_bighetti_hr_interactor import (
    BighettiHrInteractor,
)


def get_bighetti_hr_use_case() -> BighettiHrUseCase:
    return BighettiHrInteractor(repository=BighettiHrPgRepository())
