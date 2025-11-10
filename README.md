# CareerPulse - LinkedIn Clone

A professional networking platform built with React.js, FastAPI (Python), and MongoDB. This project demonstrates full-stack development skills by implementing a social media application similar to LinkedIn.

## 🎯 Project Overview

CareerPulse is a social networking platform where users can:
- Create accounts and authenticate securely
- Share posts with text and images
- View a feed of posts from all users
- Like, comment, and react to posts
- Follow other users
- Edit and delete their own posts
- View user profiles
- Upload profile pictures and cover images
- Search for posts and users
- Receive real-time notifications
- Bookmark posts for later

## 🚀 Features Implemented

### Core Features (Required)
✅ **User Authentication**
- Signup with email, password, name, and headline
- Login with email and password
- JWT-based authentication
- Secure password hashing with bcrypt

✅ **Create Posts**
- Text-based posts
- Image uploads
- Automatic hashtag extraction
- Post timestamps and user attribution

✅ **View All Posts**
- Public feed showing all users' posts
- Latest posts first (sorted by creation time)
- Display user name, headline, avatar
- View counts for each post

### Bonus Features (Implemented)
✅ **Like & Comment System**
- Multiple reaction types (Like, Celebrate, Support, Love, Insightful)
- Add comments to posts
- Delete your own comments
- View all comments on a post

✅ **Edit & Delete Posts**
- Edit your own posts
- Delete your own posts
- Automatic cleanup of comments when post is deleted

✅ **User Profile Pages**
- View any user's profile
- Profile information: bio, headline, location, website
- Profile and cover image uploads
- View user's posts
- Follower/following counts
- Follow/unfollow functionality

✅ **Image Uploads**
- Post images
- Profile pictures
- Cover images
- Base64 encoding for easy storage

### Additional Advanced Features
✅ **Social Features**
- Follow/unfollow users
- Following feed (posts from people you follow)
- Suggested users to follow
- Bookmark posts

✅ **Search & Discovery**
- Search posts by content or hashtags
- Search users by name or headline
- Trending posts (by views)

✅ **Notifications**
- Get notified when someone follows you
- Get notified when someone reacts to your post
- Get notified when someone comments on your post
- Unread notification count
- Mark notifications as read

## 🛠️ Technology Stack

### Frontend
- **React.js** - UI framework
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **TailwindCSS** - Styling
- **Radix UI** - UI components
- **Lucide React** - Icons
- **date-fns** - Date formatting
- **Sonner** - Toast notifications

### Backend
- **Python FastAPI** - Web framework
- **MongoDB** (Motor) - Database with async driver
- **PyJWT** - JWT token generation
- **Passlib & bcrypt** - Password hashing
- **Pydantic** - Data validation
- **python-dotenv** - Environment configuration

### Database
- **MongoDB** - NoSQL database for flexible schema

## 📋 Prerequisites

Before running this project, make sure you have:
- **Node.js** (v14 or higher) and npm/yarn
- **Python** (v3.8 or higher)
- **MongoDB** (running locally or MongoDB Atlas connection)

## 🔧 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/MohammedAnasNathani/CareerPulse.git
cd CareerPulse
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create a virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
# Edit backend/.env file:
MONGO_URL=mongodb://localhost:27017
DB_NAME=careerpulse_db
JWT_SECRET=your-secret-key-change-in-production
CORS_ORIGINS=http://localhost:3000

# Start MongoDB (if running locally)
# On macOS with Homebrew:
brew services start mongodb-community
# On Linux:
sudo systemctl start mongod
# On Windows: Start MongoDB service from Services

# Run the backend server
uvicorn server:app --reload --port 8000
```

The backend will be running at `http://localhost:8000`

### 3. Frontend Setup

```bash
# Open a new terminal
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install
# or
yarn install

# Configure environment variables
# Edit frontend/.env file:
REACT_APP_BACKEND_URL=http://localhost:8000

# Start the development server
npm start
# or
yarn start
```

The frontend will be running at `http://localhost:3000`

## 🎮 Usage

1. **First Time Users:**
   - Visit `http://localhost:3000`
   - Click "Join now" to create an account
   - Fill in your name, email, password, and headline
   - Click "Create Account"

2. **Existing Users:**
   - Visit `http://localhost:3000`
   - Click "Sign in"
   - Enter your email and password

3. **Using the App:**
   - Click "Start a post..." to create a new post
   - Add text content and optionally upload an image
   - View posts from all users in the feed
   - Click on reaction icons to react to posts
   - Click "Comment" to add comments
   - Click on user avatars to view profiles
   - Follow other users to see their posts in your Following feed
   - Search for posts or users using the search bar

## 📁 Project Structure

```
CareerPulse/
├── backend/
│   ├── server.py          # FastAPI application & all endpoints
│   ├── requirements.txt   # Python dependencies
│   └── .env              # Environment variables
├── frontend/
│   ├── public/
│   │   └── index.html    # HTML template
│   ├── src/
│   │   ├── App.js        # Main app component & routing
│   │   ├── components/
│   │   │   ├── Auth.jsx      # Login/Signup component
│   │   │   ├── Feed.jsx      # Main feed component
│   │   │   ├── Profile.jsx   # User profile component
│   │   │   └── ui/           # Reusable UI components
│   │   └── lib/
│   │       └── utils.js      # Utility functions
│   ├── package.json      # Node dependencies
│   └── .env             # Frontend environment variables
└── README.md            # This file
```

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Posts
- `POST /api/posts` - Create post
- `GET /api/posts` - Get posts from followed users
- `GET /api/posts/all` - Get all posts
- `GET /api/posts/trending` - Get trending posts
- `GET /api/posts/search` - Search posts
- `GET /api/posts/user/{user_id}` - Get user's posts
- `PUT /api/posts/{post_id}` - Update post
- `DELETE /api/posts/{post_id}` - Delete post
- `POST /api/posts/{post_id}/react` - React to post
- `POST /api/posts/{post_id}/bookmark` - Bookmark post

### Comments
- `POST /api/posts/{post_id}/comments` - Add comment
- `GET /api/posts/{post_id}/comments` - Get comments
- `DELETE /api/comments/{comment_id}` - Delete comment

### Users
- `GET /api/users/{user_id}` - Get user profile
- `GET /api/users/search/query` - Search users
- `GET /api/users/suggested/me` - Get suggested users
- `POST /api/users/{user_id}/follow` - Follow/unfollow user

### Notifications
- `GET /api/notifications` - Get notifications
- `PUT /api/notifications/read` - Mark as read
- `GET /api/notifications/unread/count` - Get unread count

### Upload
- `POST /api/upload` - Upload image

## 🎨 UI Features

- **Responsive Design** - Works on desktop, tablet, and mobile
- **Modern UI** - Clean, professional LinkedIn-inspired design
- **Dark Mode Ready** - Color scheme variables for easy theming
- **Smooth Animations** - Fade-in effects and transitions
- **Toast Notifications** - User feedback for actions
- **Loading States** - Spinners during async operations

## 🧪 Testing

To test the application:

1. **Create Multiple Users** - Register 2-3 test accounts
2. **Create Posts** - Add posts with different users
3. **Test Interactions** - Like, comment, follow between accounts
4. **Test Search** - Search for posts and users
5. **Test Profiles** - View and edit profiles
6. **Test Notifications** - Check notification system

## 👨‍💻 Developer

**Mohammed Anas Nathani**

## 📝 Assignment Compliance

This project fulfills all requirements of the Full Stack Developer Internship Assignment:

✅ User Login & Signup with secure authentication  
✅ Create Post functionality with user attribution  
✅ View All Posts with latest first sorting  
✅ Like/Comment system implemented  
✅ Edit/Delete own posts  
✅ User profile pages  
✅ Image uploads for posts and profiles  
✅ Clean, responsive UI  
✅ Full MERN-like stack (React + Python FastAPI + MongoDB)  
✅ Extra features: Follow system, notifications, search, bookmarks  

## 📄 License

This project is created for educational purposes as part of an internship assignment.

## 🤝 Acknowledgments

- UI Design inspired by LinkedIn
- Icons by Lucide
- UI Components by Radix UI

