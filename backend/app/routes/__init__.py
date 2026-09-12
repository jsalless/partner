from app.routes.auth import router as auth_router
from app.routes.users import router as users_router
from app.routes.teams import router as teams_router
from app.routes.projects import router as projects_router
from app.routes.notifications import router as notifications_router

__all__ = ["auth_router", "users_router", "teams_router", "projects_router", "notifications_router"]
