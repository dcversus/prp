"""
{{PROJECT_NAME}} - {{PROJECT_DESCRIPTION}}

FastAPI application with automatic OpenAPI documentation
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
import os
from typing import List, Optional

from routers import items, users


# Application lifecycle management
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup and shutdown"""
    # Startup
    print("🚀 Starting {{PROJECT_NAME}}...")
    yield
    # Shutdown
    print("📴 Shutting down {{PROJECT_NAME}}...")


# Create FastAPI application
app = FastAPI(
    title="{{PROJECT_NAME}}",
    description="{{PROJECT_DESCRIPTION}}",
    version="{{VERSION}}",
    contact={
        "name": "{{AUTHOR}}",
        "email": "{{EMAIL}}",
    },
    license_info={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT",
    },
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer(auto_error=False)


async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """Get current user from JWT token (placeholder implementation)"""
    if credentials is None:
        return None

    # TODO: Implement proper JWT validation
    # For now, just return the token as user ID
    return {"user_id": credentials.credentials[:10]}


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Check if the API is running"""
    return {
        "status": "healthy",
        "service": "{{PROJECT_NAME}}",
        "version": "{{VERSION}}",
        "message": "API is running!"
    }


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with basic info"""
    return {
        "message": "Welcome to {{PROJECT_NAME}} API",
        "docs": "/docs",
        "redoc": "/redoc",
        "version": "{{VERSION}}",
        "health": "/health"
    }


# Include routers
app.include_router(items.router, prefix="/api/v1/items", tags=["Items"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])


# Protected endpoint example
@app.get("/api/v1/protected", tags=["Protected"])
async def protected_route(current_user: dict = Depends(get_current_user)):
    """Example of a protected route"""
    if current_user is None:
        raise HTTPException(status_code=401, detail="Authentication required")

    return {
        "message": "Access granted",
        "user": current_user,
        "data": "This is protected content"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=bool(os.getenv("DEBUG", False))
    )