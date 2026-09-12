import logging
from typing import Optional, List
from app.database import db

logger = logging.getLogger("uvicorn")

async def create_notification(
    user_id: str,
    title: str,
    message: str,
    notification_type: str = "team_message",
    link: Optional[str] = None
):
    """
    Cria uma notificação individual no banco de dados.
    """
    if db is None:
        logger.warning("Banco de dados não disponível para criar notificação.")
        return None

    try:
        notification = await db.notification.create(
            data={
                "userId": user_id,
                "title": title,
                "message": message,
                "type": notification_type,
                "link": link,
                "read": False
            }
        )
        return notification
    except Exception as e:
        logger.error(f"Erro ao criar notificação para o usuário {user_id}: {e}")
        return None


async def notify_team_members_new_message(
    team_id: str,
    sender_id: str,
    channel: str,
    message_content: str
) -> int:
    """
    Cria notificações para todos os membros e owner da equipe (exceto o próprio remetente)
    quando uma nova mensagem for postada no chat.
    """
    if db is None:
        return 0

    try:
        team = await db.team.find_unique(
            where={"id": team_id},
            include={"members": True, "owner": True}
        )
        if not team:
            logger.warning(f"Equipe {team_id} não encontrada para disparo de notificações.")
            return 0

        # Coleta os IDs de todos os participantes da equipe (owner + membros)
        recipient_ids = set()
        if team.ownerId and team.ownerId != sender_id:
            recipient_ids.add(team.ownerId)

        for member in getattr(team, "members", []) or []:
            if member.id != sender_id:
                recipient_ids.add(member.id)

        if not recipient_ids:
            return 0

        # Obtém o nome do remetente para um resumo amigável
        sender = await db.user.find_unique(where={"id": sender_id})
        sender_name = "Alguém"
        if sender:
            name_parts = [sender.firstName, sender.lastName]
            sender_name = " ".join([p for p in name_parts if p]).strip() or sender.email

        # Prepara resumo do conteúdo da mensagem
        content_preview = message_content.strip()
        if len(content_preview) > 100:
            content_preview = content_preview[:97] + "..."

        channel_display = f"#{channel}" if channel else "#geral"
        title = f"Nova mensagem em {channel_display} - {team.name}"
        body = f"{sender_name}: {content_preview}"
        link = f"/equipes/{team_id}/chat"

        created_count = 0
        for uid in recipient_ids:
            notif = await create_notification(
                user_id=uid,
                title=title,
                message=body,
                notification_type="team_message",
                link=link
            )
            if notif:
                created_count += 1

        logger.info(f"Disparadas {created_count} notificações para a equipe '{team.name}' (canal {channel_display}).")
        return created_count

    except Exception as e:
        logger.error(f"Erro ao processar notificações de mensagem para equipe {team_id}: {e}")
        return 0
