"""
Users router for {{PROJECT_NAME}}

User management and authentication
"""

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
import json
import os
from datetime import datetime
from passlib.context import CryptContext
import secrets

router = APIRouter()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Data models
class User(BaseModel):
    id: Optional[int] = None
    email: str
    username: str
    full_name: Optional[str] = None
    is_active: bool = True
    is_superuser: bool = False
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    expires_in: int

class TokenData(BaseModel):
    username: Optional[str] = None


# In-memory storage (in production, use a database)
users_db: Dict[int, Dict[str, Any]] = {}
users_by_username: Dict[str, int] = {}
users_by_email: Dict[str, int] = {}
next_id = 1
tokens_db: Dict[str, Dict[str, Any]] = {}


# Load initial data from JSON file if exists
def load_users():
    global users_db, users_by_username, users_by_email, next_id
    if os.path.exists("users.json"):
        try:
            with open("users.json", "r") as f:
                data = json.load(f)
                users_db = {int(k): v for k, v in data.items()}
                users_by_username = {v["username"]: int(k) for k, v in users_db.items()}
                users_by_email = {v["email"]: int(k) for k, v in users_db.items()}
                next_id = max(users_db.keys(), default=0) + 1
        except Exception as e:
            print(f"Error loading users: {e}")


# Save users to JSON file
def save_users():
    try:
        with open("users.json", "w") as f:
            json.dump(users_db, f, default=str, indent=2)
    except Exception as e:
        print(f"Error saving users: {e}")


# Initialize data
load_users()


# Helper functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Generate password hash"""
    return pwd_context.hash(password)


def get_user_by_username(username: str) -> Optional[User]:
    """Get user by username"""
    user_id = users_by_username.get(username)
    if user_id and user_id in users_db:
        user_data = users_db[user_id]
        return User(**user_data)
    return None


def authenticate_user(username: str, password: str) -> Optional[User]:
    """Authenticate user credentials"""
    user = get_user_by_username(username)
    if not user:
        return None

    user_id = users_by_username[username]
    user_data = users_db[user_id]

    if not verify_password(password, user_data["hashed_password"]):
        return None

    # Update last login
    user_data["last_login"] = datetime.now()
    save_users()

    return User(**user_data)


def create_access_token(data: dict, expires_delta: Optional[int] = None):
    """Create a simple access token (in production, use JWT)"""
    token = secrets.token_urlsafe(32)
    expires_in = expires_delta or 3600  # 1 hour default

    tokens_db[token] = {
        "data": data,
        "expires_at": datetime.now().timestamp() + expires_in
    }

    return token


def verify_token(token: str) -> Optional[TokenData]:
    """Verify access token"""
    if token not in tokens_db:
        return None

    token_data = tokens_db[token]
    if datetime.now().timestamp() > token_data["expires_at"]:
        del tokens_db[token]
        return None

    return TokenData(username=token_data["data"].get("sub"))


# API endpoints
@router.post("/register", response_model=User)
async def register_user(user: UserCreate):
    """Register a new user"""
    global next_id

    # Check if username already exists
    if user.username in users_by_username:
        raise HTTPException(
            status_code=400,
            detail="Username already registered"
        )

    # Check if email already exists
    if user.email in users_by_email:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    # Create new user
    hashed_password = get_password_hash(user.password)
    new_user = {
        "id": next_id,
        "email": user.email,
        "username": user.username,
        "full_name": user.full_name,
        "hashed_password": hashed_password,
        "is_active": True,
        "is_superuser": False,
        "created_at": datetime.now(),
        "last_login": None
    }

    users_db[next_id] = new_user
    users_by_username[user.username] = next_id
    users_by_email[user.email] = next_id
    next_id += 1
    save_users()

    # Return user without password
    user_response = User(**new_user)
    return user_response


@router.post("/login", response_model=Token)
async def login_user(user_credentials: UserLogin):
    """Login user and return access token"""
    user = authenticate_user(user_credentials.username, user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=400,
            detail="Inactive user"
        )

    access_token = create_access_token(data={"sub": user.username})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": 3600
    }


@router.get("/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_user_by_username)):
    """Get current user info"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user


@router.get("/", response_model=List[User])
async def get_users(skip: int = 0, limit: int = 100):
    """Get all users (admin only in production)"""
    users = [User(**user_data) for user_data in users_db.values()]
    users = users[skip:skip + limit]
    return users


@router.get("/{user_id}", response_model=User)
async def get_user(user_id: int):
    """Get user by ID"""
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="User not found")

    user_data = users_db[user_id]
    return User(**user_data)


@router.put("/{user_id}", response_model=User)
async def update_user(user_id: int, user: UserUpdate):
    """Update user information"""
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="User not found")

    existing_user = users_db[user_id]

    # Check if username is being updated and already exists
    if user.username and user.username != existing_user["username"]:
        if user.username in users_by_username:
            raise HTTPException(
                status_code=400,
                detail="Username already exists"
            )
        # Update username mapping
        del users_by_username[existing_user["username"]]
        users_by_username[user.username] = user_id

    # Check if email is being updated and already exists
    if user.email and user.email != existing_user["email"]:
        if user.email in users_by_email:
            raise HTTPException(
                status_code=400,
                detail="Email already exists"
            )
        # Update email mapping
        del users_by_email[existing_user["email"]]
        users_by_email[user.email] = user_id

    # Update fields that are provided
    update_data = user.dict(exclude_unset=True)

    # Hash password if provided
    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))

    for field, value in update_data.items():
        if existing_user.get(field) != value:
            existing_user[field] = value

    save_users()
    return User(**existing_user)


@router.delete("/{user_id}")
async def delete_user(user_id: int):
    """Delete a user"""
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="User not found")

    user_data = users_db[user_id]

    # Remove from mappings
    del users_by_username[user_data["username"]]
    del users_by_email[user_data["email"]]
    del users_db[user_id]

    save_users()
    return {"message": f"User {user_id} deleted successfully"}