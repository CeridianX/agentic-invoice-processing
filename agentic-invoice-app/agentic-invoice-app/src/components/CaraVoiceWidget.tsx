import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useConversation } from '@elevenlabs/react';
import { MessageCircle, Mic, MicOff, X, Send, Loader, Radio, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { logger } from '../lib/logger';

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
  const [isMuted, setIsMuted] = useState(() => {
    // Initialize from localStorage
    const saved = localStorage.getItem('cara-muted');
    return saved ? JSON.parse(saved) : false;
  });
  const [showBubble, setShowBubble] = useState(true);
  const [conversationHistory, setConversationHistory] = useState<Array<{
    type: 'user' | 'cara';
    message: string;
    timestamp: Date;
  }>>([]);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [agentStatus, setAgentStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [isHovered, setIsHovered] = useState(false);
  const chatAreaRef = useRef<HTMLDivElement>(null);

  // ElevenLabs Conversational AI hook (matching working Jarvis approach)
  const conversation = useConversation({
    onConnect: () => {
      logger.debug('🤖 Cara connected');
      setAgentStatus('listening');
      
      // Apply saved mute state
      conversation.setVolume({ volume: isMuted ? 0 : 1 });
    },
    onDisconnect: (reason) => {
      console.log('🤖 Cara disconnected. Reason:', reason);
      setAgentStatus('idle');
      
      // Don't auto-reconnect - let user control when to wake up Cara
      // This prevents unwanted auto-initialization
    },
    onMessage: (message) => {
      logger.debug('🗣️ Cara said:', message);
      const messageText = typeof message === 'string' ? message : 
                         message?.message || 'Message received';
      addToHistory('cara', messageText);
      setAgentStatus('listening');
    },
    onModeChange: (mode) => {
      logger.debug('🔄 Cara mode changed:', mode);
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
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
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
        
        if (!endpoint) {
          console.warn('🚨 Unknown tool call:', toolCall);
          return { error: 'Unknown tool call' };
        }
        
        console.log(`🔧 Making API call to: ${baseUrl}${endpoint}`);
        
        const response = await fetch(`${baseUrl}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        
        if (!response.ok) {
          console.error('🚨 API call failed:', response.status, response.statusText);
          return { 
            error: `API call failed: ${response.status} ${response.statusText}`,
            result: 'I apologize, but I cannot access the invoice data right now. Please try again later.'
          };
        }
        
        const data = await response.json();
        console.log('✅ Tool call successful:', data);
        return data;
      } catch (error) {
        console.error('🚨 Tool execution error:', error);
        return { 
          error: 'Failed to execute tool',
          result: 'I apologize, but I cannot access the invoice data right now. There may be a connectivity issue. Please try again later.'
        };
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

  // Scroll chat area to bottom
  const scrollToBottom = useCallback(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, []);

  // Add message to conversation history
  const addToHistory = (type: 'user' | 'cara', message: string) => {
    setConversationHistory(prev => [...prev, {
      type,
      message,
      timestamp: new Date()
    }]);
  };

  // Auto-scroll when conversation history changes
  useEffect(() => {
    // Small delay to ensure DOM has updated
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [conversationHistory, scrollToBottom]);

  // Auto-scroll when chat window opens/expands
  useEffect(() => {
    if (isExpanded && conversationHistory.length > 0) {
      // Delay to ensure the window animation has completed
      const timeoutId = setTimeout(scrollToBottom, 350);
      return () => clearTimeout(timeoutId);
    }
  }, [isExpanded, scrollToBottom]);

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
      // Hide bubble first, then show chat window
      setShowBubble(false);
      setTimeout(() => {
        setIsExpanded(true);
      }, 150); // Small delay for smooth transition
      
      // Only start new session if not already active
      if (!isActive) {
        setIsActive(true);
        
        // Fetch invoice data for context
        await fetchInvoiceData();
        
        console.log('🎯 Starting Cara session with agent ID:', import.meta.env.VITE_ELEVENLABS_AGENT_ID);
        
        // Start conversation with agent ID (matching working Jarvis approach)
        const agentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID;
        await conversation.startSession({
          agentId: agentId
        });
        
        console.log('🎯 Cara activated successfully');
      } else {
        console.log('🎯 Cara already active, showing chat window');
      }
    } catch (error) {
      console.error('Failed to activate Cara:', error);
      setIsActive(false);
      setIsExpanded(false);
    }
  };

  // Close chat window (don't end session to preserve conversation)
  const closeChatWindow = () => {
    setIsExpanded(false);
    // Show bubble after window animation completes
    setTimeout(() => {
      setShowBubble(true);
    }, 300); // Match the exit animation duration
    console.log('🎯 Cara chat window closed');
  };

  // Wake up Cara session (when idle)
  const restartCara = async () => {
    try {
      console.log('🔄 Waking up Cara...');
      setAgentStatus('thinking');
      
      // Only start session if not connected, otherwise just try to reconnect
      if (conversation.status !== 'connected') {
        const agentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID;
        await conversation.startSession({
          agentId: agentId
        });
      }
      
      console.log('✅ Cara is awake');
    } catch (error) {
      console.error('Failed to wake up Cara:', error);
      setAgentStatus('idle');
    }
  };

  // Fully deactivate Cara (end session and close window)
  const deactivateCara = async () => {
    try {
      if (conversation.status === 'connected') {
        await conversation.endSession();
      }
      setIsActive(false);
      setIsExpanded(false);
      setAgentStatus('idle');
      setConversationHistory([]); // Clear history when fully deactivating
      // Show bubble after window closes
      setTimeout(() => {
        setShowBubble(true);
      }, 300);
      console.log('🎯 Cara deactivated');
    } catch (error) {
      console.error('Failed to deactivate Cara:', error);
    }
  };

  // Toggle mute
  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    // Persist to localStorage
    localStorage.setItem('cara-muted', JSON.stringify(newMutedState));
    
    // Apply volume change immediately
    if (conversation.status === 'connected') {
      conversation.setVolume({ volume: newMutedState ? 0 : 1 });
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
      {/* Custom CSS for animations */}
      <style>{`
        @keyframes slowPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        
        @keyframes blobMorph {
          0%, 100% { 
            border-radius: 50%;
            transform: scale(1);
          }
          25% { 
            border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
            transform: scale(1.05);
          }
          50% { 
            border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%;
            transform: scale(1.02);
          }
          75% { 
            border-radius: 40% 60% 60% 40% / 70% 30% 60% 40%;
            transform: scale(1.08);
          }
        }
        
        @keyframes gentleBreath {
          0%, 100% { 
            transform: scale(1);
            opacity: 1;
          }
          50% { 
            transform: scale(1.03);
            opacity: 0.95;
          }
        }
        
        @keyframes particleOrbit {
          0% { 
            transform: rotate(0deg) translateX(25px) rotate(0deg);
            opacity: 0.6;
          }
          50% { 
            opacity: 1;
          }
          100% { 
            transform: rotate(360deg) translateX(25px) rotate(-360deg);
            opacity: 0.6;
          }
        }
        
        @keyframes soundWave {
          0%, 100% { 
            transform: scale(1);
            opacity: 0.8;
          }
          50% { 
            transform: scale(1.4);
            opacity: 0.2;
          }
        }
        
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .blob-idle {
          animation: gentleBreath 4s ease-in-out infinite;
          will-change: transform, opacity;
        }
        
        .blob-listening {
          animation: blobMorph 2s ease-in-out infinite;
          will-change: transform, border-radius;
        }
        
        .blob-thinking {
          animation: blobMorph 1.5s ease-in-out infinite, gradientShift 3s ease-in-out infinite;
          background: linear-gradient(45deg, #a855f7, #ec4899, #f59e0b, #a855f7);
          background-size: 400% 400%;
          will-change: transform, border-radius, background-position;
        }
        
        .blob-speaking {
          animation: blobMorph 0.8s ease-in-out infinite;
          will-change: transform, border-radius;
        }
        
        .particle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: rgba(255, 255, 255, 0.8);
          border-radius: 50%;
          pointer-events: none;
          will-change: transform, opacity;
        }
        
        .particle-orbit {
          animation: particleOrbit 8s linear infinite;
          will-change: transform, opacity;
        }
        
        .sound-wave {
          position: absolute;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          animation: soundWave 2s ease-out infinite;
          will-change: transform, opacity;
        }
        
        .hover-particle {
          position: absolute;
          width: 3px;
          height: 3px;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 50%;
          pointer-events: none;
          will-change: transform, opacity;
        }
        
        @keyframes hoverParticleBurst {
          0% { 
            transform: scale(0) translate(0, 0);
            opacity: 1;
          }
          100% { 
            transform: scale(1) translate(var(--tx), var(--ty));
            opacity: 0;
          }
        }
        
        .hover-particle-burst {
          animation: hoverParticleBurst 0.8s ease-out forwards;
        }
        
        @keyframes hoverGlow {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(168, 85, 247, 0.4);
          }
          50% { 
            box-shadow: 0 0 30px rgba(168, 85, 247, 0.6), 0 0 40px rgba(236, 72, 153, 0.3);
          }
        }
        
        .hover-glow {
          animation: hoverGlow 1.5s ease-in-out infinite;
        }
        
        .icon-glow {
          filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.8));
          transition: filter 0.3s ease;
        }
        
        .icon-pulse {
          animation: slowPulse 2s ease-in-out infinite;
        }
      `}</style>
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
                    agentStatus === 'listening' ? 'bg-gradient-to-br from-green-400 to-green-500' :
                    agentStatus === 'thinking' ? 'bg-gradient-to-br from-yellow-400 to-yellow-500' :
                    agentStatus === 'speaking' ? 'bg-gradient-to-br from-blue-400 to-blue-500' :
                    'bg-gradient-to-br from-purple-500 to-pink-500'
                  }`}
                  style={{
                    animation: (agentStatus === 'speaking' || agentStatus === 'listening' || agentStatus === 'thinking') 
                      ? 'slowPulse 3s ease-in-out infinite' 
                      : 'none'
                  }}>
                    {agentStatus === 'idle' && <Mic className="w-4 h-4 text-white" />}
                    {agentStatus === 'listening' && <Mic className="w-4 h-4 text-white" />}
                    {agentStatus === 'thinking' && <Zap className="w-4 h-4 text-white" />}
                    {agentStatus === 'speaking' && <Radio className="w-4 h-4 text-white" />}
                  </div>
                  {isActive && (
                    <div 
                      className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${statusIndicator.color}`}
                      style={{
                        animation: statusIndicator.pulse ? 'slowPulse 3s ease-in-out infinite' : 'none'
                      }}
                    />
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
                onClick={closeChatWindow}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Area */}
            <div ref={chatAreaRef} className="h-64 overflow-y-auto p-4 space-y-3">
              {conversationHistory.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-8">
                  <div className="flex flex-col items-center">
                    {/* Loading animation */}
                    <div className="relative mb-4">
                      <motion.div
                        className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center"
                        animate={{
                          scale: [1, 1.1, 1],
                          rotate: [0, 360]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        <Loader className="w-6 h-6 text-white" />
                      </motion.div>
                      {/* Pulse ring */}
                      <motion.div
                        className="absolute inset-0 rounded-full border-2 border-purple-300"
                        animate={{
                          scale: [1, 1.5, 1],
                          opacity: [0.5, 0, 0.5]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-gray-700">Cara is loading...</p>
                      <p className="text-xs text-gray-400">Setting up your AI assistant</p>
                    </div>
                  </div>
                </div>
              ) : (
                conversationHistory.map((entry, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ 
                      duration: 0.4,
                      delay: index === conversationHistory.length - 1 ? 0.1 : 0,
                      ease: "easeOut"
                    }}
                    className={`flex ${entry.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 text-sm ${
                        entry.type === 'user'
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                      style={{ 
                        borderRadius: entry.type === 'user' 
                          ? '1.5rem 1.5rem 0.25rem 1.5rem'  // user: pointy bottom-left
                          : '0.25rem 1.5rem 1.5rem 1.5rem', // cara: pointy top-left
                        border: 'none',
                        overflow: 'hidden'
                      }}
                    >
                      {entry.message}
                    </div>
                  </motion.div>
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
                
                <div className="flex items-center justify-between w-full ml-3">
                  <div className="flex items-center space-x-3">
                    {agentStatus === 'listening' && (
                      <div className="flex items-center space-x-0.5">
                        <div className="w-0.5 h-1 bg-green-400 rounded-sm animate-pulse" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-0.5 h-2 bg-green-400 rounded-sm animate-pulse" style={{animationDelay: '0.3s'}}></div>
                        <div className="w-0.5 h-3 bg-green-400 rounded-sm animate-pulse" style={{animationDelay: '0s'}}></div>
                        <div className="w-0.5 h-2 bg-green-400 rounded-sm animate-pulse" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-0.5 h-1 bg-green-400 rounded-sm animate-pulse" style={{animationDelay: '0.4s'}}></div>
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
                  
                  {isActive && (
                    <div className="flex space-x-2">
                      {agentStatus === 'idle' && conversationHistory.length > 0 && (
                        <button
                          onClick={restartCara}
                          className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
                          title="Wake up Cara"
                        >
                          Wake Up
                        </button>
                      )}
                      <button
                        onClick={deactivateCara}
                        className="text-xs text-red-500 hover:text-red-700 transition-colors"
                        title="End conversation"
                      >
                        End
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button - Dynamic Blob Animation */}
      <AnimatePresence>
        {showBubble && !isExpanded && (
          <motion.button
            onClick={activateCara}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`relative w-14 h-14 shadow-lg flex items-center justify-center text-white overflow-visible ${
              isHovered ? 'hover-glow' : ''
            }`}
            style={{
              background: agentStatus === 'thinking' ? 'transparent' : 'linear-gradient(135deg, #a855f7, #ec4899)',
              borderRadius: '50%',
              willChange: 'transform, background',
              zIndex: 10
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            whileHover={{ 
              scale: 1.15,
              background: agentStatus === 'thinking' ? 'transparent' : 'linear-gradient(135deg, #9333ea, #db2777)',
              transition: { duration: 0.3, ease: "easeOut" }
            }}
            whileTap={{ scale: 0.95 }}
          >
            {/* Blob Animation Container */}
            <div 
              className={`absolute inset-0 w-14 h-14 ${
                agentStatus === 'idle' ? 'blob-idle' : 
                agentStatus === 'listening' ? 'blob-listening' : 
                agentStatus === 'thinking' ? 'blob-thinking' : 
                agentStatus === 'speaking' ? 'blob-speaking' : 
                'blob-idle'
              }`}
              style={{
                background: agentStatus === 'thinking' ? 
                  'linear-gradient(45deg, #a855f7, #ec4899, #f59e0b, #a855f7)' :
                  'linear-gradient(135deg, #a855f7, #ec4899)',
                backgroundSize: agentStatus === 'thinking' ? '400% 400%' : '100% 100%',
                borderRadius: '50%',
                zIndex: 1
              }}
            />
            
            {/* Particle System */}
            {(agentStatus === 'listening' || agentStatus === 'thinking' || agentStatus === 'speaking' || isHovered) && (
              <>
                {/* Orbital Particles */}
                <div className="particle particle-orbit" style={{ animationDelay: '0s', top: '20%', left: '50%' }} />
                <div className="particle particle-orbit" style={{ animationDelay: '2s', top: '50%', left: '20%' }} />
                <div className="particle particle-orbit" style={{ animationDelay: '4s', top: '80%', left: '50%' }} />
                <div className="particle particle-orbit" style={{ animationDelay: '6s', top: '50%', left: '80%' }} />
                
                {/* Hover Particles */}
                {isHovered && (
                  <>
                    <div className="hover-particle hover-particle-burst" style={{ 
                      top: '50%', 
                      left: '50%', 
                      '--tx': '40px', 
                      '--ty': '-40px',
                      animationDelay: '0s'
                    } as React.CSSProperties} />
                    <div className="hover-particle hover-particle-burst" style={{ 
                      top: '50%', 
                      left: '50%', 
                      '--tx': '-40px', 
                      '--ty': '-40px',
                      animationDelay: '0.1s'
                    } as React.CSSProperties} />
                    <div className="hover-particle hover-particle-burst" style={{ 
                      top: '50%', 
                      left: '50%', 
                      '--tx': '40px', 
                      '--ty': '40px',
                      animationDelay: '0.2s'
                    } as React.CSSProperties} />
                    <div className="hover-particle hover-particle-burst" style={{ 
                      top: '50%', 
                      left: '50%', 
                      '--tx': '-40px', 
                      '--ty': '40px',
                      animationDelay: '0.3s'
                    } as React.CSSProperties} />
                    <div className="hover-particle hover-particle-burst" style={{ 
                      top: '50%', 
                      left: '50%', 
                      '--tx': '0px', 
                      '--ty': '-50px',
                      animationDelay: '0.4s'
                    } as React.CSSProperties} />
                    <div className="hover-particle hover-particle-burst" style={{ 
                      top: '50%', 
                      left: '50%', 
                      '--tx': '0px', 
                      '--ty': '50px',
                      animationDelay: '0.5s'
                    } as React.CSSProperties} />
                  </>
                )}
                
                {/* Sound waves for listening/speaking */}
                {(agentStatus === 'listening' || agentStatus === 'speaking') && (
                  <>
                    <div className="sound-wave" style={{ 
                      width: '70px', 
                      height: '70px', 
                      top: '-8px', 
                      left: '-8px',
                      animationDelay: '0s'
                    }} />
                    <div className="sound-wave" style={{ 
                      width: '90px', 
                      height: '90px', 
                      top: '-18px', 
                      left: '-18px',
                      animationDelay: '0.5s'
                    }} />
                    <div className="sound-wave" style={{ 
                      width: '110px', 
                      height: '110px', 
                      top: '-28px', 
                      left: '-28px',
                      animationDelay: '1s'
                    }} />
                  </>
                )}
              </>
            )}
            
            {/* Main Icon - State-based */}
            <div className="relative z-10 flex items-center justify-center transition-all duration-300">
              {agentStatus === 'idle' && <Mic className="w-6 h-6" />}
              {agentStatus === 'listening' && <Mic className="w-6 h-6 text-green-100 icon-glow" />}
              {agentStatus === 'thinking' && <Zap className="w-6 h-6 text-yellow-100 icon-glow icon-pulse" />}
              {agentStatus === 'speaking' && <Radio className="w-6 h-6 text-blue-100 icon-glow icon-pulse" />}
            </div>
            
            {/* Status Indicator */}
            {isActive && (
              <div 
                className={`absolute w-3 h-3 rounded-full ${statusIndicator.color} z-20`}
                style={{
                  top: '4px',
                  right: '4px',
                  animation: statusIndicator.pulse ? 'slowPulse 3s ease-in-out infinite' : 'none'
                }}
              />
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}