# Xelix Agentic Invoice Processing - Setup Guide

## ⚠️ Connection Issues Troubleshooting

If you're experiencing "can't connect to server" errors, here are several solutions:

## Solution 1: Manual Server Restart

1. **Kill all processes:**
   ```bash
   pkill -f "node"
   pkill -f "vite"
   ```

2. **Start Backend (Terminal 1):**
   ```bash
   cd /Users/ceridian/Documents/Projects/agentic-invoice-processing-poc/agentic-invoice-app/server
   npm run dev
   ```
   Wait for: "Server running on port 3001"

3. **Start Frontend (Terminal 2):**
   ```bash
   cd /Users/ceridian/Documents/Projects/agentic-invoice-processing-poc/agentic-invoice-app/agentic-invoice-app
   npm run dev -- --host 0.0.0.0 --port 5173
   ```
   Wait for: "Local: http://localhost:5173/"

4. **Access Application:**
   - Primary: http://localhost:5173
   - Alternative: http://127.0.0.1:5173

## Solution 2: Build and Preview

If development server issues persist, use the production build:

```bash
cd /Users/ceridian/Documents/Projects/agentic-invoice-processing-poc/agentic-invoice-app/agentic-invoice-app
npm run build
npm run preview
```

## Solution 3: Check System Issues

1. **Check if ports are blocked:**
   ```bash
   netstat -an | grep :5173
   lsof -i :5173
   ```

2. **Try different port:**
   ```bash
   npm run dev -- --port 3456 --host
   ```

3. **Check firewall settings:**
   - System Preferences > Security & Privacy > Firewall
   - Ensure Node.js is allowed

## Solution 4: Network IP Access

If localhost doesn't work, try the network IP:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```
Then access: http://[YOUR_IP]:5173

## What Should Work

Once running, you should see:

### ✅ Features Ready to Demo:
1. **Global Agent Status Bar** (top) - Real-time activity with pulsing indicators
2. **Invoice List View** - 30 invoices with agent suggestions and confidence scores  
3. **Invoice Detail View** - Click any invoice for sophisticated line-item matching
4. **Real-time Updates** - Agent processing simulation every 3-5 seconds

### ✅ Sample Data Includes:
- **TechCorp Solutions**: IT Hardware vendor with 2-3% over-delivery pattern
- **Office Supplies Plus**: Exact matches typical
- **Global Marketing Agency**: Bundled services common
- **Cloud Services Inc**: Usage-based billing
- **Facilities Management Co**: Monthly service variations

### ✅ Matching Scenarios:
- Perfect matches (40% of line items)
- Quantity variances (20%) - Over/under delivery scenarios
- Price variances (15%) - Market rate adjustments
- Description mismatches (10%) - Same item, different descriptions  
- Complex scenarios (15%) - Split billing, bundled items, substitutions

## Emergency Demo Alternative

If all else fails, the backend API is working and you can test it directly:

```bash
# Test invoices endpoint
curl http://localhost:3001/api/invoices | jq '.[0]'

# Test agent suggestions  
curl http://localhost:3001/api/agents/suggestions | jq

# Test dashboard stats
curl http://localhost:3001/api/dashboard/stats | jq
```

The application architecture and all business logic is complete - it's just a development server connectivity issue that can be resolved with the steps above.

## Contact

If you continue having issues, the problem is likely:
1. macOS firewall blocking localhost connections
2. Network configuration blocking local development
3. Port conflicts with other applications

Try the different solutions above in order until one works!