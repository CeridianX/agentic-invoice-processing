# Xelix Agentic Invoice Processing App

A modern web application for Accounts Payable teams featuring AI agents as helpful assistants throughout the invoice processing workflow. Built with sophisticated line-item matching capabilities and real-time agent insights.

## Features

- **AI-Powered Processing**: Intelligent agents that proactively help with routine AP work
- **Line-Item Matching**: Advanced 3-way matching between invoices, purchase orders, and goods receipts
- **Real-Time Updates**: WebSocket-powered agent activity monitoring
- **Agent Insights**: Smart suggestions for bulk approvals and early payment discounts
- **Exception Handling**: Automated detection and resolution suggestions for variances
- **Professional UI**: Clean, modern interface with shadcn/ui components

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + Framer Motion
- **Backend**: Express.js + TypeScript + WebSocket
- **Database**: SQLite + Prisma ORM
- **UI Components**: shadcn/ui (Radix UI primitives)

## Project Structure

```
agentic-invoice-processing-poc/
├── agentic-invoice-app/
│   ├── agentic-invoice-app/          # Frontend React app
│   │   ├── src/
│   │   │   ├── components/           # UI components
│   │   │   │   ├── ui/              # shadcn/ui components
│   │   │   │   ├── AgentStatusBar.tsx
│   │   │   │   ├── InvoiceList.tsx
│   │   │   │   └── InvoiceDetail.tsx
│   │   │   ├── services/            # API services
│   │   │   ├── types/               # TypeScript types
│   │   │   └── App.tsx
│   │   └── package.json
│   └── server/                      # Backend Express server
│       ├── src/
│       │   ├── routes/              # API routes
│       │   ├── seed.ts              # Database seeding
│       │   └── index.ts
│       ├── prisma/
│       │   └── schema.prisma        # Database schema
│       └── package.json
```

## Database Schema

Comprehensive schema includes:
- **Core Tables**: invoices, vendors, purchase_orders
- **Line Items**: invoice_line_items, po_line_items with detailed matching
- **3-Way Matching**: goods_receipts, goods_receipt_line_items
- **Agent Intelligence**: agent_activities, exceptions, matching_activities

## Installation & Setup

1. **Install Dependencies**
   ```bash
   # Backend dependencies
   cd agentic-invoice-app/server
   npm install
   
   # Frontend dependencies  
   cd ../agentic-invoice-app
   npm install
   ```

2. **Setup Database**
   ```bash
   cd ../server
   npx prisma generate
   npx prisma migrate dev --name init
   npx ts-node src/seed.ts
   ```

3. **Start Development Servers**
   ```bash
   # Terminal 1 - Backend (runs on port 3001)
   cd server
   npm run dev
   
   # Terminal 2 - Frontend (runs on port 5173)
   cd ../agentic-invoice-app
   npm run dev
   ```

4. **Access Application**
   - Frontend: http://localhost:5173
   - API: http://localhost:3001/api

## Key Features Demo

### 1. Global Agent Status Bar
- Real-time agent activity indicator
- Processing queue counter
- Notification system for completed tasks

### 2. Invoice List with Agent Insights
- Smart suggestion banners for auto-approval opportunities
- Bulk action recommendations
- Confidence scores for agent decisions
- Exception highlighting

### 3. Line-Item Matching Interface
- Visual comparison of invoice vs PO lines
- AI-powered matching suggestions with confidence scores
- Variance detection and explanation
- One-click acceptance of suggested matches

### 4. Complex Matching Scenarios
- **Perfect Matches**: Exact SKU, quantity, and price alignment
- **Quantity Variances**: Over/under delivery scenarios with explanations
- **Price Variances**: Market rate adjustments and contract terms
- **Description Mismatches**: Same item, different vendor descriptions
- **Split Billing**: One PO line → multiple invoice lines
- **Bundled Items**: Multiple PO lines → one invoice line
- **Substitute Items**: Alternative products with notes

## Mock Data

The seed script generates 50+ realistic invoices with:
- 5 vendors across different categories (IT, Office Supplies, Marketing, etc.)
- 30 purchase orders with multi-line items
- 20 goods receipts for 3-way matching
- Various matching scenarios (40% perfect, 20% quantity variance, 15% price variance, etc.)
- Realistic GL accounts, cost centers, and department codes
- Agent activities and exception records

## Agent Behaviors

### Background Processing
- Continuous invoice processing simulation
- Pattern recognition and learning
- Exception detection and flagging

### Intelligent Matching
- Fuzzy matching with confidence scores
- Historical pattern analysis
- Vendor-specific variance tolerance
- Smart substitution detection

### Contextual Intelligence
- "This vendor typically delivers 2-3% over quantity"
- Early payment discount opportunities
- Learning from user corrections

## API Endpoints

### Invoices
- `GET /api/invoices` - List invoices with filters
- `GET /api/invoices/:id` - Get invoice details
- `PATCH /api/invoices/:id/status` - Update status
- `POST /api/invoices/:id/line-items/:lineId/match` - Create line match
- `GET /api/invoices/:id/line-items/:lineId/suggestions` - Get match suggestions
- `POST /api/invoices/bulk-approve` - Bulk approve invoices

### Agents
- `GET /api/agents/activities` - Recent agent activities
- `GET /api/agents/insights` - Processing insights and patterns
- `GET /api/agents/suggestions` - Smart recommendations

### Dashboard
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/dashboard/time-series` - Historical data for charts

## Design Philosophy

The app embodies the "Iron Man's Jarvis for accounting" concept:
- **Incredibly Capable**: Handles complex scenarios automatically
- **Never Condescending**: Explains decisions transparently
- **Always Learning**: Improves from user feedback
- **Empowering**: Makes users feel enhanced, not replaced

## Future Enhancements

- Machine learning model integration
- OCR for invoice document processing
- Advanced analytics dashboard
- Mobile-responsive design
- Multi-currency support
- Integration with ERP systems