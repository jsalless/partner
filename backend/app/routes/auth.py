import logging
from fastapi import APIRouter, HTTPException, Depends, Header, status
from typing import Optional
from app.database import get_supabase_client, get_supabase_admin_client, db
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    AuthResponse,
    UserResponse,
    MessageResponse
)

logger = logging.getLogger("uvicorn")

router = APIRouter(prefix="/api/auth", tags=["Autenticação"])

def get_current_token(authorization: Optional[str] = Header(None)) -> str:
    """Extrai e valida o token Bearer do cabeçalho de autorização."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Cabeçalho de autorização ausente."
        )
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Formato de token inválido. Use 'Bearer <token>'."
        )
    return parts[1]

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest):
    """
    Registra um novo usuário no Supabase Auth e salva no banco de dados PostgreSQL via Prisma.
    """
    # Validação de confirmação de senha se fornecida
    if data.confirm_password is not None and data.password != data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A confirmação de senha não confere com a senha informada."
        )

    first_name = (data.first_name or "").strip()
    last_name = (data.last_name or "").strip()

    name_val = getattr(data, "name", None)
    if not first_name and name_val:
        parts = str(name_val).strip().split(" ", 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else ""

    if not first_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O campo nome é obrigatório."
        )

    full_name = f"{first_name} {last_name}".strip() if last_name else first_name

    admin_client = get_supabase_admin_client()
    client = get_supabase_client()

    try:
        # Cria o usuário via Admin para auto-confirmar o e-mail no Supabase Auth
        user_attributes = {
            "email": data.email,
            "password": data.password,
            "email_confirm": True,
            "user_metadata": {
                "first_name": first_name,
                "last_name": last_name,
                "full_name": full_name
            },
            "app_metadata": {
                "role": "cliente"
            }
        }
        
        created_user_res = admin_client.auth.admin.create_user(user_attributes)
        user = created_user_res.user

        # Salva o usuário na tabela 'users' do banco PostgreSQL via Prisma
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
                            "role": "cliente"
                        },
                        "update": {
                            "firstName": first_name,
                            "lastName": last_name or ""
                        }
                    }
                )
                logger.info(f"Usuário {data.email} persistido no Prisma (tabela users) com sucesso.")
            except Exception as prisma_err:
                logger.error(f"Erro ao salvar usuário no Prisma: {prisma_err}")

        # Tenta autenticar imediatamente para retornar o token de sessão
        access_token = None
        refresh_token = None
        try:
            sign_in_res = client.auth.sign_in_with_password({
                "email": data.email,
                "password": data.password
            })
            if sign_in_res.session:
                access_token = sign_in_res.session.access_token
                refresh_token = sign_in_res.session.refresh_token
        except Exception:
            pass

        role = (user.app_metadata or {}).get("role", "cliente")

        return AuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse(
                id=user.id,
                email=user.email or data.email,
                first_name=first_name,
                last_name=last_name,
                full_name=full_name,
                role=role,
                created_at=str(user.created_at) if hasattr(user, "created_at") else None,
                user_metadata=user.user_metadata,
                app_metadata=user.app_metadata
            ),
            message="Usuário cadastrado com sucesso!"
        )

    except Exception as e:
        error_msg = str(e)
        if "User already registered" in error_msg or "already exists" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Este e-mail já está cadastrado no sistema."
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao registrar usuário: {error_msg}"
        )

@router.post("/login", response_model=AuthResponse)
async def login(data: LoginRequest):
    """
    Autentica o usuário com email e senha no Supabase Auth.
    """
    client = get_supabase_client()

    try:
        res = client.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password
        })

        if not res.session or not res.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciais inválidas ou e-mail não confirmado."
            )

        user = res.user
        full_name = (user.user_metadata or {}).get("full_name")
        role = (user.app_metadata or {}).get("role", "cliente")

        return AuthResponse(
            access_token=res.session.access_token,
            refresh_token=res.session.refresh_token,
            user=UserResponse(
                id=user.id,
                email=user.email or data.email,
                full_name=full_name,
                role=role,
                created_at=str(user.created_at) if hasattr(user, "created_at") else None,
                user_metadata=user.user_metadata,
                app_metadata=user.app_metadata
            ),
            message="Login realizado com sucesso!"
        )

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "Invalid login credentials" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="E-mail ou senha incorretos."
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao efetuar login: {error_msg}"
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user(token: str = Depends(get_current_token)):
    """
    Retorna os dados do usuário autenticado validando o token JWT no Supabase Auth.
    """
    client = get_supabase_client()

    try:
        user_res = client.auth.get_user(token)
        user = user_res.user
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Sessão expirada ou inválida."
            )

        full_name = (user.user_metadata or {}).get("full_name")
        role = (user.app_metadata or {}).get("role", "cliente")

        return UserResponse(
            id=user.id,
            email=user.email or "",
            full_name=full_name,
            role=role,
            created_at=str(user.created_at) if hasattr(user, "created_at") else None,
            user_metadata=user.user_metadata,
            app_metadata=user.app_metadata
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token inválido: {str(e)}"
        )

@router.post("/logout", response_model=MessageResponse)
async def logout(token: str = Depends(get_current_token)):
    """
    Encerra a sessão ativa do usuário no Supabase.
    """
    client = get_supabase_client()
    try:
        client.auth.sign_out(token)
        return MessageResponse(message="Sessão encerrada com sucesso.")
    except Exception as e:
        return MessageResponse(message="Logout concluído.", success=True)

@router.get("/health", response_model=dict)
async def health_check():
    """
    Verifica a saúde da API e a conectividade com o Supabase.
    """
    admin_client = get_supabase_admin_client()
    try:
        # Testa chamada leve de verificação
        users = admin_client.auth.admin.list_users()
        return {
            "status": "healthy",
            "supabase_connection": "connected",
            "total_users": len(users)
        }
    except Exception as e:
        return {
            "status": "degraded",
            "supabase_connection": f"error: {str(e)}"
        }
