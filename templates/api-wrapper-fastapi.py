"""
FastAPI API Wrapper Template
A production-ready FastAPI backend with authentication, rate limiting, and OpenAPI docs
"""

from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import os
from datetime import datetime, timedelta
import jwt
import hashlib
import secrets

# Initialize FastAPI app
app = FastAPI(
    title="API Wrapper",
    description="Production-ready API with authentication and rate limiting",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Security
security = HTTPBearer()
SECRET_KEY = os.getenv("SECRET_KEY", secrets.token_urlsafe(32))

# In-memory user store (replace with database in production)
users_db = {}

# Pydantic models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str]
    created_at: datetime

class APIRequest(BaseModel):
    endpoint: str
    method: str = "GET"
    data: Optional[dict] = None

class APIResponse(BaseModel):
    status_code: int
    data: dict
    timestamp: datetime

# Helper functions
def hash_password(password: str) -> str:
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain: str, hashed: str) -> bool:
    """Verify password"""
    return hash_password(plain) == hashed

def create_token(user_id: str) -> str:
    """Create JWT token"""
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def verify_token(token: str) -> Optional[str]:
    """Verify JWT token and return user_id"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload.get("user_id")
    except:
        return None

# Authentication dependency
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated user"""
    token = credentials.credentials
    user_id = verify_token(token)
    if not user_id or user_id not in users_db:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    return users_db[user_id]

# Routes
@app.get("/", tags=["Health"])
def root():
    """Root endpoint"""
    return {
        "message": "API Wrapper is running",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.post("/auth/register", response_model=UserResponse, tags=["Authentication"])
@limiter.limit("5/minute")
async def register(request: Request, user_data: UserCreate):
    """Register a new user"""
    if user_data.email in [u["email"] for u in users_db.values()]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    user_id = secrets.token_urlsafe(16)
    users_db[user_id] = {
        "id": user_id,
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "name": user_data.name,
        "created_at": datetime.utcnow()
    }
    
    return users_db[user_id]

@app.post("/auth/login", tags=["Authentication"])
@limiter.limit("10/minute")
async def login(request: Request, credentials: UserLogin):
    """Login and get access token"""
    user = next((u for u in users_db.values() if u["email"] == credentials.email), None)
    
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    token = create_token(user["id"])
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": UserResponse(**user)
    }

@app.get("/auth/me", response_model=UserResponse, tags=["Authentication"])
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    return UserResponse(**current_user)

@app.post("/api/proxy", response_model=APIResponse, tags=["API Proxy"])
@limiter.limit("100/hour")
async def proxy_api(
    request: Request,
    api_request: APIRequest,
    current_user: dict = Depends(get_current_user)
):
    """Proxy API requests with authentication"""
    import httpx
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.request(
                method=api_request.method,
                url=api_request.endpoint,
                json=api_request.data,
                timeout=30.0
            )
            
            return APIResponse(
                status_code=response.status_code,
                data=response.json() if response.headers.get("content-type", "").startswith("application/json") else {"content": response.text},
                timestamp=datetime.utcnow()
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"API request failed: {str(e)}"
        )

@app.get("/api/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

