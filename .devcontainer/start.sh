#!/bin/bash
# start.sh — Runs every time the Codespace starts
# Launches FastAPI backend AND Next.js frontend simultaneously

set -e

echo ""
echo "============================================"
echo "  🚀 Starting Deals Seller Portal"
echo "============================================"

# Kill any previous server instances
pkill -f "uvicorn" 2>/dev/null || true
pkill -f "next dev"  2>/dev/null || true
sleep 1

# ── Start FastAPI Backend (port 5000) ────────────
echo ""
echo "→ Starting FastAPI backend on port 5000..."
nohup python -m uvicorn src.core.controller:app \
  --host 0.0.0.0 \
  --port 5000 \
  --reload \
  > /tmp/backend.log 2>&1 &

BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"
echo "  Logs: /tmp/backend.log"

# Wait for backend to be ready
echo "  Waiting for backend..."
for i in {1..20}; do
  if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "  ✓ Backend is ready!"
    break
  fi
  sleep 1
done

# ── Start Next.js Frontend (port 3000) ───────────
echo ""
echo "→ Starting Next.js frontend on port 3000..."
nohup npm run dev > /tmp/frontend.log 2>&1 &

FRONTEND_PID=$!
echo "  Frontend PID: $FRONTEND_PID"
echo "  Logs: /tmp/frontend.log"

# Wait for frontend to be ready
echo "  Waiting for frontend to compile..."
for i in {1..60}; do
  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "  ✓ Frontend is ready!"
    break
  fi
  sleep 2
done

echo ""
echo "============================================"
echo "  ✅ Both servers are running!"
echo ""
echo "  🌐 Frontend   → http://localhost:3000"
echo "  🔌 Backend    → http://localhost:5000"
echo "  📡 API Docs   → http://localhost:5000/docs"
echo ""
echo "  📋 View logs:"
echo "     tail -f /tmp/backend.log"
echo "     tail -f /tmp/frontend.log"
echo "============================================"
