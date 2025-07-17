import { useState, useEffect, useCallback, useRef } from 'react';

// API base URL configuration
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://server-eb0g35lmt-xelix-projects.vercel.app';

// Define types directly in the component
interface Vendor {
  id: string;
  name: string;
  category: string;
  trustLevel: string;
  averageProcessingTime: number;
  paymentTerms: string;
  preferredPaymentMethod: string;
}

interface AgentActivity {
  id: string;
  timestamp: string;
  activityType: string;
  description: string;
  confidenceLevel?: number;
}

interface Exception {
  id: string;
  invoiceId: string;
  type: string;
  severity: string;
  description: string;
  status: string;
}

interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  lineNumber: number;
  description: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
}

interface Invoice {
  id: string;
  vendorId: string;
  invoiceNumber: string;
  amount: number;
  status: string;
  receivedDate: string;
  dueDate: string;
  invoiceDate: string;
  paymentTerms: string;
  hasIssues: boolean;
  variancePercentage?: number;
  currency: string;
  vendor: Vendor;
  lineItems?: InvoiceLineItem[];
  exceptions?: Exception[];
  agentActivities?: AgentActivity[];
  agentReasoning?: string;
  agentConfidence?: number;
  workflowRoute?: string;
  scenario?: string;
  notes?: string;
  agentProcessingStarted?: string;
}

interface InvoiceDetailProps {
  invoice: Invoice;
  onBack: () => void;
}

// Communication types
interface EmailMessage {
  id: string;
  from: string;
  to: string[];
  content: {
    subject: string;
    body: string;
    priority: string;
    actionItems?: string[];
  };
  timestamp: string;
  status: string;
}

interface Conversation {
  id: string;
  subject: string;
  status: string;
  scenario: string;
  participants: string[];
  createdAt: string;
  lastActivity: string;
  expectedResponseBy?: string;
}

interface CommunicationData {
  hasConversation: boolean;
  conversation: Conversation | null;
  messages: EmailMessage[];
  aiEnabled: boolean;
}

interface ConversationStepInfo {
  currentStep: number;
  maxSteps: number;
  nextStepName: string;
  canAdvance: boolean;
}

export default function InvoiceDetail({ invoice, onBack }: InvoiceDetailProps) {
  const [fullInvoice, setFullInvoice] = useState<Invoice | null>(null);
  const [communicationData, setCommunicationData] = useState<CommunicationData | null>(null);
  const [communicationLoading, setCommunicationLoading] = useState(false);
  const [communicationError, setCommunicationError] = useState<string | null>(null);
  const [stepInfo, setStepInfo] = useState<ConversationStepInfo | null>(null);
  const [advancingStep, setAdvancingStep] = useState(false);
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());
  const [triggeringCommunication, setTriggeringCommunication] = useState(false);
  const hasTriggeredCommunication = useRef<Set<string>>(new Set());
  const loadingRef = useRef<boolean>(false);
  
  // Global tracking to prevent duplicate triggers across component re-renders
  const globalTriggeredKey = `communication_triggered_${invoice.id}`;
  const hasGloballyTriggered = (() => {
    if (typeof window !== 'undefined') {
      return window.sessionStorage.getItem(globalTriggeredKey) === 'true';
    }
    return false;
  })();

  const loadCommunicationData = useCallback(async (skipAutoTrigger = false) => {
    // Prevent duplicate loading in React StrictMode
    if (loadingRef.current) {
      console.log(`⏭️ Already loading communication data for ${invoice.id}, skipping...`);
      return;
    }
    
    loadingRef.current = true;
    setCommunicationLoading(true);
    setCommunicationError(null);
    console.log(`🔍 [${new Date().toISOString()}] Loading communication data for invoice: ${invoice.id}`);
    try {
      const url = `${apiBaseUrl}/api/communication/conversations/${invoice.id}`;
      console.log(`🔍 Fetching from URL: ${url}`);
      const response = await fetch(url);
      console.log(`🔍 Response status: ${response.status}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`📧 [${new Date().toISOString()}] Communication data received:`, data);
        console.log(`📧 hasConversation: ${data.hasConversation}`);
        console.log(`📧 conversation:`, data.conversation);
        console.log(`📧 messages count: ${data.messages?.length || 0}`);
        
        // Check if Agent Zero is still processing (race condition prevention)
        const isAgentProcessing = invoice.agentProcessingStarted && !invoice.agentProcessingCompleted;
        
        console.log(`🔍 Auto-trigger decision for ${invoice.invoiceNumber}:`, {
          skipAutoTrigger,
          hasConversation: data.hasConversation,
          triggeringCommunication,
          isAgentProcessing,
          localTriggered: hasTriggeredCommunication.current.has(invoice.id),
          globalTriggered: hasGloballyTriggered,
          status: invoice.status,
          scenario: invoice.scenario
        });
        
        // Auto-trigger communication for missing PO invoices if not already present
        if (!skipAutoTrigger &&
            !data.hasConversation && 
            !triggeringCommunication &&
            !isAgentProcessing &&
            !hasTriggeredCommunication.current.has(invoice.id) &&
            !hasGloballyTriggered &&
            invoice.status === 'pending_internal_review' &&
            invoice.scenario === 'missing_po') {
          
          console.log(`🔧 Auto-triggering communication for missing PO invoice: ${invoice.invoiceNumber}`);
          setTriggeringCommunication(true);
          hasTriggeredCommunication.current.add(invoice.id);
          
          // Mark as triggered globally
          if (typeof window !== 'undefined') {
            window.sessionStorage.setItem(globalTriggeredKey, 'true');
          }
          
          try {
            const triggerResponse = await fetch(`${apiBaseUrl}/api/communication/invoke/${invoice.id}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ scenario: 'missing_po' })
            });
            
            if (triggerResponse.ok) {
              console.log(`✅ Communication triggered successfully for ${invoice.invoiceNumber}`);
              // Reload communication data to show the new conversation
              const retryResponse = await fetch(url);
              if (retryResponse.ok) {
                const retryData = await retryResponse.json();
                setCommunicationData(retryData);
                console.log(`📧 Reloaded communication data:`, retryData);
                
                // Load step info for the new conversation
                if (retryData?.hasConversation && retryData?.conversation) {
                  try {
                    const stepResponse = await fetch(`${apiBaseUrl}/api/communication/step-info/${retryData.conversation.id}`);
                    if (stepResponse.ok) {
                      const stepData = await stepResponse.json();
                      console.log(`📊 Step info loaded after trigger:`, stepData);
                      setStepInfo(stepData);
                    } else {
                      // Set default step info if API call fails
                      setStepInfo({
                        currentStep: 0,
                        maxSteps: 3,
                        nextStepName: 'Waiting for procurement response',
                        canAdvance: true
                      });
                    }
                  } catch (stepError) {
                    console.error('Error fetching step info after trigger:', stepError);
                    // Set default step info if there's an error
                    setStepInfo({
                      currentStep: 0,
                      maxSteps: 3,
                      nextStepName: 'Waiting for procurement response',
                      canAdvance: true
                    });
                  }
                }
              }
            } else {
              console.error(`❌ Failed to trigger communication for ${invoice.invoiceNumber}`);
              setCommunicationData(data);
            }
          } catch (triggerError) {
            console.error('Error auto-triggering communication:', triggerError);
            setCommunicationData(data);
          } finally {
            setTriggeringCommunication(false);
          }
        } else {
          setCommunicationData(data);
        }
        
        // Always load step info if conversation exists (regardless of skipAutoTrigger)
        if (data?.hasConversation && data?.conversation) {
          console.log(`🔍 Loading step info for conversation: ${data.conversation.id}`);
          try {
            const stepResponse = await fetch(`${apiBaseUrl}/api/communication/step-info/${data.conversation.id}`);
            if (stepResponse.ok) {
              const stepData = await stepResponse.json();
              console.log(`📊 Step info received:`, stepData);
              setStepInfo(stepData);
            } else {
              console.error(`❌ Failed to load step info: ${stepResponse.status}`);
              // Set default step info if API call fails
              setStepInfo({
                currentStep: 0,
                maxSteps: 3,
                nextStepName: 'Waiting for procurement response',
                canAdvance: true
              });
            }
          } catch (stepError) {
            console.error('Error fetching step info:', stepError);
            // Set default step info if there's an error
            setStepInfo({
              currentStep: 0,
              maxSteps: 3,
              nextStepName: 'Waiting for procurement response',
              canAdvance: true
            });
          }
        } else {
          // Clear step info if no conversation
          setStepInfo(null);
        }
      } else {
        console.error(`🔍 Response not ok: ${response.status}`);
        const errorText = await response.text();
        console.error(`🔍 Error response: ${errorText}`);
        setCommunicationError(`Failed to load communication data: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching communication data:', error);
      setCommunicationError(`Failed to load communication data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCommunicationLoading(false);
      loadingRef.current = false;
    }
  }, [invoice.id]);

  // Debug logging for communication state
  useEffect(() => {
    console.log(`🔍 Communication state changed:`, {
      loading: communicationLoading,
      hasData: !!communicationData,
      hasConversation: communicationData?.hasConversation,
      messageCount: communicationData?.messages?.length,
      conversationStatus: communicationData?.conversation?.status,
      hasStepInfo: !!stepInfo,
      stepInfo: stepInfo
    });
  }, [communicationData, communicationLoading, stepInfo]);

  // Ensure step info is loaded whenever communication data indicates a conversation exists
  useEffect(() => {
    const loadStepInfoIfNeeded = async () => {
      if (communicationData?.hasConversation && communicationData?.conversation && !stepInfo) {
        console.log(`🔧 Loading missing step info for conversation: ${communicationData.conversation.id}`);
        try {
          const stepResponse = await fetch(`${apiBaseUrl}/api/communication/step-info/${communicationData.conversation.id}`);
          if (stepResponse.ok) {
            const stepData = await stepResponse.json();
            console.log(`📊 Step info loaded in useEffect:`, stepData);
            setStepInfo(stepData);
          } else {
            console.error(`❌ Failed to load step info in useEffect: ${stepResponse.status}`);
            // Set default step info if API call fails
            setStepInfo({
              currentStep: 0,
              maxSteps: 3,
              nextStepName: 'Waiting for procurement response',
              canAdvance: true
            });
          }
        } catch (stepError) {
          console.error('Error fetching step info in useEffect:', stepError);
          // Set default step info if there's an error
          setStepInfo({
            currentStep: 0,
            maxSteps: 3,
            nextStepName: 'Waiting for procurement response',
            canAdvance: true
          });
        }
      }
    };

    loadStepInfoIfNeeded();
  }, [communicationData, stepInfo]);

  const advanceConversation = async () => {
    if (!communicationData?.conversation || !stepInfo?.canAdvance || advancingStep) {
      return;
    }

    setAdvancingStep(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/communication/advance/${communicationData.conversation.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Conversation advanced:', result);
        
        // Mark the new message for animation
        if (result.message?.message?.id) {
          setNewMessageIds(prev => new Set([...prev, result.message.message.id]));
          
          // Remove animation after 2 seconds
          setTimeout(() => {
            setNewMessageIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(result.message.message.id);
              return newSet;
            });
          }, 2000);
        }
        
        // Reload communication data to show new message
        await loadCommunicationData();
      } else {
        const error = await response.json();
        console.error('Failed to advance conversation:', error);
      }
    } catch (error) {
      console.error('Error advancing conversation:', error);
    } finally {
      setAdvancingStep(false);
    }
  };

  useEffect(() => {
    // Clear refs when invoice changes
    hasTriggeredCommunication.current.clear();
    loadingRef.current = false;
    
    const loadFullInvoice = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/invoices/${invoice.id}`);
        if (response.ok) {
          const data = await response.json();
          setFullInvoice(data);
        } else {
          // Fallback to basic invoice data
          setFullInvoice(invoice);
        }
      } catch (error) {
        console.error('Error fetching invoice details:', error);
        // Fallback to basic invoice data
        setFullInvoice(invoice);
      }
    };

    loadFullInvoice();
    loadCommunicationData();
  }, [invoice.id, loadCommunicationData]);

  // WebSocket integration for real-time communication updates (development only)
  useEffect(() => {
    // Only enable WebSocket in development mode (localhost)
    if (!apiBaseUrl.includes('localhost')) {
      console.log('WebSocket disabled in production mode');
      return;
    }

    const wsUrl = apiBaseUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connected for communication updates');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // Handle communication-related events for this invoice
        if (message.type === 'communication_sent' && message.data?.invoiceId === invoice.id) {
          console.log('Real-time communication sent event received:', message.data);
          // Reload communication data to show the new message (skip auto-trigger)
          loadCommunicationData(true);
        } else if (message.type === 'communication_received' && message.data?.invoiceId === invoice.id) {
          console.log('Real-time communication response received:', message.data);
          // Reload communication data to show the response (skip auto-trigger)
          loadCommunicationData(true);
        } else if (message.type === 'communication_resolved' && message.data?.invoiceId === invoice.id) {
          console.log('Real-time communication resolved event:', message.data);
          // Reload communication data to show resolved status (skip auto-trigger)
          loadCommunicationData(true);
        } else if (message.type === 'communication_initiated' && message.data?.invoiceId === invoice.id) {
          console.log('Real-time communication initiated event:', message.data);
          // Reload communication data to show new conversation (skip auto-trigger)
          loadCommunicationData(true);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    // Cleanup WebSocket connection when component unmounts
    return () => {
      ws.close();
    };
  }, [invoice.id, loadCommunicationData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getProcessStatusBadge = (invoice: Invoice) => {
    // Determine the actual process status based on invoice state (same logic as InvoiceList)
    let processStatus = '';
    let statusClass = '';
    
    // Check if agent processing appears stuck (started more than 2 minutes ago without completion)
    const processingStartTime = invoice.agentProcessingStarted ? new Date(invoice.agentProcessingStarted).getTime() : 0;
    const isProcessingStuck = invoice.agentProcessingStarted && 
                              !invoice.agentProcessingCompleted && 
                              (Date.now() - processingStartTime) > 2 * 60 * 1000; // 2 minutes
    
    // If agent is currently processing (but not stuck)
    if (invoice.agentProcessingStarted && !invoice.agentProcessingCompleted && !isProcessingStuck) {
      processStatus = 'Processing';
      statusClass = 'bg-blue-100 text-blue-700';
    }
    // If AI is querying internal team
    else if (invoice.status === 'pending_internal_review') {
      processStatus = 'Internal Query';
      statusClass = 'bg-blue-100 text-blue-700';
    }
    // If there are exceptions/issues to resolve
    else if (invoice.status === 'requires_review' || invoice.status === 'pending_review' || invoice.hasIssues) {
      processStatus = 'Exception';
      statusClass = 'bg-orange-100 text-orange-700';
    }
    // If waiting for manager approval
    else if (invoice.status === 'pending_approval' && invoice.assignedTo === 'manager') {
      processStatus = 'In Approval';
      statusClass = 'bg-yellow-100 text-yellow-700';
    }
    // If waiting for executive approval
    else if (invoice.status === 'pending_approval' && invoice.assignedTo === 'executive-team') {
      processStatus = 'In Approval';
      statusClass = 'bg-purple-100 text-purple-700';
    }
    // If approved and ready for payment
    else if (invoice.status === 'approved' || invoice.status === 'approved_ready_for_payment' || (invoice.approvalStatus === 'approved' && invoice.status !== 'paid')) {
      processStatus = 'Ready';
      statusClass = 'bg-green-100 text-green-700';
    }
    // If paid/completed
    else if (invoice.status === 'paid' || invoice.status === 'processed') {
      processStatus = 'Paid';
      statusClass = 'bg-gray-100 text-gray-700';
    }
    // Fallback for other pending states
    else if (invoice.status === 'pending' || invoice.status === 'pending_approval') {
      processStatus = 'Processing';
      statusClass = 'bg-blue-100 text-blue-700';
    }
    // Default fallback
    else {
      processStatus = invoice.status;
      statusClass = 'bg-gray-100 text-gray-700';
    }
    
    return { processStatus, statusClass };
  };

  const currentInvoice = fullInvoice || invoice;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 pt-4 pb-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to invoices
        </button>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invoice {currentInvoice.invoiceNumber}</h1>
            <p className="mt-1 text-base text-gray-600">{currentInvoice.vendor.name}</p>
          </div>
          <div className="flex space-x-3">
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              Reject
            </button>
            <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
              Approve
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Summary */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Details and Vendor Information Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Amount</p>
                  <p className="text-2xl font-semibold text-gray-900">{formatCurrency(currentInvoice.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <div className="mt-1">
                    {(() => {
                      const { processStatus, statusClass } = getProcessStatusBadge(currentInvoice);
                      return (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}`}>
                          {processStatus === 'Processing' && <span className="w-2 h-2 bg-blue-500 rounded-full mr-1.5 animate-pulse"></span>}
                          {processStatus === 'Exception' && <span className="text-orange-600 mr-1">⚠</span>}
                          {processStatus}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Invoice Date</p>
                  <p className="text-base">{formatDate(currentInvoice.invoiceDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Due Date</p>
                  <p className="text-base">{formatDate(currentInvoice.dueDate)}</p>
                </div>
              </div>
            </div>

            {/* Vendor Information - moved beside Invoice Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Vendor Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="text-base">{currentInvoice.vendor.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="text-base">{currentInvoice.vendor.category}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment Terms</p>
                  <p className="text-base">{currentInvoice.vendor.paymentTerms}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Trust Level</p>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      currentInvoice.vendor.trustLevel === 'high' ? 'bg-green-100 text-green-700' :
                      currentInvoice.vendor.trustLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {currentInvoice.vendor.trustLevel}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items - Hardcoded for all invoices */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Line Items</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 text-sm font-medium text-gray-500">Description</th>
                    <th className="text-right py-3 text-sm font-medium text-gray-500">Qty</th>
                    <th className="text-right py-3 text-sm font-medium text-gray-500">Unit Price</th>
                    <th className="text-right py-3 text-sm font-medium text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="py-3 text-sm text-gray-900">Professional Services - Consulting</td>
                    <td className="py-3 text-sm text-gray-900 text-right">40</td>
                    <td className="py-3 text-sm text-gray-900 text-right">{formatCurrency(150)}</td>
                    <td className="py-3 text-sm font-medium text-gray-900 text-right">{formatCurrency(6000)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-sm text-gray-900">Software License - Annual Subscription</td>
                    <td className="py-3 text-sm text-gray-900 text-right">1</td>
                    <td className="py-3 text-sm text-gray-900 text-right">{formatCurrency(2400)}</td>
                    <td className="py-3 text-sm font-medium text-gray-900 text-right">{formatCurrency(2400)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-sm text-gray-900">Implementation Support</td>
                    <td className="py-3 text-sm text-gray-900 text-right">16</td>
                    <td className="py-3 text-sm text-gray-900 text-right">{formatCurrency(125)}</td>
                    <td className="py-3 text-sm font-medium text-gray-900 text-right">{formatCurrency(2000)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-sm text-gray-900">Training Materials & Documentation</td>
                    <td className="py-3 text-sm text-gray-900 text-right">1</td>
                    <td className="py-3 text-sm text-gray-900 text-right">{formatCurrency(500)}</td>
                    <td className="py-3 text-sm font-medium text-gray-900 text-right">{formatCurrency(500)}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200">
                    <td colSpan={3} className="py-3 text-sm font-medium text-gray-900">Subtotal</td>
                    <td className="py-3 text-sm font-medium text-gray-900 text-right">{formatCurrency(10900)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="py-3 text-sm text-gray-600">Tax (8%)</td>
                    <td className="py-3 text-sm text-gray-600 text-right">{formatCurrency(872)}</td>
                  </tr>
                  <tr className="border-t border-gray-200">
                    <td colSpan={3} className="py-3 text-base font-medium text-gray-900">Total</td>
                    <td className="py-3 text-lg font-semibold text-gray-900 text-right">{formatCurrency(currentInvoice.amount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

        </div>

        {/* Sidebar */}
        <div className="space-y-6">

          {/* AI Communication */}
          {(communicationLoading || triggeringCommunication) ? (
            <div className="bg-purple-50 rounded-xl border border-purple-200 p-6">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {(currentInvoice.status === 'pending_internal_review' && currentInvoice.scenario === 'missing_po') || triggeringCommunication
                    ? 'AI Agent is preparing communication...' 
                    : 'Loading Communication...'}
                </h2>
              </div>
              {((currentInvoice.status === 'pending_internal_review' && currentInvoice.scenario === 'missing_po') || triggeringCommunication) && (
                <p className="text-sm text-purple-700">
                  {triggeringCommunication 
                    ? 'Generating inquiry to procurement team about missing PO reference...'
                    : 'Generating inquiry to procurement team about missing PO reference.'}
                </p>
              )}
            </div>
          ) : communicationData?.hasConversation ? (
            <div className="bg-purple-50 rounded-xl border border-purple-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Communication</h2>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    communicationData.conversation?.status === 'resolved' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {communicationData.conversation?.status === 'resolved' ? 'Resolved' : 'Active'}
                  </span>
                  {communicationData.aiEnabled && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      AI Powered
                    </span>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                {/* Current Status - moved to top */}
                <div className={`rounded-lg p-4 border ${
                  communicationData.conversation?.status === 'resolved'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <div className="flex items-start space-x-3">
                    <div className={`w-6 h-6 ${
                      communicationData.conversation?.status === 'resolved'
                        ? 'bg-green-500'
                        : 'bg-yellow-500'
                    } rounded-full flex items-center justify-center flex-shrink-0`}>
                      {communicationData.conversation?.status === 'resolved' ? (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                        </svg>
                      ) : (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {communicationData.conversation?.status === 'resolved' ? 'Issue Resolved' : 'Current Status'}
                      </p>
                      <p className={`text-sm mt-1 ${
                        communicationData.conversation?.status === 'resolved'
                          ? 'text-green-700'
                          : 'text-yellow-700'
                      }`}>
                        {(() => {
                          if (communicationData.conversation?.status === 'resolved') {
                            return 'Communication resolved. Invoice processing can continue.';
                          }
                          
                          const currentStep = stepInfo?.currentStep || 0;
                          switch (currentStep) {
                            case 0:
                              return 'AI inquiry sent to procurement team. Awaiting response about missing PO reference.';
                            case 1:
                              return 'Procurement team responded with PO correction. AI is processing the update.';
                            case 2:
                              return 'AI has resolved the issue and approved the invoice for payment processing.';
                            case 3:
                              return 'Procurement team has confirmed the resolution. Invoice ready for payment.';
                            default:
                              return 'Awaiting response from procurement team. Invoice processing will resume once clarification is received.';
                          }
                        })()}
                      </p>
                      {communicationData.conversation?.expectedResponseBy && 
                       communicationData.conversation?.status !== 'resolved' && (
                        <p className="text-xs text-gray-500 mt-2">
                          Expected response by: {formatDate(communicationData.conversation.expectedResponseBy)}
                        </p>
                      )}
                      {communicationData.conversation?.status === 'resolved' && (
                        <p className="text-xs text-gray-500 mt-2">
                          Resolved on: {formatDate(communicationData.conversation.lastActivity)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Conversation Messages - newest first */}
                {communicationData.messages
                  .slice()
                  .reverse()
                  .map((message, index) => (
                  <div 
                    key={message.id} 
                    className={`bg-white rounded-lg p-3 border border-purple-100 transition-all duration-500 ${
                      newMessageIds.has(message.id) 
                        ? 'animate-pulse bg-purple-50 border-purple-300 shadow-lg' 
                        : 'hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      <div className={`w-5 h-5 ${
                        message.from.includes('ai-invoice-system') 
                          ? 'bg-blue-500' 
                          : 'bg-green-500'
                      } rounded-full flex items-center justify-center flex-shrink-0`}>
                        {message.from.includes('ai-invoice-system') ? (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        ) : (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-gray-900">
                            {message.from.includes('ai-invoice-system') 
                              ? 'AI Agent → Procurement Team' 
                              : `Procurement Team → AI Agent`
                            }
                          </p>
                          <span className="text-xs text-gray-500">
                            {formatDate(message.timestamp)}
                          </span>
                        </div>
                        <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                          <p className="text-xs text-gray-800 font-medium">
                            Subject: {message.content.subject}
                          </p>
                          <div className="text-xs text-gray-700 mt-1 whitespace-pre-line leading-relaxed">
                            {message.content.body.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '')}
                          </div>
                          {message.content.actionItems && message.content.actionItems.length > 0 && (
                            <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                              <p className="text-xs font-medium text-blue-800 mb-1">Action Items:</p>
                              <ul className="text-xs text-blue-700 list-disc ml-3">
                                {message.content.actionItems.map((item, i) => (
                                  <li key={i}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        <div className="mt-1 flex items-center space-x-2 text-xs text-gray-500">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span>
                            {message.from.includes('ai-invoice-system') 
                              ? `Sent to: ${message.to.join(', ')}` 
                              : `From: ${message.from}`
                            }
                          </span>
                          <span className={`ml-2 px-1 py-0.5 rounded text-xs ${
                            message.content.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                            message.content.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {message.content.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : communicationData && !communicationData.hasConversation ? (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-8 h-8 bg-gray-400 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Communication</h2>
                {communicationData.aiEnabled && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    AI Ready
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">
                No communication history for this invoice. AI communication will be triggered automatically if issues are detected during processing.
              </p>
            </div>
          ) : communicationError ? (
            // Show error state
            <div className="bg-red-50 rounded-xl border border-red-200 p-6">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Communication</h2>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Error
                </span>
              </div>
              <div className="text-sm text-red-700 mb-3">
                {communicationError}
              </div>
              <button
                onClick={() => loadCommunicationData()}
                className="text-sm text-red-600 hover:text-red-800 underline"
              >
                Try again
              </button>
            </div>
          ) : (
            // Show fallback when no conversation exists
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-8 h-8 bg-gray-400 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Communication</h2>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  No active conversation
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {currentInvoice.scenario === 'missing_po' ? (
                  <p>This invoice is missing a PO reference, but no communication has been initiated yet.</p>
                ) : (
                  <p>No communication required for this invoice type.</p>
                )}
              </div>
            </div>
          )}

          {/* AI Analysis */}
          {currentInvoice.agentActivities && currentInvoice.agentActivities.length > 0 && (
            <div className="bg-purple-50 rounded-xl border border-purple-200 p-6">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">AI Analysis</h2>
              </div>
              <div className="space-y-2">
                {currentInvoice.agentActivities.map((activity, index) => (
                  <div key={index}>
                    <p className="text-sm text-gray-700">{activity.description}</p>
                    <div className="mt-2 flex items-center space-x-2">
                      <div className="flex-1 bg-purple-100 rounded-full h-1">
                        <div 
                          className="bg-purple-500 h-1 rounded-full" 
                          style={{ width: `${(activity.confidenceLevel || 0.95) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {Math.round((activity.confidenceLevel || 0.95) * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Exceptions */}
          {currentInvoice.exceptions && currentInvoice.exceptions.length > 0 && (
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-amber-600 text-xl">⚠</span>
                <h2 className="text-lg font-semibold text-gray-900">Exceptions</h2>
              </div>
              <div className="space-y-2">
                {currentInvoice.exceptions.map((exception) => (
                  <div key={exception.id}>
                    <p className="text-sm font-medium text-gray-900">{exception.type.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-gray-700 mt-1">{exception.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Floating Step Controls */}
      {stepInfo && communicationData?.hasConversation && (
        <div className="fixed bottom-6 right-6 bg-white rounded-lg shadow-lg border border-purple-200 p-4 z-50">
          <div className="flex items-center space-x-3">
            <div className="text-sm text-purple-600 font-medium">
              Step {stepInfo.currentStep + 1} of {stepInfo.maxSteps + 1}
            </div>
            {stepInfo.canAdvance && (
              <button
                onClick={advanceConversation}
                disabled={advancingStep}
                className="flex items-center space-x-2 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {advancingStep ? (
                  <>
                    <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <span>Next</span>
                  </>
                )}
              </button>
            )}
            {!stepInfo.canAdvance && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                Complete
              </span>
            )}
          </div>
          {stepInfo.canAdvance && (
            <p className="text-xs text-purple-500 mt-2">
              Demo controls for conversation flow
            </p>
          )}
        </div>
      )}
    </div>
  );
}