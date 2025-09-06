#!/bin/bash

# RepCue - Easy Start Script
# This script helps you get RepCue running quickly
# Monorepo with pnpm package manager

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

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed!"
    echo "📥 Installing pnpm globally..."
    npm install -g pnpm
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install pnpm"
        echo "💡 Try running: npm install -g pnpm"
        exit 1
    fi
    
    echo "✅ pnpm installed successfully"
else
    echo "✅ pnpm $(pnpm -v) detected"
fi

# Check if dependencies are installed (monorepo structure)
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies for monorepo (this may take a few minutes)..."
    pnpm install
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        echo "💡 Try running: pnpm install"
        exit 1
    fi
    
    echo "✅ Dependencies installed successfully"
else
    echo "✅ Dependencies already installed"
fi

# Start the development server
echo "🚀 Starting RepCue development server (frontend)..."
echo "📱 Frontend will open at: http://localhost:5173"
echo "🔧 Backend will start at: http://localhost:3000"
echo "⌨️  Press Ctrl+C to stop the servers"
echo ""

pnpm run dev 