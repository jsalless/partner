from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import ALLOWED_ORIGINS, BACKEND_PORT
from app.routes.auth import router as auth_router
from app.routes.users import router as users_router
from app.routes.teams import router as teams_router
from app.routes.projects import router as projects_router
from app.routes.notifications import router as notifications_router
from app.database import connect_prisma, disconnect_prisma, ensure_prisma_connected

logger = logging.getLogger("uvicorn")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Conecta o Prisma Client na inicialização
    try:
        await connect_prisma()
    except Exception as e:
        logger.warning(f"Aviso: Não foi possível conectar o Prisma na inicialização: {e}")
        logger.warning("Lembre-se de substituir [YOUR-PASSWORD] no backend/.env pela senha real do banco de dados no Supabase.")
    yield
    # Desconecta o Prisma Client no encerramento
    try:
        await disconnect_prisma()
    except Exception:
        pass

app = FastAPI(
    title="Partner API",
    description="Backend em Python com FastAPI integrado ao Supabase para autenticação e banco de dados via Prisma ORM.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Middleware para garantir conexão ativa do Prisma sob demanda
@app.middleware("http")
async def ensure_db_connection(request, call_next):
    if request.url.path.startswith("/api"):
        try:
            await ensure_prisma_connected()
        except Exception as e:
            logger.error(f"Erro ao assegurar conexão Prisma na requisição {request.url.path}: {e}")
    response = await call_next(request)
    return response

# Configuração de CORS para permitir requisições do frontend
origins = set(ALLOWED_ORIGINS + [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001"
])

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(origins),
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclusão dos roteadores principais da API
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(teams_router)
app.include_router(projects_router)
app.include_router(notifications_router)

@app.get("/", tags=["Geral"])
async def root():
    return {
        "app": "Partner API",
        "backend": "Python / FastAPI",
        "database": "Supabase",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=BACKEND_PORT, reload=True)
