from typing import Optional, Any
from pydantic import BaseModel, EmailStr, Field

class RegisterRequest(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, description="Nome do usuário")
    last_name: Optional[str] = Field(None, min_length=1, description="Sobrenome do usuário")
    email: EmailStr = Field(..., description="E-mail válido")
    password: str = Field(..., min_length=6, description="Senha com no mínimo 6 caracteres")
    confirm_password: Optional[str] = Field(None, min_length=6, description="Confirmação de senha")

class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="E-mail de login")
    password: str = Field(..., description="Senha do usuário")

class UserCreateRequest(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, description="Nome do usuário")
    last_name: Optional[str] = Field(None, min_length=1, description="Sobrenome do usuário")
    name: Optional[str] = Field(None, description="Nome completo do usuário")
    email: EmailStr = Field(..., description="E-mail do usuário")
    password: str = Field(..., min_length=6, description="Senha do usuário")
    role: Optional[str] = Field("cliente", description="Papel do usuário (ex: admin, dev, cliente)")
    email_confirm: bool = Field(True, description="Confirmar email automaticamente")

class UserResponse(BaseModel):
    id: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: Optional[str] = "cliente"
    created_at: Optional[str] = None
    app_metadata: Optional[dict[str, Any]] = None
    user_metadata: Optional[dict[str, Any]] = None

class AuthResponse(BaseModel):
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    user: UserResponse
    message: Optional[str] = None

class MessageResponse(BaseModel):
    message: str
    success: bool = True

class UserUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=6, description="Nova senha (opcional)")
    avatar_url: Optional[str] = None
