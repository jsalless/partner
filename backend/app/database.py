import logging
import httpx
from supabase import create_client, Client, ClientOptions
from app.config import SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY

logger = logging.getLogger("uvicorn")

_supabase_client: Client | None = None
_supabase_admin_client: Client | None = None

def _create_httpx_transport():
    return httpx.Client(
        timeout=30.0,
        limits=httpx.Limits(max_keepalive_connections=5, max_connections=20, keepalive_expiry=10.0),
    )

def get_supabase_client(fresh: bool = False) -> Client:
    """Retorna o cliente Supabase para operações padrão com retry e timeout otimizado."""
    global _supabase_client
    if _supabase_client is None or fresh:
        key = SUPABASE_PUBLISHABLE_KEY or SUPABASE_SECRET_KEY
        if not SUPABASE_URL or not key:
            raise ValueError("SUPABASE_URL ou chaves não configuradas.")
        _supabase_client = create_client(
            SUPABASE_URL,
            key,
            options=ClientOptions(httpx_client=_create_httpx_transport())
        )
        if hasattr(_supabase_client, "auth"):
            _supabase_client.auth._network_retries = 2
    return _supabase_client

def get_supabase_admin_client(fresh: bool = False) -> Client:
    """Retorna o cliente Supabase administrativo com service_role/secret key."""
    global _supabase_admin_client
    if _supabase_admin_client is None or fresh:
        key = SUPABASE_SECRET_KEY or SUPABASE_PUBLISHABLE_KEY
        if not SUPABASE_URL or not key:
            raise ValueError("SUPABASE_URL ou SUPABASE_SECRET_KEY não configurados.")
        _supabase_admin_client = create_client(
            SUPABASE_URL,
            key,
            options=ClientOptions(httpx_client=_create_httpx_transport())
        )
        if hasattr(_supabase_admin_client, "auth"):
            _supabase_admin_client.auth._network_retries = 2
    return _supabase_admin_client

# Instância global do Prisma Client Python
try:
    from prisma import Prisma
    db = Prisma(auto_register=True)
except Exception:
    db = None

async def connect_prisma():
    """Conecta o Prisma Client ao PostgreSQL do Supabase."""
    global db
    if db is None:
        from prisma import Prisma
        db = Prisma(auto_register=True)
    if not db.is_connected():
        await db.connect()
        logger.info("Prisma Client conectado ao Supabase PostgreSQL com sucesso.")

async def ensure_prisma_connected():
    """Garante que o Prisma Client esteja conectado, reconectando sob demanda se necessário."""
    global db
    if db is None:
        from prisma import Prisma
        db = Prisma(auto_register=True)
    if not db.is_connected():
        await db.connect()
        logger.info("Prisma Client reconectado sob demanda com sucesso.")
    return db

async def disconnect_prisma():
    """Desconecta o Prisma Client."""
    global db
    if db is not None and db.is_connected():
        await db.disconnect()
        logger.info("Prisma Client desconectado.")
