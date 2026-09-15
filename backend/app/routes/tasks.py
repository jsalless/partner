import logging
from fastapi import APIRouter, HTTPException, status
from app.database import db
from app.schemas.tasks import TaskStatusUpdate, TaskUpdate

logger = logging.getLogger("uvicorn")

router = APIRouter(prefix="/api/tasks", tags=["Tarefas"])

@router.put("/{task_id}")
async def update_task(task_id: str, data: TaskUpdate):
    """
    Atualiza todos os dados editáveis de uma tarefa.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Banco de dados não conectado."
        )
        
    try:
        updated = await db.task.update(
            where={"id": task_id},
            data={
                "title": data.title,
                "description": data.description,
                "priority": data.priority,
                "status": data.status,
                "due_date": data.due_date,
                "assigneeId": data.assignee_id
            },
            include={"assignee": True}
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Tarefa não encontrada.")
            
        return {
            "id": updated.id,
            "kanban_id": updated.kanban_id,
            "title": updated.title,
            "description": updated.description,
            "status": updated.status,
            "priority": updated.priority,
            "due_date": str(updated.due_date) if updated.due_date else None,
            "assignee_id": updated.assigneeId,
            "assignee": {
                "id": updated.assignee.id,
                "email": updated.assignee.email,
                "first_name": updated.assignee.firstName,
                "last_name": updated.assignee.lastName,
                "full_name": f"{updated.assignee.firstName} {updated.assignee.lastName}".strip(),
                "avatar_url": updated.assignee.avatarUrl or updated.assignee.defaultAvatar
            } if updated.assignee else None,
            "created_at": str(updated.createdAt) if updated.createdAt else None,
            "updated_at": str(updated.updatedAt) if updated.updatedAt else None
        }
    except Exception as e:
        logger.error(f"Erro ao atualizar tarefa {task_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao atualizar tarefa: {str(e)}"
        )

@router.patch("/{task_id}/status")
async def update_task_status(task_id: str, data: TaskStatusUpdate):
    """
    Atualiza apenas o status de uma tarefa.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Banco de dados não conectado."
        )
        
    try:
        updated = await db.task.update(
            where={"id": task_id},
            data={"status": data.status}
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Tarefa não encontrada.")
            
        return {"message": "Status atualizado com sucesso."}
    except Exception as e:
        logger.error(f"Erro ao atualizar status da tarefa {task_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao atualizar status: {str(e)}"
        )

@router.delete("/{task_id}")
async def delete_task(task_id: str):
    """
    Exclui uma tarefa.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Banco de dados não conectado."
        )
        
    try:
        await db.task.delete(where={"id": task_id})
        return {"message": "Tarefa excluída com sucesso."}
    except Exception as e:
        logger.error(f"Erro ao excluir tarefa {task_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao excluir tarefa: {str(e)}"
        )
