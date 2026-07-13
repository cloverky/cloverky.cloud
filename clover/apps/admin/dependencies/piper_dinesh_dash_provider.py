from admin.adapter.outbound.repositories.piper_dinesh_dash_repository import (
    DineshDashPgRepository,
)
from admin.app.ports.input.piper_dinesh_dash_use_case import DineshDashUseCase
from admin.app.use_cases.piper_dinesh_dash_interactor import (
    DineshDashInteractor,
)


def get_dinesh_dash_use_case() -> DineshDashUseCase:
    return DineshDashInteractor(repository=DineshDashPgRepository())
