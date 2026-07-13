from admin.adapter.outbound.repositories.piper_gilfoyle_sys_repository import (
    GilfoyleSysPgRepository,
)
from admin.app.ports.input.piper_gilfoyle_sys_use_case import (
    GilfoyleSysUseCase,
)
from admin.app.use_cases.piper_gilfoyle_sys_interactor import (
    GilfoyleSysInteractor,
)


def get_gilfoyle_sys_use_case() -> GilfoyleSysUseCase:
    return GilfoyleSysInteractor(repository=GilfoyleSysPgRepository())
