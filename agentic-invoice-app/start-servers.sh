#!/bin/bash

echo "Starting Agent Zero Invoice Processing System..."

# Kill any existing processes
echo "Cleaning up existing processes..."
pkill -f "node" 2>/dev/null
pkill -f "npm" 2>/dev/null
sleep 2

# Start backend server
echo "Starting backend server with Agent Zero..."
cd server
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
echo "Waiting for backend to initialize..."
sleep 5

# Test backend
echo "Testing backend server..."
curl -s http://localhost:3001/health || echo "Backend might still be starting..."

# Start frontend
echo "Starting frontend..."
cd ../agentic-invoice-app
npm run dev &
FRONTEND_PID=$!

echo ""
echo "========================================="
echo "🚀 Agent Zero System Started!"
echo "========================================="
echo "Backend (Agent Zero): http://localhost:3001"
echo "Frontend: http://localhost:5173 or http://localhost:5174"
echo ""
echo "API Health Check: http://localhost:3001/health"
echo "Agent Zero Status: http://localhost:3001/api/agents/agent-zero/status"
echo ""
echo "Press Ctrl+C to stop all servers"
echo "========================================="

# Keep script running
wait $BACKEND_PID $FRONTEND_PID