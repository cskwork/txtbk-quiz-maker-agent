#!/bin/bash
# Textbook Question Maker Agent - Quick Start (Unix/Linux/Mac)
# Requires: Node.js 18+, Claude Code authenticated

echo "========================================"
echo " Textbook Question Maker Agent"
echo "========================================"
echo ""

# Kill any process using port 3001
echo "Checking port 3001..."
PID=$(lsof -ti:3001 2>/dev/null)
if [ -n "$PID" ]; then
    echo "Killing process on port 3001 (PID: $PID)"
    kill -9 $PID 2>/dev/null
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "[1/3] Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to install dependencies"
        exit 1
    fi
else
    echo "[1/3] Dependencies already installed"
fi

echo ""
echo "[2/3] Building packages..."
npm run build
if [ $? -ne 0 ]; then
    echo "ERROR: Build failed"
    exit 1
fi

echo ""
echo "[3/3] Starting development server..."
echo ""
echo " API Server: http://localhost:3001"
echo " Web UI:     http://localhost:5173"
echo ""
echo " Press Ctrl+C to stop"
echo "========================================"
echo ""

npm run dev
