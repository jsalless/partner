import logging
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Header, Depends, status, Query, Body
from app.database import get_supabase_client, get_supabase_admin_client, db
from app.schemas.teams import (
    TeamCreate,
    TeamUpdate,
    TeamResponse,
    TeamMemberInfo,
    ProjectInfo
)
from app.schemas.auth import MessageResponse
from app.schemas.chat import (
    TeamMessageCreate,
    TeamMessageResponse,
    MessageSenderInfo,
    ChannelCreate,
    ChannelResponse
)
from app.services.notifications import notify_team_members_new_message

logger = logging.getLogger("uvicorn")

router = APIRouter(prefix="/api/teams", tags=["Equipes"])

class AddMemberRequest(BaseModel):
    user_id: str

class TransferOwnershipRequest(BaseModel):
    new_owner_id: str

def get_optional_token(authorization: Optional[str] = Header(None)) -> Optional[str]:
    """Extrai o token Bearer se presente no cabeçalho."""
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
        logger.warning(f"Erro ao validar token JWT: {e}")
    return None

async def ensure_user_in_prisma(user_id: str):
    """Garante que o usuário com id especificado existe na tabela users do Prisma."""
    if db is None:
        return
    existing = await db.user.find_unique(where={"id": user_id})
    if existing:
        return existing

    admin_client = get_supabase_admin_client()
    try:
        res = admin_client.auth.admin.get_user_by_id(user_id)
        auth_user = res.user
        if auth_user:
            meta = auth_user.user_metadata or {}
            first_name = meta.get("first_name") or ""
            last_name = meta.get("last_name") or ""
            if not first_name and meta.get("full_name"):
                parts = meta.get("full_name").split(" ", 1)
                first_name = parts[0]
                last_name = parts[1] if len(parts) > 1 else ""

            default_avatar = meta.get("default_avatar") or "/Avatar1.svg"
            avatar_url = meta.get("avatar_url") or meta.get("picture") or meta.get("avatar") or default_avatar
            return await db.user.upsert(
                where={"id": user_id},
                data={
                    "create": {
                        "id": user_id,
                        "email": auth_user.email or f"{user_id}@partner.local",
                        "firstName": first_name or "Usuário",
                        "lastName": last_name or "",
                        "role": (auth_user.app_metadata or {}).get("role", "cliente"),
                        "avatarUrl": avatar_url,
                        "defaultAvatar": default_avatar
                    },
                    "update": {
                        "avatarUrl": avatar_url,
                        "defaultAvatar": default_avatar
                    }
                }
            )
    except Exception as e:
        logger.error(f"Erro ao sincronizar usuário {user_id} no Prisma: {e}")
    return None

def build_member_info(u, is_owner: bool = False) -> TeamMemberInfo:
    """Converte um objeto User do Prisma em TeamMemberInfo com role 'Tech Lead' para o líder e 'dev' como default."""
    first = getattr(u, "firstName", "") or ""
    last = getattr(u, "lastName", "") or ""
    full = f"{first} {last}".strip() or getattr(u, "email", "")
    avatar_url = getattr(u, "avatarUrl", None) or getattr(u, "defaultAvatar", None) or "/Avatar1.svg"
    
    if is_owner:
        role = "Tech Lead"
    else:
        user_role = getattr(u, "role", None)
        if user_role and str(user_role).lower() in ["owner", "proprietário", "proprietario", "lider", "líder"]:
            role = "Tech Lead"
        elif user_role and str(user_role).lower() not in ["cliente", "membro", "user", ""]:
            role = user_role
        else:
            role = "dev"

    return TeamMemberInfo(
        id=u.id,
        email=getattr(u, "email", ""),
        first_name=first,
        last_name=last,
        full_name=full,
        role=role,
        avatar_url=avatar_url
    )

def build_sender_info(u, is_owner: bool = False) -> MessageSenderInfo:
    """Converte um objeto User do Prisma em MessageSenderInfo para exibição no chat."""
    first = getattr(u, "firstName", "") or ""
    last = getattr(u, "lastName", "") or ""
    full = f"{first} {last}".strip() or getattr(u, "email", "")
    avatar_url = getattr(u, "avatarUrl", None) or getattr(u, "defaultAvatar", None) or "/Avatar1.svg"
    
    if is_owner:
        role = "Tech Lead"
    else:
        user_role = getattr(u, "role", None)
        if user_role and str(user_role).lower() in ["owner", "proprietário", "proprietario", "lider", "líder"]:
            role = "Tech Lead"
        elif user_role and str(user_role).lower() not in ["cliente", "membro", "user", ""]:
            role = user_role
        else:
            role = "dev"

    return MessageSenderInfo(
        id=u.id,
        email=getattr(u, "email", ""),
        first_name=first,
        last_name=last,
        full_name=full,
        role=role,
        avatar_url=avatar_url
    )

def format_message_response(m, team_owner_id: Optional[str] = None) -> TeamMessageResponse:
    """Formata o retorno da mensagem incluindo dados do remetente."""
    is_owner = False
    if team_owner_id and m.userId == team_owner_id:
        is_owner = True
    elif hasattr(m, "team") and m.team and getattr(m.team, "ownerId", None) == m.userId:
        is_owner = True

    sender_info = build_sender_info(m.user, is_owner=is_owner) if hasattr(m, "user") and m.user else None
    return TeamMessageResponse(
        id=m.id,
        team_id=m.teamId,
        user_id=m.userId,
        content=m.content,
        type=m.type,
        channel=m.channel,
        created_at=str(m.createdAt) if hasattr(m, "createdAt") else None,
        updated_at=str(m.updatedAt) if hasattr(m, "updatedAt") else None,
        sender=sender_info
    )

def format_team_response(t) -> TeamResponse:
    """Formata o retorno da equipe incluindo owner (Tech Lead), membros (default dev) e projeto."""
    owner_info = build_member_info(t.owner, is_owner=True) if hasattr(t, "owner") and t.owner else None
    members_info = [
        build_member_info(m, is_owner=(m.id == t.ownerId))
        for m in getattr(t, "members", []) or []
    ]
    project_info = None
    if hasattr(t, "project") and t.project:
        project_info = ProjectInfo(
            id=t.project.id,
            name=t.project.name,
            description=t.project.description
        )

    return TeamResponse(
        id=t.id,
        name=t.name,
        description=t.description,
        owner_id=t.ownerId,
        owner=owner_info,
        project_id=t.projectId,
        project=project_info,
        is_private=getattr(t, "isPrivate", False),
        avatar_url=getattr(t, "avatarUrl", None),
        created_at=str(t.createdAt) if hasattr(t, "createdAt") else None,
        updated_at=str(t.updatedAt) if hasattr(t, "updatedAt") else None,
        members=members_info
    )

@router.post("", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
async def create_team(
    data: TeamCreate,
    token: Optional[str] = Depends(get_optional_token)
):
    """
    Cria uma nova equipe, associando o owner_id e membros no banco de dados.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Banco de dados não conectado."
        )

    # Identifica o owner_id (ou pelo payload ou pelo token)
    owner_id = data.owner_id
    if not owner_id and token:
        owner_id = await resolve_current_user_id(token)

    if not owner_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O 'owner_id' é obrigatório. Envie no corpo da requisição ou autentique-se com Bearer token."
        )

    # Garante que o owner existe no banco
    await ensure_user_in_prisma(owner_id)

    # Garante que os membros também existam
    member_ids = list(set([owner_id] + (data.member_ids or [])))
    for m_id in member_ids:
        await ensure_user_in_prisma(m_id)

    # Valida projeto obrigatório
    project = await db.project.find_unique(where={"id": data.project_id})
    if not project:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O projeto informado não foi encontrado. Selecione um projeto válido."
        )

    try:
        team = await db.team.create(
            data={
                "name": data.name.strip(),
                "description": data.description.strip() if data.description else None,
                "isPrivate": data.is_private,
                "avatarUrl": data.avatar_url,
                "owner": {"connect": {"id": owner_id}},
                "project": {"connect": {"id": data.project_id}},
                "members": {"connect": [{"id": m_id} for m_id in member_ids]},
                "channels": {
                    "create": [
                        {
                            "name": "geral",
                            "description": "Canal geral de comunicação da equipe",
                            "isDefault": True
                        }
                    ]
                }
            },
            include={
                "owner": True,
                "members": True,
                "project": True,
                "channels": True
            }
        )

        return format_team_response(team)

    except Exception as e:
        logger.error(f"Erro ao criar equipe: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao criar equipe: {str(e)}"
        )

@router.put("/{team_id}", response_model=TeamResponse)
@router.patch("/{team_id}", response_model=TeamResponse)
async def update_team(
    team_id: str,
    data: TeamUpdate,
    token: Optional[str] = Depends(get_optional_token)
):
    """
    Edita os dados de uma equipe existente (nome, descrição, membros, owner).
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Banco de dados não conectado."
        )

    existing_team = await db.team.find_unique(
        where={"id": team_id},
        include={"owner": True, "members": True, "project": True}
    )

    if not existing_team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipe não encontrada."
        )

    update_data = {}

    if data.name is not None:
        name_clean = data.name.strip()
        if not name_clean:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O nome da equipe não pode ser vazio."
            )
        update_data["name"] = name_clean

    if data.description is not None:
        update_data["description"] = data.description.strip() if data.description else None

    if data.project_id is not None:
        if not data.project_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="É obrigatório manter a equipe vinculada a um projeto."
            )
        project = await db.project.find_unique(where={"id": data.project_id})
        if not project:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O projeto informado não foi encontrado."
            )
        update_data["project"] = {"connect": {"id": data.project_id}}

    if data.owner_id is not None and data.owner_id != existing_team.ownerId:
        await ensure_user_in_prisma(data.owner_id)
        update_data["owner"] = {"connect": {"id": data.owner_id}}

    if data.is_private is not None:
        update_data["isPrivate"] = data.is_private

    if data.avatar_url is not None:
        update_data["avatarUrl"] = data.avatar_url if data.avatar_url != "" else None

    if data.member_ids is not None:
        for m_id in data.member_ids:
            await ensure_user_in_prisma(m_id)
        update_data["members"] = {"set": [{"id": m_id} for m_id in data.member_ids]}

    try:
        updated_team = await db.team.update(
            where={"id": team_id},
            data=update_data,
            include={"owner": True, "members": True, "project": True}
        )

        return format_team_response(updated_team)

    except Exception as e:
        logger.error(f"Erro ao atualizar equipe {team_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao atualizar equipe: {str(e)}"
        )

@router.post("/{team_id}/members", response_model=TeamResponse)
async def add_team_member(
    team_id: str,
    data: AddMemberRequest,
    token: Optional[str] = Depends(get_optional_token)
):
    """
    Adiciona um novo integrante à equipe.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Banco de dados não conectado."
        )

    team = await db.team.find_unique(where={"id": team_id})
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipe não encontrada."
        )

    await ensure_user_in_prisma(data.user_id)

    try:
        updated_team = await db.team.update(
            where={"id": team_id},
            data={"members": {"connect": [{"id": data.user_id}]}},
            include={
                "owner": True,
                "members": True,
                "project": True,
                "channels": True
            }
        )
        return format_team_response(updated_team)
    except Exception as e:
        logger.error(f"Erro ao adicionar membro à equipe {team_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao adicionar integrante: {str(e)}"
        )

@router.delete("/{team_id}/members/{user_id}", response_model=TeamResponse)
async def remove_team_member(
    team_id: str,
    user_id: str,
    token: Optional[str] = Depends(get_optional_token)
):
    """
    Remove um integrante da equipe (ou o próprio usuário sai da equipe).
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Banco de dados não conectado."
        )

    team = await db.team.find_unique(where={"id": team_id})
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipe não encontrada."
        )

    # Dono da equipe não pode simplesmente sair sem passar a liderança
    if user_id == team.ownerId:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O dono da equipe não pode sair sem antes transferir o cargo de owner para outro integrante."
        )

    # Verifica permissão do solicitante caso token informado
    caller_id = await resolve_current_user_id(token) if token else None
    if caller_id and caller_id != team.ownerId and caller_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para remover este integrante da equipe."
        )

    try:
        updated_team = await db.team.update(
            where={"id": team_id},
            data={"members": {"disconnect": [{"id": user_id}]}},
            include={
                "owner": True,
                "members": True,
                "project": True,
                "channels": True
            }
        )
        return format_team_response(updated_team)
    except Exception as e:
        logger.error(f"Erro ao remover membro da equipe {team_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao remover integrante: {str(e)}"
        )

@router.post("/{team_id}/transfer-ownership", response_model=TeamResponse)
async def transfer_team_ownership(
    team_id: str,
    data: TransferOwnershipRequest,
    token: Optional[str] = Depends(get_optional_token)
):
    """
    Transfere o cargo de owner da equipe para outro integrante.
    Apenas o atual owner da equipe tem permissão.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Banco de dados não conectado."
        )

    team = await db.team.find_unique(
        where={"id": team_id},
        include={"members": True, "owner": True}
    )
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipe não encontrada."
        )

    caller_id = await resolve_current_user_id(token) if token else None
    if caller_id and caller_id != team.ownerId:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas o atual dono da equipe pode transferir a liderança."
        )

    if data.new_owner_id == team.ownerId:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O usuário selecionado já é o dono desta equipe."
        )

    await ensure_user_in_prisma(data.new_owner_id)

    try:
        # Garante que o novo owner e o antigo owner continuem nos membros da equipe
        updated_team = await db.team.update(
            where={"id": team_id},
            data={
                "owner": {"connect": {"id": data.new_owner_id}},
                "members": {
                    "connect": [
                        {"id": data.new_owner_id},
                        {"id": team.ownerId}
                    ]
                }
            },
            include={
                "owner": True,
                "members": True,
                "project": True,
                "channels": True
            }
        )
        return format_team_response(updated_team)
    except Exception as e:
        logger.error(f"Erro ao transferir liderança da equipe {team_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao transferir cargo de owner: {str(e)}"
        )

@router.get("", response_model=List[TeamResponse])
@router.get("/", response_model=List[TeamResponse])
async def list_teams(
    owner_id: Optional[str] = Query(None, description="Filtrar por ID do dono"),
    member_id: Optional[str] = Query(None, description="Filtrar por ID do membro"),
    search: Optional[str] = Query(None, description="Buscar por nome da equipe")
):
    """
    Lista equipes com suporte a filtros de proprietário, membro ou busca textual.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Banco de dados não conectado."
        )

    where_clause = {}

    if owner_id:
        where_clause["ownerId"] = owner_id

    if member_id:
        where_clause["members"] = {"some": {"id": member_id}}

    if search:
        where_clause["name"] = {"contains": search, "mode": "insensitive"}

    try:
        teams = await db.team.find_many(
            where=where_clause,
            include={"owner": True, "members": True, "project": True},
            order={"createdAt": "desc"}
        )

        return [format_team_response(t) for t in teams]

    except Exception as e:
        logger.error(f"Erro ao listar equipes: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao listar equipes: {str(e)}"
        )

@router.get("/{team_id}", response_model=TeamResponse)
async def get_team_by_id(team_id: str):
    """
    Retorna os detalhes de uma equipe específica.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Banco de dados não conectado."
        )

    team = await db.team.find_unique(
        where={"id": team_id},
        include={"owner": True, "members": True, "project": True}
    )

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipe não encontrada."
        )

    return format_team_response(team)

@router.delete("/{team_id}", response_model=MessageResponse)
async def delete_team(team_id: str):
    """
    Exclui uma equipe.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Banco de dados não conectado."
        )

    existing = await db.team.find_unique(where={"id": team_id})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipe não encontrada."
        )

    try:
        await db.team.delete(where={"id": team_id})
        return MessageResponse(message="Equipe excluída com sucesso.")
    except Exception as e:
        logger.error(f"Erro ao excluir equipe {team_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao excluir equipe: {str(e)}"
        )

@router.post("/{team_id}/join", response_model=TeamResponse)
async def join_team(
    team_id: str,
    user_id: Optional[str] = Body(None, embed=True),
    token: Optional[str] = Depends(get_optional_token)
):
    """
    Permite que um usuário entre em uma equipe pública.
    Equipes privadas só aceitam membros mediante adição direta pelo dono.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Banco de dados não conectado."
        )

    actual_user_id = user_id
    if not actual_user_id and token:
        actual_user_id = await resolve_current_user_id(token)

    if not actual_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticação necessária para entrar na equipe."
        )

    team = await db.team.find_unique(
        where={"id": team_id},
        include={"owner": True, "members": True, "project": True}
    )

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipe não encontrada."
        )

    # Se a equipe for privada, bloqueia entrada espontânea
    if team.isPrivate:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta equipe é privada. Só é possível ingressar mediante adição pelo proprietário da equipe."
        )

    # Verifica se já faz parte
    existing_members = [m.id for m in getattr(team, "members", [])]
    if actual_user_id in existing_members or actual_user_id == team.ownerId:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Você já faz parte desta equipe."
        )

    await ensure_user_in_prisma(actual_user_id)

    try:
        updated = await db.team.update(
            where={"id": team_id},
            data={
                "members": {"connect": [{"id": actual_user_id}]}
            },
            include={"owner": True, "members": True, "project": True}
        )
        return format_team_response(updated)
    except Exception as e:
        logger.error(f"Erro ao ingressar na equipe {team_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao ingressar na equipe: {str(e)}"
        )


# ==========================================
# ENDPOINTS DO CHAT DA EQUIPE (ESTILO SLACK)
# ==========================================

@router.get("/{team_id}/messages", response_model=List[TeamMessageResponse])
async def list_team_messages(
    team_id: str,
    channel: Optional[str] = Query("geral", description="Canal temático da equipe"),
    limit: Optional[int] = Query(100, ge=1, le=500, description="Limite de mensagens"),
    token: Optional[str] = Depends(get_optional_token)
):
    """
    Lista o histórico de mensagens de um canal específico da equipe, ordenadas cronologicamente.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Banco de dados não conectado."
        )

    team = await db.team.find_unique(where={"id": team_id})
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipe não encontrada."
        )

    where_filter = {"teamId": team_id}
    if channel:
        where_filter["channel"] = channel.strip().lower()

    try:
        messages = await db.teammessage.find_many(
            where=where_filter,
            include={"user": True},
            order={"createdAt": "asc"},
            take=limit
        )
        return [format_message_response(m, team_owner_id=team.ownerId) for m in messages]
    except Exception as e:
        logger.error(f"Erro ao listar mensagens da equipe {team_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao listar mensagens: {str(e)}"
        )


@router.post("/{team_id}/messages", response_model=TeamMessageResponse, status_code=status.HTTP_201_CREATED)
async def send_team_message(
    team_id: str,
    data: TeamMessageCreate,
    token: Optional[str] = Depends(get_optional_token)
):
    """
    Envia uma nova mensagem para a equipe no canal especificado.
    Suporta tipos: 'chat', 'progress' (andamento), 'impediment' (bloqueio), 'milestone' (entrega).
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Banco de dados não conectado."
        )

    team = await db.team.find_unique(
        where={"id": team_id},
        include={"members": True}
    )
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipe não encontrada."
        )

    sender_id = data.user_id
    if not sender_id and token:
        sender_id = await resolve_current_user_id(token)

    if not sender_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticação necessária para enviar mensagens na equipe."
        )

    await ensure_user_in_prisma(sender_id)

    # Se a equipe for privada, restringe aos membros ou ao dono
    if team.isPrivate:
        allowed_ids = set([team.ownerId] + [m.id for m in getattr(team, "members", [])])
        if sender_id not in allowed_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você precisa ser membro desta equipe privada para enviar mensagens."
            )

    channel_name = (data.channel or "geral").strip().lower()
    msg_type = (data.type or "chat").strip().lower()

    try:
        new_msg = await db.teammessage.create(
            data={
                "content": data.content.strip(),
                "type": msg_type,
                "channel": channel_name,
                "team": {"connect": {"id": team_id}},
                "user": {"connect": {"id": sender_id}}
            },
            include={"user": True}
        )

        # Dispara notificações para os demais membros e owner da equipe
        try:
            await notify_team_members_new_message(
                team_id=team_id,
                sender_id=sender_id,
                channel=channel_name,
                message_content=new_msg.content
            )
        except Exception as notif_err:
            logger.warning(f"Falha não-bloqueante ao gerar notificações para a equipe {team_id}: {notif_err}")

        return format_message_response(new_msg, team_owner_id=team.ownerId)
    except Exception as e:
        logger.error(f"Erro ao registrar mensagem na equipe {team_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao enviar mensagem: {str(e)}"
        )


@router.delete("/{team_id}/messages/{message_id}", response_model=MessageResponse)
async def delete_team_message(
    team_id: str,
    message_id: str,
    user_id: Optional[str] = Query(None, description="ID do solicitante caso não enviado via token"),
    token: Optional[str] = Depends(get_optional_token)
):
    """
    Remove uma mensagem. Apenas o autor da mensagem ou o dono da equipe tem permissão.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Banco de dados não conectado."
        )

    caller_id = user_id
    if not caller_id and token:
        caller_id = await resolve_current_user_id(token)

    msg = await db.teammessage.find_unique(
        where={"id": message_id},
        include={"team": True}
    )
    if not msg or msg.teamId != team_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mensagem não encontrada."
        )

    if caller_id and caller_id != msg.userId and caller_id != msg.team.ownerId:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não possui permissão para excluir esta mensagem."
        )

    try:
        await db.teammessage.delete(where={"id": message_id})
        return MessageResponse(message="Mensagem excluída com sucesso.")
    except Exception as e:
        logger.error(f"Erro ao excluir mensagem {message_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao excluir mensagem: {str(e)}"
        )


# ==========================================
# ENDPOINTS DE CANAIS DA EQUIPE
# ==========================================

@router.get("/{team_id}/channels", response_model=List[ChannelResponse])
async def list_team_channels(
    team_id: str,
    token: Optional[str] = Depends(get_optional_token)
):
    """
    Lista os canais da equipe. Se a equipe ainda não possuir canais, cria o canal 'geral' por padrão.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Banco de dados não conectado."
        )

    team = await db.team.find_unique(where={"id": team_id})
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipe não encontrada."
        )

    channels = await db.teamchannel.find_many(
        where={"teamId": team_id},
        order={"createdAt": "asc"}
    )

    # Garante canal 'geral' caso a equipe não possua nenhum canal ainda
    if not channels:
        default_ch = await db.teamchannel.create(
            data={
                "team": {"connect": {"id": team_id}},
                "name": "geral",
                "description": "Canal geral de comunicação da equipe",
                "isDefault": True
            }
        )
        channels = [default_ch]

    return [
        ChannelResponse(
            id=c.id,
            team_id=c.teamId,
            name=c.name,
            description=c.description,
            is_default=c.isDefault,
            created_at=str(c.createdAt) if hasattr(c, "createdAt") else None
        )
        for c in channels
    ]


@router.post("/{team_id}/channels", response_model=ChannelResponse, status_code=status.HTTP_201_CREATED)
async def create_team_channel(
    team_id: str,
    data: ChannelCreate,
    token: Optional[str] = Depends(get_optional_token)
):
    """
    Adiciona um novo canal à equipe.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Banco de dados não conectado."
        )

    team = await db.team.find_unique(where={"id": team_id})
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipe não encontrada."
        )

    clean_name = data.name.strip().lower().replace("#", "").replace(" ", "-")
    if not clean_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O nome do canal não pode ser vazio."
        )

    # Verifica se já existe um canal com esse nome
    existing = await db.teamchannel.find_unique(
        where={"teamId_name": {"teamId": team_id, "name": clean_name}}
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Já existe um canal com o nome #{clean_name} nesta equipe."
        )

    try:
        new_ch = await db.teamchannel.create(
            data={
                "team": {"connect": {"id": team_id}},
                "name": clean_name,
                "description": data.description.strip() if data.description else None,
                "isDefault": False
            }
        )
        return ChannelResponse(
            id=new_ch.id,
            team_id=new_ch.teamId,
            name=new_ch.name,
            description=new_ch.description,
            is_default=new_ch.isDefault,
            created_at=str(new_ch.createdAt) if hasattr(new_ch, "createdAt") else None
        )
    except Exception as e:
        logger.error(f"Erro ao criar canal: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao criar canal: {str(e)}"
        )

