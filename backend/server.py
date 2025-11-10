from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import base64
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Railway env vars take precedence
mongo_url = os.environ.get('MONGO_URL', os.environ.get('MONGO_URL'))
if not mongo_url:
    raise Exception("MONGO_URL environment variable is not set!")

client = AsyncIOMotorClient(mongo_url)
db_name = os.environ.get('DB_NAME', 'careerpulse_db')
db = client[db_name]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    headline: Optional[str] = ""

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ProfileUpdate(BaseModel):
    bio: Optional[str] = None
    avatar: Optional[str] = None
    cover_image: Optional[str] = None
    headline: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    headline: Optional[str] = ""
    bio: Optional[str] = ""
    avatar: Optional[str] = ""
    cover_image: Optional[str] = ""
    location: Optional[str] = ""
    website: Optional[str] = ""
    followers: List[str] = Field(default_factory=list)
    following: List[str] = Field(default_factory=list)
    bookmarks: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PostCreate(BaseModel):
    content: str
    image: Optional[str] = None
    hashtags: List[str] = Field(default_factory=list)

class PostUpdate(BaseModel):
    content: Optional[str] = None

class Reaction(BaseModel):
    user_id: str
    type: str  # like, celebrate, support, love, insightful

class Post(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    user_headline: Optional[str] = ""
    user_avatar: Optional[str] = ""
    content: str
    image: Optional[str] = None
    hashtags: List[str] = Field(default_factory=list)
    reactions: List[dict] = Field(default_factory=list)
    views: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Comment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    post_id: str
    user_id: str
    user_name: str
    user_headline: Optional[str] = ""
    user_avatar: Optional[str] = ""
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CommentCreate(BaseModel):
    content: str

class NotificationModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    type: str  # follow, reaction, comment
    actor_id: str
    actor_name: str
    actor_avatar: Optional[str] = ""
    post_id: Optional[str] = None
    message: str
    read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=30)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        if isinstance(user['created_at'], str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
        return User(**user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication")

async def create_notification(user_id: str, type: str, actor_id: str, actor_name: str, actor_avatar: str, message: str, post_id: Optional[str] = None):
    notification = NotificationModel(
        user_id=user_id,
        type=type,
        actor_id=actor_id,
        actor_name=actor_name,
        actor_avatar=actor_avatar,
        post_id=post_id,
        message=message
    )
    notif_dict = notification.model_dump()
    notif_dict['created_at'] = notif_dict['created_at'].isoformat()
    await db.notifications.insert_one(notif_dict)

# Auth Routes
@api_router.post("/auth/signup")
async def signup(user_data: UserCreate):
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        name=user_data.name,
        email=user_data.email,
        headline=user_data.headline or "",
        bio="",
        avatar="",
        cover_image=""
    )
    
    user_dict = user.model_dump()
    user_dict['password'] = hash_password(user_data.password)
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    
    token = create_access_token({"sub": user.id})
    return {"token": token, "user": user}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if isinstance(user['created_at'], str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    user_obj = User(**user)
    token = create_access_token({"sub": user_obj.id})
    return {"token": token, "user": user_obj}

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.put("/auth/profile", response_model=User)
async def update_profile(
    profile_data: ProfileUpdate,
    current_user: User = Depends(get_current_user)
):
    update_data = {}
    
    # Get all non-None fields from the profile_data
    for field, value in profile_data.model_dump(exclude_none=True).items():
        if value is not None:
            update_data[field] = value
    
    if update_data:
        await db.users.update_one({"id": current_user.id}, {"$set": update_data})
        for key, value in update_data.items():
            setattr(current_user, key, value)
    
    return current_user

# Post Routes
@api_router.post("/posts", response_model=Post)
async def create_post(post_data: PostCreate, current_user: User = Depends(get_current_user)):
    hashtags = re.findall(r'#\w+', post_data.content)
    hashtags = [tag.lower() for tag in hashtags]
    
    post = Post(
        user_id=current_user.id,
        user_name=current_user.name,
        user_headline=current_user.headline or "",
        user_avatar=current_user.avatar or "",
        content=post_data.content,
        image=post_data.image,
        hashtags=hashtags
    )
    
    post_dict = post.model_dump()
    post_dict['created_at'] = post_dict['created_at'].isoformat()
    
    await db.posts.insert_one(post_dict)
    
    # Notify followers
    followers = current_user.followers
    for follower_id in followers[:20]:  # Limit to 20 notifications
        await create_notification(
            follower_id, "post", current_user.id, current_user.name, 
            current_user.avatar or "", f"{current_user.name} created a new post", post.id
        )
    
    return post

@api_router.get("/posts", response_model=List[Post])
async def get_posts(skip: int = 0, limit: int = 20, current_user: User = Depends(get_current_user)):
    # Get posts from followed users + own posts
    following_ids = current_user.following + [current_user.id]
    posts = await db.posts.find(
        {"user_id": {"$in": following_ids}}, 
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    for post in posts:
        if isinstance(post['created_at'], str):
            post['created_at'] = datetime.fromisoformat(post['created_at'])
    
    return posts

@api_router.get("/posts/all", response_model=List[Post])
async def get_all_posts(skip: int = 0, limit: int = 20):
    posts = await db.posts.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    for post in posts:
        if isinstance(post['created_at'], str):
            post['created_at'] = datetime.fromisoformat(post['created_at'])
    
    return posts

@api_router.get("/posts/trending", response_model=List[Post])
async def get_trending_posts():
    posts = await db.posts.find({}, {"_id": 0}).sort("views", -1).limit(5).to_list(5)
    
    for post in posts:
        if isinstance(post['created_at'], str):
            post['created_at'] = datetime.fromisoformat(post['created_at'])
    
    return posts

@api_router.get("/posts/search")
async def search_posts(q: str = Query(..., min_length=1)):
    posts = await db.posts.find(
        {"$or": [
            {"content": {"$regex": q, "$options": "i"}},
            {"hashtags": {"$regex": q.lower()}}
        ]},
        {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    for post in posts:
        if isinstance(post['created_at'], str):
            post['created_at'] = datetime.fromisoformat(post['created_at'])
    
    return posts

@api_router.get("/posts/user/{user_id}", response_model=List[Post])
async def get_user_posts(user_id: str):
    posts = await db.posts.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for post in posts:
        if isinstance(post['created_at'], str):
            post['created_at'] = datetime.fromisoformat(post['created_at'])
    
    return posts

@api_router.put("/posts/{post_id}", response_model=Post)
async def update_post(post_id: str, post_update: PostUpdate, current_user: User = Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if post['user_id'] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this post")
    
    update_data = {}
    if post_update.content is not None:
        update_data['content'] = post_update.content
        hashtags = re.findall(r'#\w+', post_update.content)
        update_data['hashtags'] = [tag.lower() for tag in hashtags]
    
    if update_data:
        await db.posts.update_one({"id": post_id}, {"$set": update_data})
        post.update(update_data)
    
    if isinstance(post['created_at'], str):
        post['created_at'] = datetime.fromisoformat(post['created_at'])
    
    return Post(**post)

@api_router.delete("/posts/{post_id}")
async def delete_post(post_id: str, current_user: User = Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if post['user_id'] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this post")
    
    await db.posts.delete_one({"id": post_id})
    await db.comments.delete_many({"post_id": post_id})
    return {"message": "Post deleted successfully"}

@api_router.post("/posts/{post_id}/react")
async def toggle_reaction(post_id: str, reaction_type: str, current_user: User = Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    reactions = post.get('reactions', [])
    user_reaction = next((r for r in reactions if r['user_id'] == current_user.id), None)
    
    if user_reaction:
        if user_reaction['type'] == reaction_type:
            reactions = [r for r in reactions if r['user_id'] != current_user.id]
            action = "removed"
        else:
            for r in reactions:
                if r['user_id'] == current_user.id:
                    r['type'] = reaction_type
            action = "changed"
    else:
        reactions.append({"user_id": current_user.id, "type": reaction_type})
        action = "added"
        
        # Notify post owner
        if post['user_id'] != current_user.id:
            await create_notification(
                post['user_id'], "reaction", current_user.id, current_user.name,
                current_user.avatar or "", f"{current_user.name} reacted to your post", post_id
            )
    
    await db.posts.update_one({"id": post_id}, {"$set": {"reactions": reactions}})
    return {"message": f"Reaction {action}", "reactions": reactions}

@api_router.post("/posts/{post_id}/view")
async def increment_view(post_id: str):
    await db.posts.update_one({"id": post_id}, {"$inc": {"views": 1}})
    return {"message": "View counted"}

@api_router.post("/posts/{post_id}/bookmark")
async def toggle_bookmark(post_id: str, current_user: User = Depends(get_current_user)):
    bookmarks = current_user.bookmarks or []
    
    if post_id in bookmarks:
        bookmarks.remove(post_id)
        action = "removed"
    else:
        bookmarks.append(post_id)
        action = "added"
    
    await db.users.update_one({"id": current_user.id}, {"$set": {"bookmarks": bookmarks}})
    return {"message": f"Bookmark {action}", "bookmarks": bookmarks}

@api_router.get("/posts/bookmarked/me", response_model=List[Post])
async def get_bookmarked_posts(current_user: User = Depends(get_current_user)):
    bookmarks = current_user.bookmarks or []
    if not bookmarks:
        return []
    
    posts = await db.posts.find({"id": {"$in": bookmarks}}, {"_id": 0}).to_list(1000)
    
    for post in posts:
        if isinstance(post['created_at'], str):
            post['created_at'] = datetime.fromisoformat(post['created_at'])
    
    return posts

# Comment Routes
@api_router.post("/posts/{post_id}/comments", response_model=Comment)
async def create_comment(post_id: str, comment_data: CommentCreate, current_user: User = Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    comment = Comment(
        post_id=post_id,
        user_id=current_user.id,
        user_name=current_user.name,
        user_headline=current_user.headline or "",
        user_avatar=current_user.avatar or "",
        content=comment_data.content
    )
    
    comment_dict = comment.model_dump()
    comment_dict['created_at'] = comment_dict['created_at'].isoformat()
    
    await db.comments.insert_one(comment_dict)
    
    # Notify post owner
    if post['user_id'] != current_user.id:
        await create_notification(
            post['user_id'], "comment", current_user.id, current_user.name,
            current_user.avatar or "", f"{current_user.name} commented on your post", post_id
        )
    
    return comment

@api_router.get("/posts/{post_id}/comments", response_model=List[Comment])
async def get_comments(post_id: str):
    comments = await db.comments.find({"post_id": post_id}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    
    for comment in comments:
        if isinstance(comment['created_at'], str):
            comment['created_at'] = datetime.fromisoformat(comment['created_at'])
    
    return comments

@api_router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, current_user: User = Depends(get_current_user)):
    comment = await db.comments.find_one({"id": comment_id}, {"_id": 0})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    if comment['user_id'] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")
    
    await db.comments.delete_one({"id": comment_id})
    return {"message": "Comment deleted successfully"}

# User Routes
@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if isinstance(user['created_at'], str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    return User(**user)

@api_router.get("/users/search/query")
async def search_users(q: str = Query(..., min_length=1)):
    users = await db.users.find(
        {"$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"headline": {"$regex": q, "$options": "i"}}
        ]},
        {"_id": 0, "password": 0}
    ).limit(10).to_list(10)
    
    return users

@api_router.get("/users/suggested/me")
async def get_suggested_users(current_user: User = Depends(get_current_user)):
    users = await db.users.find(
        {"id": {"$nin": [current_user.id] + current_user.following}},
        {"_id": 0, "password": 0}
    ).limit(5).to_list(5)
    
    return users

@api_router.post("/users/{user_id}/follow")
async def toggle_follow(user_id: str, current_user: User = Depends(get_current_user)):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    following = current_user.following or []
    followers = target_user.get('followers', [])
    
    if user_id in following:
        following.remove(user_id)
        followers.remove(current_user.id)
        action = "unfollowed"
    else:
        following.append(user_id)
        followers.append(current_user.id)
        action = "followed"
        
        # Notify the user being followed
        await create_notification(
            user_id, "follow", current_user.id, current_user.name,
            current_user.avatar or "", f"{current_user.name} started following you"
        )
    
    await db.users.update_one({"id": current_user.id}, {"$set": {"following": following}})
    await db.users.update_one({"id": user_id}, {"$set": {"followers": followers}})
    
    return {"message": f"User {action}", "following": following}

# Notification Routes
@api_router.get("/notifications", response_model=List[NotificationModel])
async def get_notifications(current_user: User = Depends(get_current_user)):
    notifications = await db.notifications.find(
        {"user_id": current_user.id}, 
        {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    for notif in notifications:
        if isinstance(notif['created_at'], str):
            notif['created_at'] = datetime.fromisoformat(notif['created_at'])
    
    return notifications

@api_router.put("/notifications/read")
async def mark_notifications_read(current_user: User = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": current_user.id, "read": False},
        {"$set": {"read": True}}
    )
    return {"message": "Notifications marked as read"}

@api_router.get("/notifications/unread/count")
async def get_unread_count(current_user: User = Depends(get_current_user)):
    count = await db.notifications.count_documents({"user_id": current_user.id, "read": False})
    return {"count": count}

@api_router.post("/upload")
async def upload_image(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    contents = await file.read()
    base64_image = base64.b64encode(contents).decode('utf-8')
    mime_type = file.content_type or 'image/jpeg'
    return {"image": f"data:{mime_type};base64,{base64_image}"}

# Debug endpoint to check environment
@app.get("/debug/env")
async def debug_env():
    return {
        "mongo_url_set": "MONGO_URL" in os.environ,
        "mongo_url_prefix": os.environ.get('MONGO_URL', '')[:20] + "...",
        "db_name": os.environ.get('DB_NAME', 'not_set'),
        "cors_origins": os.environ.get('CORS_ORIGINS', 'not_set'),
    }

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()