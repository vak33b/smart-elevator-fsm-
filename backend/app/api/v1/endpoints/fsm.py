from fastapi import APIRouter, HTTPException, status

from app.schemas.fsm import FSMDefinition

router = APIRouter()


@router.post(
    "/validate",
    summary="Проверить корректность FSM",
)
def validate_fsm(fsm: FSMDefinition):
    """
    Просто пробуем валидировать FSMDefinition.
    Если что-то не так — Pydantic выбросит ошибку и FastAPI вернёт 422.
    Возвращаем простой ответ, если всё ок.
    """
    # Если мы здесь — значит, схема успешно провалилась через валидацию
    return {"valid": True}
