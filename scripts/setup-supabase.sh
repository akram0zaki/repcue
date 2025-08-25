#!/bin/bash

# RepCue Supabase Setup Script
# This script helps set up the Supabase project for local development

set -e

echo "🚀 Setting up RepCue Supabase project..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"

# Navigate to project root
cd "$(dirname "$0")/.."

# Start Supabase local development
echo "🔄 Starting Supabase local development environment..."
supabase start

echo ""
echo "✅ Supabase setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Copy the API URL and anon key from above to your .env files"
echo "2. Update apps/frontend/.env with:"
echo "   VITE_SUPABASE_URL=http://127.0.0.1:54321"
echo "   VITE_SUPABASE_ANON_KEY=<anon_key_from_output>"
echo ""
echo "3. Access Supabase Studio at: http://localhost:54323"
echo "4. Start your frontend: pnpm run dev"
echo ""
echo "🧪 To test the sync function:"
echo "   curl -X POST http://localhost:54321/functions/v1/sync \\"
echo "     -H \"Authorization: Bearer <your-jwt>\" \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"tables\":{}}'"
echo ""
echo "📚 Read supabase/README.md for more details"