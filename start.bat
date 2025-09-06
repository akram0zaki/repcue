@echo off
:: RepCue - Easy Start Script for Windows
:: This script helps you get RepCue running quickly on Windows
:: Monorepo with pnpm package manager

echo 🏋️‍♀️ RepCue - Starting your fitness app...
echo ========================================

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed!
    echo 📥 Please install Node.js 18+ from: https://nodejs.org
    echo    Or follow the setup guide in README.md
    pause
    exit /b 1
)

:: Get Node.js version
for /f "tokens=1 delims=v" %%a in ('node -v') do set NODE_VERSION=%%a
for /f "tokens=1 delims=." %%a in ("%NODE_VERSION%") do set MAJOR_VERSION=%%a

if %MAJOR_VERSION% lss 18 (
    echo ⚠️  Node.js version is too old 
    echo 📥 Please install Node.js 18+ from: https://nodejs.org
    pause
    exit /b 1
)

echo ✅ Node.js detected and compatible

:: Check if pnpm is installed
where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ pnpm is not installed!
    echo 📥 Installing pnpm globally...
    call npm install -g pnpm
    
    if %errorlevel% neq 0 (
        echo ❌ Failed to install pnpm
        echo 💡 Try running: npm install -g pnpm
        pause
        exit /b 1
    )
    
    echo ✅ pnpm installed successfully
) else (
    echo ✅ pnpm detected
)

:: Check if dependencies are installed (monorepo structure)
if not exist "node_modules" (
    echo 📦 Installing dependencies for monorepo (this may take a few minutes)...
    call pnpm install
    
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies
        echo 💡 Try running: pnpm install
        pause
        exit /b 1
    )
    
    echo ✅ Dependencies installed successfully
) else (
    echo ✅ Dependencies already installed
)

:: Start the development server
echo 🚀 Starting RepCue development server (frontend)...
echo 📱 Frontend will open at: http://localhost:5173
echo 🔧 Backend will start at: http://localhost:3000
echo ⌨️  Press Ctrl+C to stop the servers
echo.

call pnpm run dev 