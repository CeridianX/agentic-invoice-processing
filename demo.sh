#!/bin/bash

echo "🚀 Xelix Agentic Invoice Processing Demo"
echo "======================================="

# Check if we're in the right directory
if [ ! -d "agentic-invoice-app" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

echo ""
echo "📋 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js $(node --version) found"
echo "✅ npm $(npm --version) found"

echo ""
echo "📦 Installing dependencies..."

# Install backend dependencies
echo "Installing backend dependencies..."
cd agentic-invoice-app/server
npm install

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd ../agentic-invoice-app
npm install

echo ""
echo "🗄️ Setting up database..."
cd ../server

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed the database
echo "Seeding database with realistic mock data..."
npx ts-node src/seed.ts

echo ""
echo "🎯 Demo Instructions:"
echo "====================="
echo ""
echo "1. Start the backend server:"
echo "   cd agentic-invoice-app/server"
echo "   npm run dev"
echo ""
echo "2. In a new terminal, start the frontend:"
echo "   cd agentic-invoice-app/agentic-invoice-app"
echo "   npm run dev"
echo ""
echo "3. Open your browser to: http://localhost:5173"
echo ""
echo "🌟 Key Features to Explore:"
echo "=========================="
echo ""
echo "• Global Agent Status Bar (top)"
echo "  - Watch real-time agent activity"
echo "  - See processing queue updates"
echo "  - Notification counter"
echo ""
echo "• Invoice List View"
echo "  - Agent suggestion banners for auto-approval"
echo "  - Bulk action recommendations"
echo "  - Confidence scores and exception indicators"
echo ""
echo "• Invoice Detail View (click any invoice)"
echo "  - Line-item matching interface"
echo "  - AI-powered suggestions with confidence scores"
echo "  - Visual variance highlighting"
echo "  - Exception handling"
echo ""
echo "📊 Sample Data Includes:"
echo "======================="
echo "• 30 invoices with realistic AP scenarios"
echo "• 5 vendors (TechCorp, Office Supplies Plus, etc.)"
echo "• Various matching scenarios:"
echo "  - Perfect matches (40%)"
echo "  - Quantity variances (20%)"
echo "  - Price variances (15%)"
echo "  - Description mismatches (10%)"
echo "  - Complex scenarios (15%)"
echo ""
echo "🤖 Agent Intelligence:"
echo "====================="
echo "• Background processing simulation"
echo "• Pattern recognition"
echo "• Smart matching suggestions"
echo "• Exception detection"
echo "• Learning from user actions"
echo ""
echo "✨ Ready to launch! Follow the instructions above to start the demo."