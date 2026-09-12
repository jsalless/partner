from pydantic import BaseModel, Field
from typing import Optional

class NotificationCreate(BaseModel):
    user_id: str = Field(..., description="ID do usuário destinatário")
    title: str = Field(..., description="Título da notificação")
    message: str = Field(..., description="Conteúdo da notificação")
    type: str = Field(default="team_message", description="Tipo da notificação (ex: team_message)")
    link: Optional[str] = Field(None, description="Link de redirecionamento ao clicar")

class NotificationUpdate(BaseModel):
    read: Optional[bool] = Field(None, description="Status de leitura da notificação")

class NotificationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    type: str
    link: Optional[str] = None
    read: bool
    created_at: str

    class Config:
        from_attributes = True

class UnreadCountResponse(BaseModel):
    unread_count: int
