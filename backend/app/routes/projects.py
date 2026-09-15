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
        projects = await db.project.find_many(
            order={"name": "asc"},
            include={"teams": True}
        )
        return [
            ProjectResponse(
                id=p.id,
                name=p.name,
                description=p.description,
                created_at=str(p.createdAt) if hasattr(p, "createdAt") else None,
                teams_count=len(p.teams) if p.teams else 0
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
            created_at=str(project.createdAt) if hasattr(project, "createdAt") else None,
            teams_count=0
        )
    except Exception as e:
        logger.error(f"Erro ao criar projeto: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao criar projeto: {str(e)}"
        )

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str):
    """
    Retorna os detalhes de um projeto específico.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Banco de dados não conectado."
        )
    project = await db.project.find_unique(
        where={"id": project_id},
        include={"teams": True}
    )
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Projeto não encontrado.")
    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        created_at=str(project.createdAt) if hasattr(project, "createdAt") else None,
        teams_count=len(project.teams) if project.teams else 0
    )

@router.get("/{project_id}/kanban")
async def get_project_kanban(project_id: str):
    """
    Retorna o kanban de um projeto junto com suas tarefas.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Banco de dados não conectado."
        )
    
    project = await db.project.find_unique(where={"id": project_id})
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Projeto não encontrado.")
        
    kanban = await db.kanbans.find_unique(
        where={"project_id": project_id},
        include={"tasks": {"include": {"assignee": True}}}
    )
    if not kanban:
        return {"id": None, "project_id": project_id, "tasks": []}
        
    tasks = []
    if kanban.tasks:
        for t in kanban.tasks:
            tasks.append({
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
        
    return {
        "id": kanban.id,
        "project_id": kanban.project_id,
        "created_at": str(kanban.created_at) if kanban.created_at else None,
        "updated_at": str(kanban.updated_at) if kanban.updated_at else None,
        "tasks": tasks
    }

@router.get("/{project_id}/users")
async def get_project_users(project_id: str):
    """
    Retorna os usuários associados ao projeto (através das equipes).
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Banco de dados não conectado."
        )
        
    teams = await db.team.find_many(
        where={"projectId": project_id},
        include={"members": True}
    )
    users_dict = {}
    if teams:
        for team in teams:
            if team.members:
                for member in team.members:
                    if member.id not in users_dict:
                        users_dict[member.id] = {
                            "id": member.id,
                            "email": member.email,
                            "first_name": member.firstName,
                            "last_name": member.lastName,
                            "full_name": f"{member.firstName} {member.lastName}".strip(),
                            "avatar_url": member.avatarUrl or member.defaultAvatar,
                            "role": member.role
                        }
                
    return list(users_dict.values())
