import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://zmefxqyxzrfaxqulesuq.supabase.co")
SUPABASE_PUBLISHABLE_KEY = os.getenv(
    "SUPABASE_PUBLISHABLE_KEY",
    os.getenv("SUPABASE_KEY", os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", ""))
)
SUPABASE_SECRET_KEY = os.getenv(
    "SUPABASE_SECRET_KEY",
    os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
)
SUPABASE_JWKS_URL = os.getenv("SUPABASE_JWKS_URL", f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json")

BACKEND_PORT = int(os.getenv("BACKEND_PORT", "8000"))
ALLOWED_ORIGINS_STR = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS_STR.split(",") if origin.strip()]

# Remove aspas caso tenham sido coladas no painel do Render/Vercel
for env_key in ["DATABASE_URL", "DIRECT_URL", "SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY"]:
    raw_val = os.environ.get(env_key)
    if raw_val:
        cleaned = raw_val.strip().strip('"').strip("'")
        os.environ[env_key] = cleaned

