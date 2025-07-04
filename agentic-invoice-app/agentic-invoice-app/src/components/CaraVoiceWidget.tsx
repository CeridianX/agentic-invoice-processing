import React, { useState, useEffect, useCallback } from 'react';
import { useConversation } from '@elevenlabs/react';
import { MessageCircle, Mic, MicOff, X, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CaraVoiceWidgetProps {
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

export default function CaraVoiceWidget({ 
  onInvoiceSelect, 
  onActionRequest 
}: CaraVoiceWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{
    type: 'user' | 'cara';
    message: string;
    timestamp: Date;
  }>>([]);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [agentStatus, setAgentStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');

  // ElevenLabs Conversational AI hook
  const conversation = useConversation({
    agentId: import.meta.env.VITE_ELEVENLABS_AGENT_ID,
    onConnect: () => {
      console.log('🤖 Cara connected');
      setAgentStatus('listening');
    },
    onDisconnect: () => {
      console.log('🤖 Cara disconnected');
      setAgentStatus('idle');
      
      // If Cara was active and this wasn't a manual disconnect, try to reconnect
      if (isActive && isExpanded) {
        console.log('🔄 Attempting to reconnect Cara...');
        setTimeout(() => {
          if (isActive && conversation.status === 'disconnected') {
            conversation.startSession().catch(error => {
              console.error('Failed to reconnect Cara:', error);
            });
          }
        }, 2000);
      }
    },
    onMessage: (message) => {
      console.log('🗣️ Cara said:', message);
      const messageText = typeof message === 'string' ? message : 
                         message?.message || message?.content || 'Message received';
      addToHistory('cara', messageText);
      setAgentStatus('listening');
    },
    onModeChange: (mode) => {
      console.log('🔄 Cara mode changed:', mode);
      switch (mode.mode) {
        case 'listening':
          setAgentStatus('listening');
          break;
        case 'thinking':
          setAgentStatus('thinking');
          break;
        case 'speaking':
          setAgentStatus('speaking');
          break;
        default:
          setAgentStatus('idle');
      }
    },
    onError: (error) => {
      console.error('🚨 Cara error:', error);
      setAgentStatus('idle');
    },
    onToolCall: async (toolCall) => {
      console.log('🔧 Tool call received:', toolCall);
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL;
        let endpoint = '';
        let body = {};
        
        if (toolCall.name === 'get-portfolio-summary' || toolCall.parameters?.action === 'get-portfolio-summary') {
          endpoint = '/api/jarvis-tools/get-portfolio-summary';
        } else if (toolCall.name === 'get-invoice-details' || toolCall.parameters?.action === 'get-invoice-details') {
          endpoint = '/api/jarvis-tools/get-invoice-details';
          body = { invoiceId: toolCall.parameters?.invoiceId };
        } else if (toolCall.name === 'get-invoices-by-status' || toolCall.parameters?.action === 'get-invoices-by-status') {
          endpoint = '/api/jarvis-tools/get-invoices-by-status';
          body = { status: toolCall.parameters?.status };
        } else if (toolCall.name === 'get-urgent-invoices' || toolCall.parameters?.action === 'get-urgent-invoices') {
          endpoint = '/api/jarvis-tools/get-urgent-invoices';
        } else if (toolCall.name === 'get-recent-activity' || toolCall.parameters?.action === 'get-recent-activity') {
          endpoint = '/api/jarvis-tools/get-recent-activity';
        }
        
        const response = await fetch(`${baseUrl}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Tool execution error:', error);
        return { error: 'Failed to execute tool' };
      }
    }
  });

  // Fetch invoice data for context
  const fetchInvoiceData = useCallback(async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      const response = await fetch(`${baseUrl}/api/jarvis-tools/get-portfolio-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-portfolio-summary' })
      });
      
      if (response.ok) {
        const portfolioData = await response.json();
        console.log('📊 Portfolio data loaded:', portfolioData);
        
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
  const addToHistory = (type: 'user' | 'cara', message: string) => {
    setConversationHistory(prev => [...prev, {
      type,
      message,
      timestamp: new Date()
    }]);
  };

  // Create dynamic configuration for Cara with invoice context
  const createCaraConfig = (invoiceData: InvoiceData | null) => {
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
          prompt: `You are Cara, an advanced AI assistant specializing in accounts payable and invoice management. You have the personality of a sophisticated, efficient, and friendly professional assistant.

PERSONALITY TRAITS:
- Professional yet approachable, with a warm and helpful demeanor
- Extremely knowledgeable about finance and accounting
- Proactive in suggesting improvements and optimizations
- Speak in a confident, clear manner with practical insights
- Focus on being helpful and efficient

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
- Maintain the professional Cara persona throughout

Remember: You are an AI assistant focused on accounts payable excellence. Be helpful, insightful, and maintain professionalism.`
        },
        first_message: "Hello! I'm Cara, your AI assistant for accounts payable. I've reviewed your current portfolio and I'm ready to help with any invoice management needs. How can I assist you today?",
        language: "en"
      },
      tts: {
        voice_id: "21m00Tcm4TlvDq8ikWAM" // Rachel voice - sophisticated and clear
      },
      stt: {
        model: "nova-2-general"
      }
    };
  };

  // Initialize Cara when activated
  const activateCara = async () => {
    try {
      setIsActive(true);
      setIsExpanded(true);
      
      // Fetch invoice data for context
      await fetchInvoiceData();
      
      console.log('🎯 Starting Cara session with agent ID:', import.meta.env.VITE_ELEVENLABS_AGENT_ID);
      
      // Start conversation with existing agent
      await conversation.startSession();
      
      console.log('🎯 Cara activated successfully');
    } catch (error) {
      console.error('Failed to activate Cara:', error);
      setIsActive(false);
      setIsExpanded(false);
    }
  };

  // Deactivate Cara
  const deactivateCara = async () => {
    try {
      if (conversation.status === 'connected') {
        await conversation.endSession();
      }
      setIsActive(false);
      setIsExpanded(false);
      setAgentStatus('idle');
      console.log('🎯 Cara deactivated');
    } catch (error) {
      console.error('Failed to deactivate Cara:', error);
    }
  };

  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (conversation.status === 'connected') {
      conversation.setVolume(isMuted ? 1 : 0);
    }
  };

  // Get status indicator
  const getStatusIndicator = () => {
    switch (agentStatus) {
      case 'listening':
        return { color: 'bg-green-400', pulse: true };
      case 'thinking':
        return { color: 'bg-yellow-400', pulse: true };
      case 'speaking':
        return { color: 'bg-blue-400', pulse: true };
      default:
        return { color: 'bg-gray-400', pulse: false };
    }
  };

  const statusIndicator = getStatusIndicator();

  return (
    <div className="fixed top-20 right-8 z-50">
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-80 mb-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    agentStatus === 'listening' ? 'bg-gradient-to-br from-green-400 to-green-500 animate-pulse' :
                    agentStatus === 'thinking' ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 animate-pulse' :
                    agentStatus === 'speaking' ? 'bg-gradient-to-br from-blue-400 to-blue-500 animate-pulse' :
                    'bg-gradient-to-br from-purple-500 to-pink-500'
                  }`}>
                    <MessageCircle className="w-4 h-4 text-white" />
                  </div>
                  {isActive && (
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${statusIndicator.color} ${statusIndicator.pulse ? 'animate-pulse' : ''}`} />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Cara</h3>
                  <p className={`text-xs font-medium capitalize transition-colors ${
                    agentStatus === 'listening' ? 'text-green-600' :
                    agentStatus === 'thinking' ? 'text-yellow-600' :
                    agentStatus === 'speaking' ? 'text-blue-600' :
                    'text-gray-500'
                  }`}>
                    {agentStatus === 'listening' ? '🎤 Listening...' :
                     agentStatus === 'thinking' ? '🧠 Processing...' :
                     agentStatus === 'speaking' ? '🗣️ Speaking...' :
                     agentStatus}
                  </p>
                </div>
              </div>
              <button
                onClick={deactivateCara}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Area */}
            <div className="h-64 overflow-y-auto p-4 space-y-3">
              {conversationHistory.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-8">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  Start a conversation with Cara
                </div>
              ) : (
                conversationHistory.map((entry, index) => (
                  <div
                    key={index}
                    className={`flex ${entry.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg text-sm ${
                        entry.type === 'user'
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {entry.message}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Controls */}
            <div className="p-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <button
                  onClick={toggleMute}
                  className={`p-2 rounded-full transition-all duration-200 ${
                    isMuted 
                      ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                
                <div className="flex items-center space-x-2">
                  {agentStatus === 'listening' && (
                    <div className="flex space-x-1">
                      <div className="w-1 h-4 bg-green-400 rounded-full animate-pulse"></div>
                      <div className="w-1 h-3 bg-green-400 rounded-full animate-pulse" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-1 h-5 bg-green-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                      <div className="w-1 h-2 bg-green-400 rounded-full animate-pulse" style={{animationDelay: '0.3s'}}></div>
                    </div>
                  )}
                  <div className={`text-xs font-medium transition-colors ${
                    agentStatus === 'listening' ? 'text-green-600' :
                    agentStatus === 'thinking' ? 'text-yellow-600' :
                    agentStatus === 'speaking' ? 'text-blue-600' :
                    'text-gray-500'
                  }`}>
                    {agentStatus === 'listening' ? 'Listening for your voice...' : 
                     agentStatus === 'thinking' ? 'Processing your request...' : 
                     agentStatus === 'speaking' ? 'Cara is speaking...' : 
                     isActive ? 'Ready to help' : 'Inactive'}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button - Only show when not expanded */}
      {!isExpanded && (
        <motion.button
          onClick={activateCara}
          className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 bg-gradient-to-br from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="relative">
            <MessageCircle className="w-6 h-6" />
            {isActive && (
              <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${statusIndicator.color} ${statusIndicator.pulse ? 'animate-pulse' : ''}`} />
            )}
          </div>
        </motion.button>
      )}
    </div>
  );
}