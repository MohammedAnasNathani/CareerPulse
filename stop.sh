#!/bin/bash

# CareerPulse Stop Script
# This script stops all running services

echo "🛑 Stopping CareerPulse services..."
echo ""

# Stop Frontend and Backend from .pids file if it exists
if [ -f .pids ]; then
    while IFS=': ' read -r service pid; do
        if ps -p "$pid" > /dev/null 2>&1; then
            echo "Stopping $service (PID: $pid)"
            kill "$pid" 2>/dev/null
        fi
    done < .pids
    rm .pids
fi

# Kill any remaining processes
pkill -f "uvicorn server:app" 2>/dev/null
pkill -f "react-scripts start" 2>/dev/null
pkill -f "craco start" 2>/dev/null

echo "✅ All services stopped"
echo ""
echo "💡 MongoDB is still running. To stop it:"
echo "   killall mongod"
