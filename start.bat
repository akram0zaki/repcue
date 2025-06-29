@echo off
:: RepCue - Easy Start Script for Windows
:: This script helps you get RepCue running quickly on Windows

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

:: Check if dependencies are installed
if not exist "node_modules" (
    echo 📦 Installing dependencies (this may take a few minutes)...
    call npm install
    
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies
        echo 💡 Try running: npm install
        pause
        exit /b 1
    )
    
    echo ✅ Dependencies installed successfully
) else (
    echo ✅ Dependencies already installed
)

:: Start the development server
echo 🚀 Starting RepCue development server...
echo 📱 App will open at: http://localhost:5173
echo ⌨️  Press Ctrl+C to stop the server
echo.

call npm run dev 