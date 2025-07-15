# 🚀 Vercel Deployment Guide for Jarvis API

This guide will deploy your backend API to Vercel so Jarvis can access real-time invoice data.

## 📋 **Prerequisites**

1. **Vercel CLI installed**: `npm i -g vercel`
2. **GitHub account** (recommended for automatic deployments)
3. **Your ElevenLabs API key**

## 🎯 **Step 1: Prepare for Deployment**

### A. Navigate to Backend Directory
```bash
cd /Users/dariuszgralak/Documents/Projects/agentic-invoice-processing-poc/agentic-invoice-app/server
```

### B. Update package.json for Vercel
```bash
# Replace package.json with Vercel-optimized version
cp package.json.vercel package.json
```

## 🗄️ **Step 2: Set Up Cloud Database**

### Option A: Vercel Postgres (Recommended)

1. **Login to Vercel**:
   ```bash
   vercel login
   ```

2. **Create Vercel Postgres Database**:
   ```bash
   vercel postgres create jarvis-db
   ```

3. **Get connection string** (save this for later):
   ```bash
   vercel env ls
   # Look for POSTGRES_PRISMA_URL
   ```

### Option B: Supabase (Alternative)

1. Go to [supabase.com](https://supabase.com) and create a project
2. Get your connection string from Settings → Database
3. Format: `postgresql://user:password@host:port/database`

### Option C: PlanetScale (Alternative)

1. Go to [planetscale.com](https://planetscale.com) and create a database
2. Get your connection string
3. Format: `mysql://user:password@host:port/database`

## 🔧 **Step 3: Update Database Configuration**

### A. Update Prisma Schema for Cloud Database

```bash
# Edit prisma/schema.prisma
```

**Replace the datasource block:**
```prisma
// For PostgreSQL (Vercel Postgres/Supabase)
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// OR for MySQL (PlanetScale)
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

### B. Create Production Environment File
```bash
# Create .env.production
echo "DATABASE_URL=your_cloud_database_url_here" > .env.production
echo "ELEVENLABS_API_KEY=your_elevenlabs_api_key" >> .env.production
echo "ELEVENLABS_VOICE_ID=cgSgspJ2msm6clMCkdW9" >> .env.production
```

## 🚀 **Step 4: Deploy to Vercel**

### A. Initialize Vercel Project
```bash
vercel
```

**Answer prompts:**
- Set up and deploy? → **Y**
- Which scope? → **Your account**
- Link to existing project? → **N**
- Project name? → **jarvis-api** (or your preference)
- In which directory? → **./** (current directory)
- Want to override settings? → **N**

### B. Set Environment Variables
```bash
# Set your database URL
vercel env add DATABASE_URL production
# Paste your cloud database connection string

# Set ElevenLabs API key
vercel env add ELEVENLABS_API_KEY production
# Paste your ElevenLabs API key

# Set voice ID
vercel env add ELEVENLABS_VOICE_ID production
# Enter: cgSgspJ2msm6clMCkdW9
```

### C. Deploy to Production
```bash
vercel --prod
```

**You'll get a URL like:** `https://jarvis-api-abc123.vercel.app`

## 🗄️ **Step 5: Set Up Database Schema**

### A. Generate and Push Schema
```bash
# Generate Prisma client for new database
npx prisma generate

# Push schema to cloud database
npx prisma db push
```

### B. Seed with Your Invoice Data
```bash
# Run your existing seed script (if you have one)
npx prisma db seed

# OR manually create some test invoices via the API
```

## 🧪 **Step 6: Test Deployed API**

### Test if your API is working:
```bash
# Replace with your actual Vercel URL
curl https://jarvis-api-abc123.vercel.app/api/jarvis/status

# Test Jarvis tools
curl -X POST https://jarvis-api-abc123.vercel.app/api/jarvis-tools/get-portfolio-summary
```

**Expected response:** Real invoice data, not errors

## 🤖 **Step 7: Update ElevenLabs Agent Configuration**

1. **Go to your ElevenLabs agent**: [elevenlabs.io](https://elevenlabs.io) → Agents → Jarvis

2. **Update ALL tool URLs** to use your Vercel URL:

   **Before:**
   ```
   http://localhost:3001/api/jarvis-tools/get-portfolio-summary
   ```

   **After:**
   ```
   https://jarvis-api-abc123.vercel.app/api/jarvis-tools/get-portfolio-summary
   ```

3. **Update these 5 tools:**
   - `get-portfolio-summary`
   - `get-invoice-details` 
   - `get-invoices-by-status`
   - `get-urgent-invoices`
   - `get-recent-activity`

## ✅ **Step 8: Test Jarvis with Real Data**

1. **Activate Jarvis** in your frontend
2. **Ask**: *"What's the highest invoice amount in the system?"*
3. **Expected**: Jarvis should now give you REAL data instead of hallucinated numbers

**Before:** *"Approximately $125,000..."* (wrong)
**After:** *"The highest invoice is $16,285.82 for DEMO-2025-0004..."* (correct!)

## 🔄 **Step 9: Automatic Deployments (Optional)**

### Connect to GitHub for Auto-Deploy:

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Add Vercel deployment configuration"
   git push
   ```

2. **Connect Vercel to GitHub**:
   - Go to [vercel.com](https://vercel.com) dashboard
   - Import your repository
   - Set same environment variables
   - Enable automatic deployments

## 🎯 **What You'll Have After Deployment**

✅ **Public API URL**: `https://jarvis-api-abc123.vercel.app`
✅ **Jarvis Tools Working**: Real-time invoice data access
✅ **Production Ready**: 99.9% uptime, no connection limits
✅ **Auto-scaling**: Handles traffic spikes automatically
✅ **HTTPS**: Secure communication with ElevenLabs

## 🆘 **Troubleshooting**

### Common Issues:

**Build fails**:
- Check TypeScript errors: `npm run build`
- Verify all dependencies in package.json

**Database connection fails**:
- Verify DATABASE_URL is correct
- Check database is accepting connections
- Run `npx prisma db push` to sync schema

**Jarvis still hallucinating**:
- Verify Vercel URL is accessible: `curl https://your-url.vercel.app/api/jarvis/status`
- Check ElevenLabs tool configuration uses correct URLs
- Test individual endpoints manually

**Environment variables not working**:
- Verify they're set in Vercel dashboard
- Redeploy after adding env vars: `vercel --prod`

## 🎉 **Success Indicators**

- ✅ Vercel deployment succeeds
- ✅ API endpoints return real data
- ✅ Jarvis gives exact invoice amounts
- ✅ No more hallucinated numbers
- ✅ Server logs show webhook calls from ElevenLabs

**Once this is working, you'll have a production-grade Jarvis with real-time access to your invoice data!** 🤖✨