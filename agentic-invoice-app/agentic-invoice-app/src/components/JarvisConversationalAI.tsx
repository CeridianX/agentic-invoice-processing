import React, { useState, useEffect, useCallback } from 'react';
import { useConversation } from '@elevenlabs/react';
import { Bot, Mic, MicOff, Volume2, VolumeX, Settings, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface JarvisConversationalAIProps {
  onInvoiceSelect?: (invoiceId: string) => void;
  onActionRequest?: (action: string, data?: any) => void;
}

interface InvoiceData {
  total: number;
  pending: number;
  approved: number;
  exceptions: number;
  recentInvoices: Array<{
    id: string;
    number: string;
    vendor: string;
    amount: number;
    status: string;
  }>;
}

export default function JarvisConversationalAI({ 
  onInvoiceSelect, 
  onActionRequest 
}: JarvisConversationalAIProps) {
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{
    type: 'user' | 'jarvis';
    message: string;
    timestamp: Date;
  }>>([]);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [agentStatus, setAgentStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');

  // ElevenLabs Conversational AI hook
  const conversation = useConversation({
    onConnect: () => {
      console.log('🤖 Jarvis connected');
      setAgentStatus('listening');
    },
    onDisconnect: () => {
      console.log('🤖 Jarvis disconnected');
      setAgentStatus('idle');
      setIsActive(false);
    },
    onMessage: (message) => {
      console.log('🗣️ Jarvis said:', message);
      // Handle both string and object message formats
      const messageText = typeof message === 'string' ? message : 
                         message?.message || message?.text || 
                         JSON.stringify(message);
      addToHistory('jarvis', messageText);
    },
    onError: (error) => {
      console.error('🚨 Jarvis error:', error);
      addToHistory('jarvis', "I apologize, but I'm experiencing technical difficulties. Please try again in a moment.");
    },
    onModeChange: (mode) => {
      console.log('🎭 Mode changed:', mode);
      setAgentStatus(mode === 'speaking' ? 'speaking' : 'listening');
    },
    onToolCall: async (toolCall) => {
      console.log('🔧 Tool call received:', toolCall);
      
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL;
        let endpoint = '';
        let body = {};
        
        // Map tool calls to API endpoints
        if (toolCall.name === 'get-portfolio-summary' || toolCall.parameters?.action === 'get-portfolio-summary') {
          endpoint = '/api/jarvis-tools/get-portfolio-summary';
        } else if (toolCall.name === 'get-invoice-details' || toolCall.parameters?.invoice_action === 'get-invoice-details') {
          endpoint = '/api/jarvis-tools/get-invoice-details';
          body = { invoiceId: toolCall.parameters?.invoice_id };
        } else if (toolCall.name === 'get-invoices-by-status' || toolCall.parameters?.status_action === 'get-invoices-by-status') {
          endpoint = '/api/jarvis-tools/get-invoices-by-status';
          body = { status: toolCall.parameters?.invoice_status };
        } else if (toolCall.name === 'get-urgent-invoices' || toolCall.parameters?.urgent_action === 'get-urgent-invoices') {
          endpoint = '/api/jarvis-tools/get-urgent-invoices';
        } else if (toolCall.name === 'get-recent-activity' || toolCall.parameters?.activity_action === 'get-recent-activity') {
          endpoint = '/api/jarvis-tools/get-recent-activity';
        }
        
        if (!endpoint) {
          console.error('Unknown tool:', toolCall.name);
          return { error: 'Unknown tool requested' };
        }
        
        const response = await fetch(`${baseUrl}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        
        const data = await response.json();
        console.log('🎯 Tool response:', data);
        
        return data;
      } catch (error) {
        console.error('Tool execution error:', error);
        return { error: 'Failed to execute tool' };
      }
    }
  });

  // Fetch current invoice data for context
  const fetchInvoiceData = useCallback(async () => {
    try {
      // Use the Jarvis portfolio endpoint instead
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/jarvis/portfolio`);
      if (response.ok) {
        const portfolioData = await response.json();

        const invoiceContext: InvoiceData = {
          total: portfolioData.totalInvoices || 0,
          pending: portfolioData.pendingInvoices || 0,
          approved: portfolioData.approvedInvoices || 0,
          exceptions: portfolioData.exceptionsCount || 0,
          recentInvoices: (portfolioData.recentInvoices || []).slice(0, 5).map((inv: any) => ({
            id: inv.id,
            number: inv.invoiceNumber,
            vendor: inv.vendor || 'Unknown',
            amount: inv.amount,
            status: inv.status
          }))
        };

        setInvoiceData(invoiceContext);
        return invoiceContext;
      }
    } catch (error) {
      console.error('Error fetching invoice data:', error);
    }
    return null;
  }, []);

  // Add message to conversation history
  const addToHistory = (type: 'user' | 'jarvis', message: string) => {
    setConversationHistory(prev => [...prev, {
      type,
      message,
      timestamp: new Date()
    }]);
  };

  // Create dynamic configuration for Jarvis with invoice context
  const createJarvisConfig = (invoiceData: InvoiceData | null) => {
    const contextData = invoiceData ? `
Current Invoice Portfolio:
- Total Invoices: ${invoiceData.total}
- Pending Processing: ${invoiceData.pending}
- Approved: ${invoiceData.approved}
- Requiring Attention: ${invoiceData.exceptions}

Recent Invoices:
${invoiceData.recentInvoices.map(inv => 
  `- ${inv.number}: ${inv.vendor} - $${inv.amount.toLocaleString()} (${inv.status})`
).join('\n')}` : 'Invoice data is being loaded...';

    return {
      agent: {
        prompt: {
          prompt: `You are Jarvis, an advanced AI assistant specializing in accounts payable and invoice management. You have the personality of a sophisticated, efficient, and slightly witty British AI assistant.

PERSONALITY TRAITS:
- Professional yet personable, with subtle dry humor
- Extremely knowledgeable about finance and accounting
- Proactive in suggesting improvements and optimizations
- Address the user respectfully (you may use "Sir" or "Madam" occasionally)
- Speak in a confident, articulate manner with occasional technical insights

CAPABILITIES:
- Analyze invoice statuses and financial data
- Provide insights on cash flow and payment priorities
- Help locate specific invoices and vendors
- Suggest workflow optimizations
- Alert about exceptions and issues requiring attention

CURRENT DATA CONTEXT:
${contextData}

RESPONSE GUIDELINES:
- Keep responses conversational but informative
- Use actual data from the portfolio when relevant
- Suggest specific actions when appropriate
- If asked about specific invoices, mention if you can help locate them
- Maintain the sophisticated Jarvis persona throughout

Remember: You are an AI assistant focused on accounts payable excellence. Be helpful, insightful, and maintain that distinctive Jarvis charm.`
        },
        first_message: "Good day. I'm Jarvis, your Xelix AI assistant for accounts payable. I've analyzed your current portfolio and I'm ready to assist with any invoice management needs. How may I help you today?",
        language: "en"
      },
      tts: {
        voice_id: "21m00Tcm4TlvDq8ikWAM" // Rachel voice - sophisticated and clear
      },
      custom_llm_extra_body: {
        temperature: 0.7,
        max_tokens: 200
      },
      dynamic_variables: {
        total_invoices: invoiceData?.total.toString() || "0",
        pending_invoices: invoiceData?.pending.toString() || "0",
        approved_invoices: invoiceData?.approved.toString() || "0",
        exceptions_count: invoiceData?.exceptions.toString() || "0"
      }
    };
  };

  // Start Jarvis conversation
  const startJarvis = async () => {
    try {
      console.log('🚀 Activating Jarvis...');
      
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // For now, we'll use a public demo approach without agent creation
      // In production, you would create an agent via ElevenLabs web dashboard
      console.log('🎯 Starting Jarvis with demo configuration...');
      
      // Get the current invoice context for our startup message
      const contextResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/jarvis/portfolio`);
      let contextData = '';
      
      if (contextResponse.ok) {
        const portfolio = await contextResponse.json();
        contextData = `Current Portfolio: ${portfolio.totalInvoices} invoices, ${portfolio.pendingInvoices} pending, $${portfolio.totalAmount?.toLocaleString()} total value.`;
        console.log('📊 Loaded portfolio context:', contextData);
      } else {
        console.warn('⚠️ Could not load portfolio context');
        contextData = 'Portfolio data loading...';
      }
      
      // Check if we have a real agent ID configured
      let agentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID;
      
      if (!agentId || agentId === 'your_jarvis_agent_id_here') {
        // Show setup instructions
        alert(`🤖 Jarvis Setup Required!

To activate Jarvis, you need to create an agent at elevenlabs.io:

1. Go to elevenlabs.io → Conversational AI → Agents
2. Create a new agent named "Jarvis AP Assistant"
3. Use voice: Rachel (21m00Tcm4TlvDq8ikWAM)
4. Copy the Agent ID and add it to your .env file

📖 See JARVIS-SETUP-GUIDE.md for complete instructions.

Current portfolio context for your agent:
${contextData}`);
        
        throw new Error('Jarvis agent not configured. Please see setup guide.');
      }
      
      console.log(`🎯 Starting Jarvis with agent ID: ${agentId}`);
      
      // Start conversation with the configured agent
      await conversation.startSession({
        agentId: agentId
      });
      
      setIsActive(true);
      console.log('✅ Jarvis activated successfully');
      
    } catch (error) {
      console.error('❌ Failed to activate Jarvis:', error);
      
      // Show user-friendly error message
      if (error instanceof Error && error.message.includes('permission')) {
        alert('Jarvis requires microphone access to function. Please grant permission and try again.');
      } else {
        alert('Unable to activate Jarvis. Please check your connection and try again.');
      }
    }
  };

  // Stop Jarvis conversation
  const stopJarvis = () => {
    conversation.endSession();
    setIsActive(false);
    setAgentStatus('idle');
    console.log('🛑 Jarvis deactivated');
  };

  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted);
    conversation.setVolume({ volume: isMuted ? 0.8 : 0 });
  };

  // Effect to fetch invoice data on mount
  useEffect(() => {
    fetchInvoiceData();
  }, [fetchInvoiceData]);

  return (
    <div className="bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 rounded-lg shadow-lg border border-blue-300 p-6 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Bot size={28} className="text-blue-400" />
            {isActive && (
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-blue-400"
                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </div>
          <div>
            <h3 className="text-xl font-bold text-blue-100">J.A.R.V.I.S.</h3>
            <p className="text-sm text-blue-300">Just A Rather Very Intelligent System</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 px-3 py-1 bg-gray-800 rounded-full">
            <div className={`w-2 h-2 rounded-full ${
              agentStatus === 'listening' ? 'bg-green-400' :
              agentStatus === 'speaking' ? 'bg-blue-400' :
              agentStatus === 'thinking' ? 'bg-yellow-400' : 'bg-gray-400'
            }`}></div>
            <span className="text-xs capitalize text-gray-300">{agentStatus}</span>
          </div>
          
          <button
            onClick={toggleMute}
            className={`p-2 rounded-full transition-colors ${
              isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>
      </div>

      {/* Status Display */}
      <div className="mb-6">
        {!isActive ? (
          <div className="text-center py-8">
            <motion.button
              onClick={startJarvis}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg flex items-center space-x-3 mx-auto transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Zap size={24} />
              <span className="text-lg font-semibold">Activate Jarvis</span>
            </motion.button>
            <p className="text-gray-300 mt-3 text-sm">
              Click to start conversing with your AI accounts payable assistant
            </p>
          </div>
        ) : (
          <div className="text-center py-4">
            <motion.div
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-800 rounded-lg"
              animate={{ 
                boxShadow: agentStatus === 'listening' ? ['0 0 0 rgba(59, 130, 246, 0.5)', '0 0 20px rgba(59, 130, 246, 0.8)', '0 0 0 rgba(59, 130, 246, 0.5)'] : '0 0 0 rgba(59, 130, 246, 0.5)'
              }}
              transition={{ duration: 1.5, repeat: agentStatus === 'listening' ? Infinity : 0 }}
            >
              {agentStatus === 'listening' ? <Mic size={20} className="text-green-400" /> : 
               agentStatus === 'speaking' ? <Volume2 size={20} className="text-blue-400" /> :
               <Bot size={20} className="text-yellow-400" />}
              <span className="font-medium">
                {agentStatus === 'listening' ? 'Listening...' :
                 agentStatus === 'speaking' ? 'Jarvis is speaking...' :
                 agentStatus === 'thinking' ? 'Processing...' : 'Ready'}
              </span>
            </motion.div>
            
            <button
              onClick={stopJarvis}
              className="mt-3 text-red-400 hover:text-red-300 text-sm underline"
            >
              Deactivate Jarvis
            </button>
          </div>
        )}
      </div>

      {/* Conversation History */}
      {isActive && conversationHistory.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4 max-h-60 overflow-y-auto">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Conversation Log</h4>
          <div className="space-y-3">
            {conversationHistory.slice(-5).map((entry, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-2 rounded ${
                  entry.type === 'jarvis' 
                    ? 'bg-blue-900 text-blue-100' 
                    : 'bg-gray-700 text-gray-200'
                }`}
              >
                <div className="flex items-start space-x-2">
                  {entry.type === 'jarvis' ? (
                    <Bot size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 bg-gray-500 rounded-full mt-0.5 flex-shrink-0"></div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm">
                      {typeof entry.message === 'string' ? entry.message : JSON.stringify(entry.message)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {entry.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Invoice Context Display */}
      {invoiceData && (
        <div className="mt-4 grid grid-cols-4 gap-3 text-center">
          <div className="bg-gray-800 rounded p-3">
            <div className="text-2xl font-bold text-blue-400">{invoiceData.total}</div>
            <div className="text-xs text-gray-300">Total</div>
          </div>
          <div className="bg-gray-800 rounded p-3">
            <div className="text-2xl font-bold text-yellow-400">{invoiceData.pending}</div>
            <div className="text-xs text-gray-300">Pending</div>
          </div>
          <div className="bg-gray-800 rounded p-3">
            <div className="text-2xl font-bold text-green-400">{invoiceData.approved}</div>
            <div className="text-xs text-gray-300">Approved</div>
          </div>
          <div className="bg-gray-800 rounded p-3">
            <div className="text-2xl font-bold text-red-400">{invoiceData.exceptions}</div>
            <div className="text-xs text-gray-300">Exceptions</div>
          </div>
        </div>
      )}
    </div>
  );
}