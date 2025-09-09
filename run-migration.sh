#!/bin/bash

# Supabase Migration Script
# Date: 2025-01-09

# Configuration
PROJECT_REF="moszlrvkzrpmhvzmpiqk"
DB_PASSWORD="h0p6B5Fc5hs4WkZV"
ACCESS_TOKEN="sbp_3dc2a2aa6b397ddf8e1c0ae512ac193e4915a2fe"

# Export environment variables
export SUPABASE_ACCESS_TOKEN="$ACCESS_TOKEN"
export SUPABASE_DB_PASSWORD="$DB_PASSWORD"

echo "🚀 Starting Supabase Migration..."
echo "Project: $PROJECT_REF"
echo ""

# Try to link the project
echo "📌 Linking to Supabase project..."
supabase link --project-ref "$PROJECT_REF" --password "$DB_PASSWORD" --debug

# Check link status
if [ $? -ne 0 ]; then
    echo "❌ Failed to link to project. Trying alternative connection..."
    
    # Try direct connection with different pooler
    DATABASE_URL="postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres"
    echo "🔄 Using alternative connection: $DATABASE_URL"
    
    # Test connection
    echo "SELECT version();" | supabase db query --db-url "$DATABASE_URL"
else
    echo "✅ Successfully linked to project"
fi

# Push migrations
echo ""
echo "📤 Pushing migrations..."
supabase db push --include-all

# Show migration status
echo ""
echo "📊 Migration status:"
supabase migration list

echo ""
echo "✨ Migration process complete!"