import logging
from fastapi import APIRouter, HTTPException, status
from typing import List
from app.database import get_supabase_admin_client, db
from app.schemas.auth import (
    UserCreateRequest,
    UserUpdateRequest,
    UserResponse,
    MessageResponse
)

logger = logging.getLogger("uvicorn")

router = APIRouter(prefix="/api/users", tags=["Usuários"])

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(data: UserCreateRequest):
    """
    Rota dedicada para criação de usuário no Supabase e no banco PostgreSQL via Prisma.
    Permite definir papel (role), nome, sobrenome e confirmação automática de e-mail.
    """
    first_name = (data.first_name or "").strip()
    last_name = (data.last_name or "").strip()

    if not first_name and data.name:
        parts = data.name.strip().split(" ", 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else ""

    full_name = f"{first_name} {last_name}".strip() if (first_name or last_name) else (data.name or "")

    admin_client = get_supabase_admin_client()

    try:
        user_attributes = {
            "email": data.email,
            "password": data.password,
            "email_confirm": data.email_confirm,
            "user_metadata": {
                "first_name": first_name,
                "last_name": last_name,
                "full_name": full_name
            },
            "app_metadata": {
                "role": data.role or "cliente"
            }
        }

        res = admin_client.auth.admin.create_user(user_attributes)
        user = res.user

        # Salva ou atualiza no Prisma
        if db is not None:
            try:
                await db.user.upsert(
                    where={"email": data.email},
                    data={
                        "create": {
                            "id": user.id,
                            "email": data.email,
                            "firstName": first_name,
                            "lastName": last_name or "",
                            "role": data.role or "cliente"
                        },
                        "update": {
                            "firstName": first_name,
                            "lastName": last_name or "",
                            "role": data.role or "cliente"
                        }
                    }
                )
            except Exception as prisma_err:
                logger.error(f"Erro ao salvar usuário no Prisma: {prisma_err}")

        role = (user.app_metadata or {}).get("role", data.role or "cliente")

        return UserResponse(
            id=user.id,
            email=user.email or data.email,
            first_name=first_name,
            last_name=last_name,
            full_name=full_name,
            role=role,
            created_at=str(user.created_at) if hasattr(user, "created_at") else None,
            user_metadata=user.user_metadata,
            app_metadata=user.app_metadata
        )

    except Exception as e:
        error_msg = str(e)
        if "already registered" in error_msg or "already exists" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Já existe um usuário cadastrado com este e-mail."
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao criar usuário: {error_msg}"
        )

@router.get("", response_model=List[UserResponse])
@router.get("/", response_model=List[UserResponse])
async def list_users():
    """
    Lista os usuários cadastrados no Supabase Auth.
    """
    admin_client = get_supabase_admin_client()

    try:
        users = admin_client.auth.admin.list_users()
        result = []
        for u in users:
            meta = u.user_metadata or {}
            first_name = meta.get("first_name")
            last_name = meta.get("last_name")
            full_name = meta.get("full_name") or (f"{first_name} {last_name}".strip() if (first_name or last_name) else None)
            role = (u.app_metadata or {}).get("role", "cliente")
            default_avatar = meta.get("default_avatar") or "/Avatar1.svg"
            avatar_url = meta.get("avatar_url") or meta.get("picture") or meta.get("avatar") or default_avatar
            result.append(UserResponse(
                id=u.id,
                email=u.email or "",
                first_name=first_name,
                last_name=last_name,
                full_name=full_name,
                role=role,
                avatar_url=avatar_url,
                default_avatar=default_avatar,
                created_at=str(u.created_at) if hasattr(u, "created_at") else None,
                user_metadata=u.user_metadata,
                app_metadata=u.app_metadata
            ))
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao listar usuários: {str(e)}"
        )

@router.get("/{user_id}", response_model=UserResponse)
async def get_user_by_id(user_id: str):
    """
    Obtém os detalhes de um usuário específico pelo ID (via Prisma PostgreSQL e Supabase Auth).
    """
    admin_client = get_supabase_admin_client()

    db_user = None
    if db is not None:
        try:
            if "@" in user_id:
                db_user = await db.user.find_unique(where={"email": user_id})
            else:
                db_user = await db.user.find_unique(where={"id": user_id})
        except Exception as e:
            logger.warning(f"Erro ao buscar usuário no Prisma: {e}")

    auth_user = None
    target_id = db_user.id if db_user else user_id
    try:
        res = admin_client.auth.admin.get_user_by_id(target_id)
        auth_user = res.user
    except Exception:
        pass

    if not db_user and not auth_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuário '{user_id}' não foi encontrado."
        )

    meta = (auth_user.user_metadata if auth_user else {}) or {}
    first_name = (db_user.firstName if db_user else None) or meta.get("first_name")
    last_name = (db_user.lastName if db_user else None) or meta.get("last_name")
    full_name = meta.get("full_name") or (f"{first_name} {last_name}".strip() if (first_name or last_name) else None)
    email = (db_user.email if db_user else None) or (auth_user.email if auth_user else "")
    role = (db_user.role if db_user else None) or ((auth_user.app_metadata or {}).get("role") if auth_user else "cliente")
    default_avatar = (
        (getattr(db_user, "defaultAvatar", None) if db_user else None) or
        meta.get("default_avatar") or
        "/Avatar1.svg"
    )
    avatar_url = (
        meta.get("avatar_url") or
        meta.get("picture") or
        (getattr(db_user, "avatarUrl", None) if db_user else None) or
        default_avatar
    )
    final_id = db_user.id if db_user else (auth_user.id if auth_user else user_id)
    created_at = str(db_user.createdAt) if db_user else (str(auth_user.created_at) if auth_user and hasattr(auth_user, "created_at") else None)

    return UserResponse(
        id=final_id,
        email=email,
        first_name=first_name,
        last_name=last_name,
        full_name=full_name,
        avatar_url=avatar_url,
        default_avatar=default_avatar,
        role=role or "cliente",
        created_at=created_at,
        user_metadata=meta,
        app_metadata=auth_user.app_metadata if auth_user else None
    )

@router.patch("/{user_id}", response_model=UserResponse)
@router.put("/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, data: UserUpdateRequest):
    """
    Atualiza informações do usuário (nome, sobrenome, email, senha, foto de perfil, avatar default) no Supabase Auth e no Prisma.
    """
    admin_client = get_supabase_admin_client()

    # Busca usuário no Supabase Auth
    try:
        res = admin_client.auth.admin.get_user_by_id(user_id)
        auth_user = res.user
    except Exception:
        auth_user = None

    if not auth_user and db is not None:
        db_user = await db.user.find_unique(where={"id": user_id})
        if not db_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado.")

    # Atualizações para o Supabase Auth
    auth_attrs = {}
    if data.email:
        auth_attrs["email"] = data.email
    if data.password:
        auth_attrs["password"] = data.password

    current_meta = (auth_user.user_metadata if auth_user else {}) or {}
    updated_meta = dict(current_meta)

    if data.first_name is not None:
        updated_meta["first_name"] = data.first_name
    if data.last_name is not None:
        updated_meta["last_name"] = data.last_name
    if data.first_name is not None or data.last_name is not None:
        fn = updated_meta.get("first_name", "")
        ln = updated_meta.get("last_name", "")
        updated_meta["full_name"] = f"{fn} {ln}".strip()

    if data.default_avatar is not None:
        updated_meta["default_avatar"] = data.default_avatar

    if data.avatar_url is not None:
        # Se for um avatar SVG pré-definido, salva como default_avatar também
        if data.avatar_url.lower().startswith("/avatar") and data.avatar_url.lower().endswith(".svg"):
            updated_meta["default_avatar"] = data.avatar_url
        updated_meta["avatar_url"] = data.avatar_url
    elif data.default_avatar is not None:
        # Se avatar_url não foi passado mas default_avatar mudou e usuário não tem upload personalizado
        curr_avatar = updated_meta.get("avatar_url", "")
        if not curr_avatar or (curr_avatar.lower().startswith("/avatar") and curr_avatar.lower().endswith(".svg")):
            updated_meta["avatar_url"] = data.default_avatar

    if updated_meta:
        auth_attrs["user_metadata"] = updated_meta

    if auth_user and auth_attrs:
        try:
            admin_client.auth.admin.update_user_by_id(user_id, auth_attrs)
        except Exception as e:
            logger.error(f"Erro ao atualizar usuário no Supabase Auth: {e}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Atualizações para o Prisma
    if db is not None:
        prisma_data = {}
        if data.first_name is not None:
            prisma_data["firstName"] = data.first_name
        if data.last_name is not None:
            prisma_data["lastName"] = data.last_name
        if data.email:
            prisma_data["email"] = data.email
        if data.avatar_url is not None:
            prisma_data["avatarUrl"] = data.avatar_url
        if data.default_avatar is not None:
            prisma_data["defaultAvatar"] = data.default_avatar
        elif data.avatar_url is not None and data.avatar_url.lower().startswith("/avatar") and data.avatar_url.lower().endswith(".svg"):
            prisma_data["defaultAvatar"] = data.avatar_url

        if prisma_data:
            try:
                await db.user.update(where={"id": user_id}, data=prisma_data)
            except Exception as e:
                logger.warning(f"Erro ao atualizar usuário no Prisma: {e}")

    return await get_user_by_id(user_id)

@router.delete("/{user_id}", response_model=MessageResponse)
async def delete_user(user_id: str):
    """
    Remove um usuário pelo ID.
    """
    admin_client = get_supabase_admin_client()

    try:
        admin_client.auth.admin.delete_user(user_id)
        if db is not None:
            try:
                await db.user.delete(where={"id": user_id})
            except Exception:
                pass
        return MessageResponse(message=f"Usuário {user_id} excluído com sucesso.")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao excluir usuário: {str(e)}"
        )

@router.get("/{user_id}/tasks")
async def get_user_tasks(user_id: str):
    """
    Retorna as tarefas atribuídas ao usuário.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Banco de dados não conectado."
        )
        
    tasks = await db.task.find_many(
        where={"assigneeId": user_id},
        order={"updatedAt": "desc"},
        include={"assignee": True}
    )
    
    result = []
    if tasks:
        for t in tasks:
            result.append({
                "id": t.id,
                "kanban_id": t.kanban_id,
                "title": t.title,
                "description": t.description,
                "status": t.status,
                "priority": t.priority,
                "due_date": str(t.due_date) if t.due_date else None,
                "assignee_id": t.assigneeId,
                "assignee": {
                    "id": t.assignee.id,
                    "email": t.assignee.email,
                    "first_name": t.assignee.firstName,
                    "last_name": t.assignee.lastName,
                    "full_name": f"{t.assignee.firstName} {t.assignee.lastName}".strip(),
                    "avatar_url": t.assignee.avatarUrl or t.assignee.defaultAvatar
                } if t.assignee else None,
                "created_at": str(t.createdAt) if t.createdAt else None,
                "updated_at": str(t.updatedAt) if t.updatedAt else None
            })
    return result

