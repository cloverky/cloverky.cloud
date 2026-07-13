from admin.adapter.outbound.repositories.piper_hendricks_ceo_repository import (
    HendricksCeoPgRepository,
)
from admin.app.ports.input.piper_hendricks_ceo_use_case import (
    HendricksCeoUseCase,
)
from admin.app.use_cases.piper_hendricks_ceo_interactor import (
    HendricksCeoInteractor,
)


def get_hendricks_ceo_use_case() -> HendricksCeoUseCase:
    return HendricksCeoInteractor(repository=HendricksCeoPgRepository())
