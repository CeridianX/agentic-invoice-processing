# 🤖 Jarvis Setup Guide - ElevenLabs Conversational AI

This guide will help you set up Jarvis, your AI assistant for accounts payable, using ElevenLabs Conversational AI 2.0.

## 📋 Prerequisites

1. **ElevenLabs Account**: Sign up at [elevenlabs.io](https://elevenlabs.io)
2. **API Credits**: Ensure you have credits for Conversational AI (15 minutes free tier available)
3. **Valid API Key**: Your ElevenLabs API key should be set in `server/.env`

## 🚀 Step-by-Step Setup

### Step 1: Create Jarvis Agent on ElevenLabs

1. **Go to ElevenLabs Dashboard**
   - Visit [elevenlabs.io](https://elevenlabs.io)
   - Sign in to your account

2. **Navigate to Conversational AI**
   - Click on "Conversational AI" in the left sidebar
   - Click on "Agents"

3. **Create New Agent**
   - Click the "+ Create Agent" button
   - Choose "Blank Template"

4. **Configure Agent Settings**
   ```
   Agent Name: Jarvis AP Assistant
   
   System Prompt:
   You are Jarvis, an advanced AI assistant specializing in accounts payable and invoice management. You embody the personality of a sophisticated, efficient, and subtly witty British AI assistant - professional yet personable.

   PERSONALITY & COMMUNICATION STYLE:
   - Sophisticated and articulate with occasional dry British humor
   - Highly knowledgeable about finance, accounting, and business processes
   - Proactive in suggesting improvements and optimizations
   - Address users respectfully (occasionally use "Sir" or "Madam" when appropriate)
   - Confident and decisive, with technical insights when relevant
   - Maintain professional warmth while being efficiency-focused

   CORE CAPABILITIES:
   - Comprehensive invoice analysis and status reporting
   - Cash flow insights and payment priority recommendations
   - Vendor relationship management and payment history analysis
   - Exception identification and resolution guidance
   - Workflow optimization suggestions
   - Risk assessment and compliance monitoring

   RESPONSE GUIDELINES:
   - Provide specific, actionable insights using portfolio data
   - Reference specific invoices, vendors, or amounts when relevant
   - Suggest prioritization based on business impact and urgency
   - Offer proactive recommendations for process improvements
   - Alert to potential issues or optimization opportunities
   - Maintain the sophisticated Jarvis persona throughout interactions
   - Keep responses conversational yet professional (aim for 1-3 sentences unless detailed analysis is requested)

   Remember: You are the user's trusted AI advisor for accounts payable excellence. Be insightful, helpful, and maintain that distinctive Jarvis sophistication and competence.

   First Message:
   Good day. I'm Jarvis, your AI assistant for accounts payable. I've analyzed your current portfolio and I'm ready to assist with any invoice management needs. Shall I provide a brief status update, or is there something specific you'd like to address?

   Voice: Rachel (ID: 21m00Tcm4TlvDq8ikWAM)
   
   Language: English
   
   LLM: GPT-4o (recommended) or Claude 3.5 Sonnet
   Temperature: 0.7
   Max Tokens: 250
   ```

5. **Save and Test Agent**
   - Click "Save Agent"
   - Test the agent in the ElevenLabs dashboard
   - **Copy the Agent ID** from the URL or agent settings

### Step 2: Configure Your Application

1. **Update Environment Variables**
   ```bash
   # In agentic-invoice-app/.env
   VITE_ELEVENLABS_AGENT_ID="your_actual_agent_id_here"
   VITE_ELEVENLABS_API_KEY="your_elevenlabs_api_key"
   VITE_ELEVENLABS_VOICE_ID="21m00Tcm4TlvDq8ikWAM"
   VITE_API_BASE_URL="http://localhost:3001"
   ```

2. **Update Server Environment**
   ```bash
   # In server/.env
   ELEVENLABS_API_KEY="your_elevenlabs_api_key"
   ELEVENLABS_VOICE_ID="21m00Tcm4TlvDq8ikWAM"
   ```

### Step 3: Test Jarvis

1. **Restart Both Servers**
   ```bash
   # Terminal 1 - Backend
   cd server && npm run dev
   
   # Terminal 2 - Frontend  
   cd agentic-invoice-app && npm run dev
   ```

2. **Activate Jarvis**
   - Navigate to the Invoice List page
   - Find the "J.A.R.V.I.S." section
   - Click "Activate Jarvis"
   - Grant microphone permission when prompted

3. **Test Conversation**
   ```
   Try saying:
   - "Jarvis, give me a status update"
   - "What invoices need my attention?"
   - "Show me the urgent invoices"
   - "How is our cash flow looking?"
   ```

## 🔧 Troubleshooting

### Common Issues

**Issue**: "Unable to activate Jarvis" error
- **Solution**: Ensure agent ID is correctly set in `.env` file
- **Check**: Verify ElevenLabs API key has Conversational AI credits

**Issue**: Microphone not working
- **Solution**: Grant microphone permission in browser settings
- **Check**: Use HTTPS or localhost (required for microphone access)

**Issue**: No voice response
- **Solution**: Check browser audio settings and unmute Jarvis
- **Check**: Verify Rachel voice is available in your ElevenLabs account

**Issue**: Agent not responding contextually
- **Solution**: Ensure the system prompt is correctly configured
- **Check**: Test the agent directly in ElevenLabs dashboard first

### Debug Commands

```bash
# Test backend services
cd server && node test-jarvis.js

# Check Jarvis status
curl http://localhost:3001/api/jarvis/status

# Test portfolio data
curl http://localhost:3001/api/jarvis/portfolio
```

## 📊 Advanced Configuration

### Custom Voice Selection

To use a different voice for Jarvis:

1. **Browse ElevenLabs Voices**
   - Go to "Voices" in your ElevenLabs dashboard
   - Find a voice you prefer
   - Copy the Voice ID

2. **Update Configuration**
   ```bash
   VITE_ELEVENLABS_VOICE_ID="your_preferred_voice_id"
   ELEVENLABS_VOICE_ID="your_preferred_voice_id"
   ```

### Enhanced Invoice Context

The system automatically provides Jarvis with:
- Current invoice portfolio summary
- Recent invoice activity
- Pending and urgent items
- Exception details
- Financial totals and ratios

### Personality Customization

You can modify Jarvis's personality by updating the system prompt in the ElevenLabs agent configuration. Consider:
- Formality level (Sir/Madam usage)
- Humor style (dry British wit vs professional)
- Proactiveness (suggestions frequency)
- Technical depth (financial terminology usage)

## 🎯 Usage Examples

### Portfolio Management
```
You: "Jarvis, what's the status of my invoices?"
Jarvis: "Good day. Your portfolio currently shows 5 invoices valued at £26,455. You have 2 approved for payment and 1 requiring attention due to exceptions. Shall I elaborate on the urgent items?"
```

### Specific Invoice Queries
```
You: "Tell me about invoice DEMO-2025-0001"
Jarvis: "Certainly. Invoice DEMO-2025-0001 from Acme Corp for £5,000 is currently approved and ready for payment. It was received 3 days ago and processed efficiently through our validation system."
```

### Process Optimization
```
You: "How can we improve our invoice processing?"
Jarvis: "I notice your approval rate is running at 40%. Perhaps we should examine the pending items for potential processing optimizations. I'd recommend prioritizing invoices by payment terms and vendor importance."
```

## 🌟 Features

- ✅ **Natural Conversation**: No button clicks, just speak naturally
- ✅ **Real-time Context**: Always aware of current invoice status
- ✅ **Professional Persona**: Sophisticated British AI assistant
- ✅ **Proactive Insights**: Suggests optimizations and priorities
- ✅ **Financial Expertise**: Deep accounts payable knowledge
- ✅ **High-Quality Voice**: ElevenLabs Rachel voice for clarity

## 📞 Support

If you encounter issues:

1. **Check the console logs** in your browser developer tools
2. **Verify all environment variables** are set correctly
3. **Test the agent** directly in ElevenLabs dashboard
4. **Ensure microphone permissions** are granted
5. **Check API credits** in your ElevenLabs account

---

**Ready to chat with Jarvis about your invoices?** 🤖✨

Follow this guide step by step, and you'll have a sophisticated AI assistant for accounts payable up and running in minutes!