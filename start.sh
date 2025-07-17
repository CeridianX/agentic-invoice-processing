#!/bin/sh

echo "🚀 Starting application..."
echo "📊 NODE_ENV: ${NODE_ENV}"
echo "🔌 PORT: ${PORT}"

# Export environment variables to ensure they're available
export NODE_ENV="${NODE_ENV:-production}"
export PORT="${PORT:-3000}"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL is not set!"
  echo "Available environment variables:"
  env | grep -E "DATABASE|NODE_ENV|PORT" || echo "No relevant vars found"
  exit 1
else
  echo "✅ DATABASE_URL is set (length: ${#DATABASE_URL})"
fi

# Navigate to server directory
cd /app/agentic-invoice-app/server || exit 1

# Try to run migrations with error handling
echo "🔄 Running database migrations..."
if npx prisma migrate deploy; then
  echo "✅ Migrations completed successfully"
else
  echo "⚠️  Migration failed, trying to push schema..."
  # If migrations fail, try to push the schema (for fresh databases)
  if npx prisma db push --skip-generate; then
    echo "✅ Schema pushed successfully"
  else
    echo "❌ Failed to setup database"
    echo "🔍 Testing database connection..."
    echo "SELECT 1" | npx prisma db execute --stdin || echo "Database connection test failed"
    
    # Try to start anyway - the app might work without migrations
    echo "⚠️  Starting app without database migrations..."
  fi
fi

# Generate Prisma client (in case it's missing)
echo "📦 Generating Prisma client..."
npx prisma generate || echo "⚠️  Prisma generate failed, continuing..."

# Start the application
echo "🎯 Starting Node.js server on port ${PORT}..."
exec npm start