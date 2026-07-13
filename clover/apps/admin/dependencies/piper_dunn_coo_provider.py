from admin.adapter.outbound.repositories.piper_dunn_coo_repository import (
    DunnCooPgRepository,
)
from admin.app.ports.input.piper_dunn_coo_use_case import DunnCooUseCase
from admin.app.use_cases.piper_dunn_coo_interactor import DunnCooInteractor


def get_dunn_coo_use_case() -> DunnCooUseCase:
    return DunnCooInteractor(repository=DunnCooPgRepository())
