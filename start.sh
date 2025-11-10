#!/bin/bash

# CareerPulse Quick Start Script
# This script starts all necessary services

echo "🚀 Starting CareerPulse..."
echo ""

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "📦 Starting MongoDB..."
    mkdir -p ~/mongodb-data
    mongod --dbpath ~/mongodb-data --bind_ip 127.0.0.1 --port 27017 > /dev/null 2>&1 &
    sleep 2
    echo "✅ MongoDB started"
else
    echo "✅ MongoDB already running"
fi

# Start Backend
echo "🐍 Starting Backend (FastAPI)..."
cd backend
source venv/bin/activate
uvicorn server:app --reload --port 8000 > /dev/null 2>&1 &
BACKEND_PID=$!
cd ..
echo "✅ Backend started at http://localhost:8000"

# Start Frontend
echo "⚛️  Starting Frontend (React)..."
cd frontend
npm start > /dev/null 2>&1 &
FRONTEND_PID=$!
cd ..
echo "✅ Frontend starting at http://localhost:3000"

echo ""
echo "🎉 All services started!"
echo ""
echo "📝 Access the application:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "⚠️  To stop all services, run: ./stop.sh"
echo ""
echo "Backend PID: $BACKEND_PID" > .pids
echo "Frontend PID: $FRONTEND_PID" >> .pids
