from typing import Optional
from pydantic import BaseModel, Field

class MessageSenderInfo(BaseModel):
    id: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = "cliente"
    avatar_url: Optional[str] = None

class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000, description="Conteúdo textual da mensagem")
    type: Optional[str] = Field("chat", description="Tipo da mensagem: chat, progress, impediment, milestone")
    channel: Optional[str] = Field("geral", description="Canal da equipe (ex: geral, andamento-do-projeto, impedimentos-bloqueios, entregas-marcos)")
    user_id: Optional[str] = Field(None, description="ID do usuário remetente caso não enviado via token")

class MessageResponse(BaseModel):
    id: str
    team_id: str
    user_id: str
    content: str
    type: str = "chat"
    channel: str = "geral"
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    sender: Optional[MessageSenderInfo] = None

TeamMessageResponse = MessageResponse
TeamMessageCreate = MessageCreate

class ChannelCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50, description="Nome do canal (ex: geral, avisos, sprint)")
    description: Optional[str] = Field(None, max_length=200, description="Descrição do objetivo do canal")

class ChannelResponse(BaseModel):
    id: str
    team_id: str
    name: str
    description: Optional[str] = None
    is_default: bool = False
    created_at: Optional[str] = None
