#!/bin/bash

# Set Vercel environment variables for production
echo "Setting Vercel environment variables..."

# Set Supabase URL
echo "https://moszlrvkzrpmhvzmpiqk.supabase.co" | vercel env add NEXT_PUBLIC_SUPABASE_URL production --yes

# Set Supabase Anon Key
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vc3pscnZrenJwbWh2em1waXFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzU3ODYsImV4cCI6MjA3MjY1MTc4Nn0.OnBxt9PQs37WudhpAS8nMpTpuLKOn1IUd_BoDOprVHE" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production --yes

# Set Supabase Service Role Key
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vc3pscnZrenJwbWh2em1waXFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA3NTc4NiwiZXhwIjoyMDcyNjUxNzg2fQ.wPyda52qH8UviX4SIX3aPPcOaPL1m1AqXQiFVlMQBfs" | vercel env add SUPABASE_SERVICE_ROLE_KEY production --yes

# Set JWT Secret
echo "geulpi-calendar-jwt-secret-2024-secure-key" | vercel env add JWT_SECRET production --yes

echo "Environment variables set successfully!"