#!/bin/bash

# RepCue - Easy Start Script
# This script helps you get RepCue running quickly

echo "🏋️‍♀️ RepCue - Starting your fitness app..."
echo "========================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "📥 Please install Node.js 18+ from: https://nodejs.org"
    echo "   Or follow the setup guide in README.md"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "⚠️  Node.js version is too old (found v$(node -v))"
    echo "📥 Please install Node.js 18+ from: https://nodejs.org"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies (this may take a few minutes)..."
    npm install
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        echo "💡 Try running: npm install"
        exit 1
    fi
    
    echo "✅ Dependencies installed successfully"
else
    echo "✅ Dependencies already installed"
fi

# Start the development server
echo "🚀 Starting RepCue development server..."
echo "📱 App will open at: http://localhost:5173"
echo "⌨️  Press Ctrl+C to stop the server"
echo ""

npm run dev 