#!/bin/bash
# TechTideAI Development Server Startup Script
# Frontend: http://localhost:5180
# Backend: http://localhost:4050

cd "$(dirname "$0")"

echo "Starting TechTideAI Development Servers..."
echo "==========================================="

# Start backend
echo "Starting backend on port 4050..."
cd backend
pnpm dev &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start frontend
echo "Starting frontend on port 5180..."
cd frontend
pnpm dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "==========================================="
echo "Services started:"
echo "  Backend:  http://localhost:4050"
echo "  Frontend: http://localhost:5180"
echo ""
echo "Press Ctrl+C to stop all services"
echo "==========================================="

# Wait for interrupt
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
