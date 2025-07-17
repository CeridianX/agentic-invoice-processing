#!/bin/sh

echo "🚀 Starting application..."
echo "📊 Environment: ${NODE_ENV}"
echo "🔌 Port: ${PORT}"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL is not set!"
  exit 1
else
  echo "✅ DATABASE_URL is set"
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
    exit 1
  fi
fi

# Start the application
echo "🎯 Starting Node.js server..."
exec npm start