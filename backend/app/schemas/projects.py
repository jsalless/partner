from typing import Optional
from pydantic import BaseModel, Field

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Nome do projeto")
    description: Optional[str] = Field(None, description="Descrição do projeto")

class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    created_at: Optional[str] = None
