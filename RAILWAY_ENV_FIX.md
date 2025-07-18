# 🚂 Railway Environment Variables Fix

## 🚨 **Problem Found**
The `.env` file is in `.gitignore`, so the updated environment variables aren't being deployed to Railway.

## ✅ **Solution: Set Environment Variables in Railway**

Run these commands to set the environment variables directly in Railway:

```bash
# Login to Railway
railway login

# Set frontend environment variables
railway variables set VITE_ELEVENLABS_API_KEY="your-elevenlabs-api-key"
railway variables set VITE_ELEVENLABS_VOICE_ID="your-elevenlabs-voice-id"
railway variables set VITE_ELEVENLABS_AGENT_ID="your-elevenlabs-agent-id"
railway variables set VITE_API_BASE_URL="https://agentic-invoice-processing-production-d734.up.railway.app"

# Set backend environment variables
railway variables set ELEVENLABS_API_KEY="your-elevenlabs-api-key"
railway variables set ELEVENLABS_VOICE_ID="your-elevenlabs-voice-id"
railway variables set OPENAI_API_KEY="your-openai-api-key"
railway variables set OPENAI_MODEL="gpt-4o-mini"
railway variables set EMAIL_FROM="ai-invoice-system@xelix.com"
railway variables set EMAIL_PROCUREMENT_TEAM="procurement@xelix.com"
```

## 🔄 **Trigger Redeploy**
After setting the variables, redeploy:

```bash
railway redeploy
```

## 🧪 **Test the Fix**
After deployment, test the API endpoint:

```bash
curl https://agentic-invoice-processing-production-d734.up.railway.app/api/jarvis-tools/get-portfolio-summary \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{}'
```

Should return JSON data instead of 404 or connection refused.

## 📋 **Alternative: Create Production .env**
If you prefer to use a file, create a `.env.production` file (not ignored by git):

```bash
# .env.production
VITE_ELEVENLABS_API_KEY="sk_71a3fa9fe6b017d0b46fb74a371ad362480a08104b344de1"
VITE_ELEVENLABS_VOICE_ID="cgSgspJ2msm6clMCkdW9"
VITE_ELEVENLABS_AGENT_ID="agent_01jz5vr08afyqv30awpxmv2nxz"
VITE_API_BASE_URL="https://agentic-invoice-processing-production-d734.up.railway.app"
```

Then update the Dockerfile to copy the production env file during build.