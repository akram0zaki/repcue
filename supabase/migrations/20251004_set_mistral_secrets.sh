#!/bin/bash
# Migration script to set Mistral AI provider secrets
# Date: 2025-10-04
# Description: Configure Mistral API key and AI provider for development environment

# Set secrets for development project
npx supabase secrets set \
  MISTRAL_API_KEY=Bfaa52QtIYiJnFqdafVmDqW9m3IZW15L \
  AI_PROVIDER=mistral \
  --project-ref xwzrsfkzqxdybjrkkkvh

echo "Mistral secrets configured for development project (xwzrsfkzqxdybjrkkkvh)"
