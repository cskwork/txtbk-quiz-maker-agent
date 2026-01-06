@echo off
REM Textbook Question Maker Agent - Quick Start (Windows)
REM Requires: Node.js 18+, Claude Code authenticated

echo ========================================
echo  Textbook Question Maker Agent
echo ========================================
echo.

REM Kill any process using port 4001
echo Checking port 4001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4001 ^| findstr LISTENING 2^>nul') do (
    echo Killing process on port 4001 (PID: %%a)
    taskkill /PID %%a /F >nul 2>&1
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo [1/3] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
) else (
    echo [1/3] Dependencies already installed
)

echo.
echo [2/3] Building packages...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed
    pause
    exit /b 1
)

echo.
echo [3/3] Starting development server...
echo.
echo  API Server: http://localhost:4001
echo  Web UI:     http://localhost:4002
echo.
echo  Press Ctrl+C to stop
echo ========================================
echo.

npm run dev
