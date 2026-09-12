import logging
from fastapi import APIRouter, HTTPException, Depends, Header, Query, status
from typing import Optional, List
from app.database import db, get_supabase_client
from app.schemas.notifications import (
    NotificationResponse,
    NotificationUpdate,
    UnreadCountResponse
)

logger = logging.getLogger("uvicorn")

router = APIRouter(prefix="/api/notifications", tags=["Notificações"])

def get_optional_token(authorization: Optional[str] = Header(None)) -> Optional[str]:
    """Extrai token Bearer se presente no cabeçalho."""
    if not authorization:
        return None
    parts = authorization.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None

async def resolve_current_user_id(token: Optional[str]) -> Optional[str]:
    """Retorna o ID do usuário através do token JWT do Supabase."""
    if not token:
        return None
    try:
        client = get_supabase_client()
        user_res = client.auth.get_user(token)
        if user_res and user_res.user:
            return user_res.user.id
    except Exception as e:
        logger.warning(f"Erro ao validar token JWT para notificações: {e}")
    return None

def format_notification_response(n) -> NotificationResponse:
    """Converte objeto Prisma em NotificationResponse."""
    return NotificationResponse(
        id=n.id,
        user_id=n.userId,
        title=n.title,
        message=n.message,
        type=n.type,
        link=n.link,
        read=n.read,
        created_at=n.createdAt.isoformat() if hasattr(n.createdAt, "isoformat") else str(n.createdAt)
    )

@router.get("", response_model=List[NotificationResponse])
@router.get("/", response_model=List[NotificationResponse])
async def list_notifications(
    user_id: Optional[str] = Query(None, description="ID do usuário para filtrar notificações"),
    unread_only: bool = Query(False, description="Filtrar apenas notificações não lidas"),
    limit: int = Query(50, ge=1, le=100, description="Quantidade máxima de notificações"),
    token: Optional[str] = Depends(get_optional_token)
):
    """
    Lista notificações do usuário ordenadas pelas mais recentes.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Banco de dados não conectado."
        )

    resolved_user_id = user_id
    if not resolved_user_id and token:
        resolved_user_id = await resolve_current_user_id(token)

    if not resolved_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe o user_id ou autentique-se via token Bearer."
        )

    where_clause = {"userId": resolved_user_id}
    if unread_only:
        where_clause["read"] = False

    try:
        notifications = await db.notification.find_many(
            where=where_clause,
            order={"createdAt": "desc"},
            take=limit
        )
        return [format_notification_response(n) for n in notifications]
    except Exception as e:
        logger.error(f"Erro ao listar notificações: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao buscar notificações: {str(e)}"
        )

@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    user_id: Optional[str] = Query(None, description="ID do usuário"),
    token: Optional[str] = Depends(get_optional_token)
):
    """
    Retorna a quantidade de notificações não lidas do usuário.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Banco de dados não conectado."
        )

    resolved_user_id = user_id
    if not resolved_user_id and token:
        resolved_user_id = await resolve_current_user_id(token)

    if not resolved_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe o user_id ou autentique-se via token Bearer."
        )

    try:
        count = await db.notification.count(
            where={"userId": resolved_user_id, "read": False}
        )
        return UnreadCountResponse(unread_count=count)
    except Exception as e:
        logger.error(f"Erro ao contar notificações não lidas: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao contar notificações: {str(e)}"
        )

@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_as_read(
    notification_id: str,
    data: Optional[NotificationUpdate] = None
):
    """
    Marca uma notificação como lida (ou altera o status de leitura).
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Banco de dados não conectado."
        )

    read_value = True if (data is None or data.read is None) else data.read

    try:
        updated = await db.notification.update(
            where={"id": notification_id},
            data={"read": read_value}
        )
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notificação não encontrada."
            )
        return format_notification_response(updated)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao atualizar notificação {notification_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao atualizar notificação: {str(e)}"
        )

@router.patch("/read-all", response_model=dict)
async def mark_all_as_read(
    user_id: Optional[str] = Query(None, description="ID do usuário"),
    token: Optional[str] = Depends(get_optional_token)
):
    """
    Marca todas as notificações pendentes do usuário como lidas.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Banco de dados não conectado."
        )

    resolved_user_id = user_id
    if not resolved_user_id and token:
        resolved_user_id = await resolve_current_user_id(token)

    if not resolved_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe o user_id ou autentique-se via token Bearer."
        )

    try:
        result = await db.notification.update_many(
            where={"userId": resolved_user_id, "read": False},
            data={"read": True}
        )
        return {
            "message": "Todas as notificações foram marcadas como lidas.",
            "updated_count": result
        }
    except Exception as e:
        logger.error(f"Erro ao marcar todas notificações como lidas: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao atualizar notificações: {str(e)}"
        )

@router.delete("/{notification_id}", response_model=dict)
async def delete_notification(notification_id: str):
    """
    Remove uma notificação do sistema.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Banco de dados não conectado."
        )

    try:
        await db.notification.delete(where={"id": notification_id})
        return {"message": "Notificação removida com sucesso."}
    except Exception as e:
        logger.error(f"Erro ao remover notificação {notification_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao remover notificação: {str(e)}"
        )
