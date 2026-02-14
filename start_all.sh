#!/bin/bash

# ==============================
# MAFS Local Startup Script
# ==============================

# Set your project root (adjust if your folder location is different)
PROJECT_ROOT="/Users/gilbert177777gmail.com/Downloads/attendflow-ai"

# Set backend/frontend ports
BACKEND_PORT=5001
FRONTEND_PORT=3001

# Get your Mac's local IP
LOCAL_IP=$(ipconfig getifaddr en0)

echo "Starting MAFS System..."
echo "Local IP: $LOCAL_IP"

# ==============================
# Function to kill processes on a port
# ==============================
kill_port() {
    PORT=$1
    PIDS=$(lsof -ti tcp:$PORT)
    if [ -n "$PIDS" ]; then
        echo "Killing existing processes on port $PORT: $PIDS"
        kill -9 $PIDS
    fi
}

# ==============================
# Kill existing backend/frontend processes
# ==============================
kill_port $BACKEND_PORT
kill_port $FRONTEND_PORT

# ==============================
# Start MongoDB (Homebrew)
# ==============================
echo "Starting MongoDB..."
if ! pgrep -x "mongod" > /dev/null
then
    brew services start mongodb-community
    sleep 5
fi

# ==============================
# Cleanup function for script exit
# ==============================
cleanup() {
    echo "Stopping backend and frontend..."
    kill $(jobs -p) 2>/dev/null
}
trap cleanup EXIT

# ==============================
# Start Backend
# ==============================
echo "Starting Backend on port $BACKEND_PORT..."
cd "$PROJECT_ROOT/apps/backend" || { echo "Backend folder not found"; exit 1; }

# Always update/create .env with current IP
echo "Updating backend .env with HOST=0.0.0.0..."
# Basic check if .env exists, if not create default
if [ ! -f ".env" ]; then
    cat <<EOT > .env
PORT=$BACKEND_PORT
MONGO_URI=mongodb://localhost:27017/attendflow
JWT_SECRET=your_secret_here
EOT
fi

npm install
npm run dev &
BACKEND_PID=$!

# Wait a few seconds for backend to start
echo "Waiting for backend to initialize..."
sleep 5

# ==============================
# Start Frontend
# ==============================
echo "Starting Frontend on port $FRONTEND_PORT..."
cd "$PROJECT_ROOT/apps/frontend" || { echo "Frontend folder not found"; exit 1; }

# Always inject VITE_API_HOST with current LAN IP
echo "Injecting VITE_API_HOST=$LOCAL_IP into frontend .env..."
# Create or update .env
if [ -f ".env" ]; then
    # Remove existing keys if present to avoid duplicates
    grep -v "VITE_API_HOST" .env > .env.tmp && mv .env.tmp .env
    grep -v "VITE_API_PORT" .env > .env.tmp && mv .env.tmp .env
    grep -v "VITE_API_URL" .env > .env.tmp && mv .env.tmp .env
    grep -v "VITE_WS_URL" .env > .env.tmp && mv .env.tmp .env
fi

# Append new config
cat <<EOT >> .env
VITE_API_HOST=$LOCAL_IP
VITE_API_PORT=$BACKEND_PORT
VITE_API_URL=http://$LOCAL_IP:$BACKEND_PORT
VITE_WS_URL=ws://$LOCAL_IP:$BACKEND_PORT
EOT

npm install
npm run dev &

# ==============================
# Wait for all processes
# ==============================
wait