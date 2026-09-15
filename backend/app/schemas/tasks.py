from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field

class TaskBase(BaseModel):
    title: str = Field(..., description="Título da tarefa")
    description: Optional[str] = Field(None, description="Descrição da tarefa")
    status: str = Field("todo", description="Status (ex: todo, in_progress, done)")
    priority: str = Field("medium", description="Prioridade (ex: low, medium, high)")
    due_date: Optional[datetime] = Field(None, description="Data de vencimento")
    assignee_id: Optional[str] = Field(None, description="ID do usuário responsável")

class AssigneeResponse(BaseModel):
    id: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

class TaskCreate(TaskBase):
    kanban_id: str = Field(..., description="ID do kanban")

class TaskResponse(TaskBase):
    id: str
    kanban_id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    assignee: Optional[AssigneeResponse] = None

class KanbanResponse(BaseModel):
    id: str
    project_id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    tasks: List[TaskResponse] = []

class TaskStatusUpdate(BaseModel):
    status: str

class TaskUpdate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str
    status: str
    due_date: Optional[datetime] = None
    assignee_id: Optional[str] = None
