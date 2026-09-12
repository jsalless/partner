import logging
from typing import List
from fastapi import APIRouter, HTTPException, status
from app.database import db
from app.schemas.projects import ProjectCreate, ProjectResponse

logger = logging.getLogger("uvicorn")

router = APIRouter(prefix="/api/projects", tags=["Projetos"])

@router.get("", response_model=List[ProjectResponse])
@router.get("/", response_model=List[ProjectResponse])
async def list_projects():
    """
    Lista todos os projetos cadastrados.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Banco de dados não conectado."
        )
    try:
        projects = await db.project.find_many(order={"name": "asc"})
        return [
            ProjectResponse(
                id=p.id,
                name=p.name,
                description=p.description,
                created_at=str(p.createdAt) if hasattr(p, "createdAt") else None
            )
            for p in projects
        ]
    except Exception as e:
        logger.error(f"Erro ao listar projetos: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao listar projetos: {str(e)}"
        )

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(data: ProjectCreate):
    """
    Cria um novo projeto.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Banco de dados não conectado."
        )
    try:
        project = await db.project.create(
            data={
                "name": data.name.strip(),
                "description": data.description.strip() if data.description else None
            }
        )
        return ProjectResponse(
            id=project.id,
            name=project.name,
            description=project.description,
            created_at=str(project.createdAt) if hasattr(project, "createdAt") else None
        )
    except Exception as e:
        logger.error(f"Erro ao criar projeto: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao criar projeto: {str(e)}"
        )
