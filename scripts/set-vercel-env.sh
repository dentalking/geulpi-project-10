#!/bin/bash

# Set Vercel environment variables for production
# This script expects environment variables to be loaded from .env.local file
# Usage: source .env.local && ./scripts/set-vercel-env.sh

echo "Setting Vercel environment variables for production..."

# Check if required environment variables exist
if [ -z "$GOOGLE_CLIENT_ID" ] || [ -z "$GOOGLE_CLIENT_SECRET" ]; then
    echo "Error: Please load environment variables first by running:"
    echo "  source .env.local && ./scripts/set-vercel-env.sh"
    exit 1
fi

# Google OAuth (using environment variables to avoid exposing secrets)
echo "$GOOGLE_CLIENT_ID" | vercel env add GOOGLE_CLIENT_ID production
echo "$GOOGLE_CLIENT_SECRET" | vercel env add GOOGLE_CLIENT_SECRET production
echo "$GOOGLE_REDIRECT_URI" | vercel env add GOOGLE_REDIRECT_URI production

# Google APIs
echo "$GOOGLE_API_KEY" | vercel env add GOOGLE_API_KEY production
echo "$GEMINI_API_KEY" | vercel env add GEMINI_API_KEY production

# NextAuth
echo "$NEXTAUTH_URL" | vercel env add NEXTAUTH_URL production
echo "$NEXTAUTH_SECRET" | vercel env add NEXTAUTH_SECRET production

# Supabase
echo "$NEXT_PUBLIC_SUPABASE_URL" | vercel env add NEXT_PUBLIC_SUPABASE_URL production
echo "$NEXT_PUBLIC_SUPABASE_ANON_KEY" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
echo "$SUPABASE_SERVICE_ROLE_KEY" | vercel env add SUPABASE_SERVICE_ROLE_KEY production

# JWT Secret
echo "$JWT_SECRET" | vercel env add JWT_SECRET production

echo "Environment variables set successfully!"
echo "Note: The actual values are read from your local .env.local file"