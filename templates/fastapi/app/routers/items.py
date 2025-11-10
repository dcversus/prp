"""
Items router for {{PROJECT_NAME}}

CRUD operations for items
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import json
import os
from datetime import datetime

router = APIRouter()

# Data models
class Item(BaseModel):
    id: Optional[int] = None
    name: str
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class ItemCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None

class ItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None


# In-memory storage (in production, use a database)
items_db: Dict[int, Item] = {}
next_id = 1


# Load initial data from JSON file if exists
def load_items():
    global items_db, next_id
    if os.path.exists("items.json"):
        try:
            with open("items.json", "r") as f:
                data = json.load(f)
                items_db = {int(k): Item(**v) for k, v in data.items()}
                next_id = max(items_db.keys(), default=0) + 1
        except Exception as e:
            print(f"Error loading items: {e}")


# Save items to JSON file
def save_items():
    try:
        with open("items.json", "w") as f:
            json.dump({k: v.dict() for k, v in items_db.items()}, f, default=str, indent=2)
    except Exception as e:
        print(f"Error saving items: {e}")


# Initialize data
load_items()


@router.get("/", response_model=List[Item])
async def get_items(
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None
):
    """Get all items with optional filtering"""
    items = list(items_db.values())

    # Filter by category if provided
    if category:
        items = [item for item in items if item.category == category]

    # Apply pagination
    items = items[skip:skip + limit]
    return items


@router.get("/{item_id}", response_model=Item)
async def get_item(item_id: int):
    """Get a specific item by ID"""
    if item_id not in items_db:
        raise HTTPException(status_code=404, detail="Item not found")
    return items_db[item_id]


@router.post("/", response_model=Item)
async def create_item(item: ItemCreate):
    """Create a new item"""
    global next_id

    new_item = Item(
        id=next_id,
        name=item.name,
        description=item.description,
        price=item.price,
        category=item.category,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )

    items_db[next_id] = new_item
    next_id += 1
    save_items()

    return new_item


@router.put("/{item_id}", response_model=Item)
async def update_item(item_id: int, item: ItemUpdate):
    """Update an existing item"""
    if item_id not in items_db:
        raise HTTPException(status_code=404, detail="Item not found")

    existing_item = items_db[item_id]

    # Update fields that are provided
    update_data = item.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.now()

    for field, value in update_data.items():
        setattr(existing_item, field, value)

    save_items()
    return existing_item


@router.delete("/{item_id}")
async def delete_item(item_id: int):
    """Delete an item"""
    if item_id not in items_db:
        raise HTTPException(status_code=404, detail="Item not found")

    del items_db[item_id]
    save_items()

    return {"message": f"Item {item_id} deleted successfully"}


@router.get("/categories/list")
async def get_categories():
    """Get all available categories"""
    categories = set(item.category for item in items_db.values() if item.category)
    return {"categories": sorted(list(categories))}


@router.get("/search/{query}")
async def search_items(query: str):
    """Search items by name or description"""
    query_lower = query.lower()
    results = [
        item for item in items_db.values()
        if query_lower in item.name.lower() or
           (item.description and query_lower in item.description.lower())
    ]
    return {"items": results, "count": len(results)}