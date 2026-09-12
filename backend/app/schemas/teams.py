from typing import Optional, List, Any
from pydantic import BaseModel, Field

class TeamMemberInfo(BaseModel):
    id: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = "dev"
    avatar_url: Optional[str] = None

class TeamCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Nome da equipe")
    description: Optional[str] = Field(None, description="Descrição ou objetivo da equipe")
    project_id: str = Field(..., min_length=1, description="ID do projeto associado (obrigatório)")
    owner_id: Optional[str] = Field(None, description="ID do usuário proprietário da equipe")
    is_private: bool = Field(False, description="Indica se a equipe é privada")
    avatar_url: Optional[str] = Field(None, description="URL ou base64 da foto da equipe")
    member_ids: Optional[List[str]] = Field(default_factory=list, description="Lista de IDs dos membros iniciais")

class TeamUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Novo nome da equipe")
    description: Optional[str] = Field(None, description="Nova descrição da equipe")
    project_id: Optional[str] = Field(None, description="ID do projeto associado")
    owner_id: Optional[str] = Field(None, description="Novo proprietário da equipe")
    is_private: Optional[bool] = Field(None, description="Indica se a equipe é privada")
    avatar_url: Optional[str] = Field(None, description="URL ou base64 da foto da equipe")
    member_ids: Optional[List[str]] = Field(None, description="Lista completa atualizada de IDs dos membros")

class ProjectInfo(BaseModel):
    id: str
    name: str
    description: Optional[str] = None

class TeamResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    owner_id: str
    owner: Optional[TeamMemberInfo] = None
    project_id: Optional[str] = None
    project: Optional[ProjectInfo] = None
    is_private: bool = False
    avatar_url: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    members: List[TeamMemberInfo] = Field(default_factory=list)
