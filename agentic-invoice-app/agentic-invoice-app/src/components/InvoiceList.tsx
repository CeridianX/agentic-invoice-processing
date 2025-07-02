import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Zap, ChevronRight, ChevronDown, Brain, Activity, CheckCircle, AlertCircle, X, BarChart3 } from 'lucide-react';

// Shiny Text Component using framer-motion
const ShinyText = ({ children, className = "", variant = "purple" }: { children: React.ReactNode; className?: string; variant?: "purple" | "green" }) => {
  return (
    <>
      <style>
        {`
          @keyframes shine {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          .shiny-text-purple {
            background: linear-gradient(90deg, #c084fc 0%, #a855f7 25%, #7c3aed 50%, #a855f7 75%, #c084fc 100%);
            background-size: 200% 100%;
            background-clip: text;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: shine 2s ease-in-out infinite;
          }
          .shiny-text-green {
            background: linear-gradient(90deg, #4ade80 0%, #22c55e 25%, #16a34a 50%, #22c55e 75%, #4ade80 100%);
            background-size: 200% 100%;
            background-clip: text;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: shine 2s ease-in-out infinite;
          }
          @keyframes fade-in {
            0% { opacity: 0; }
            100% { opacity: 1; }
          }
          .animate-fade-in {
            animation: fade-in 0.8s ease-out;
          }
        `}
      </style>
      <motion.span 
        className={`${variant === "green" ? "shiny-text-green" : "shiny-text-purple"} ${className}`}
        initial={{ opacity: 0.8 }}
        animate={{ opacity: 1 }}
        transition={{ 
          duration: 0.5,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut"
        }}
      >
        {children}
      </motion.span>
    </>
  );
};
import DemoAnalyticsDashboard from './DemoAnalyticsDashboard';

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

interface Invoice {
  id: string;
  vendorId: string;
  invoiceNumber: string;
  invoiceDate: string;
  amount: number;
  status: string;
  approvalStatus: string;
  assignedTo?: string;
  poId?: string;
  receivedDate: string;
  dueDate: string;
  paymentTerms: string;
  hasIssues: boolean;
  variancePercentage?: number;
  currency: string;
  notes?: string;
  
  // Agent Zero specific fields
  agentProcessingStarted?: string;
  agentProcessingCompleted?: string;
  agentConfidence?: number;
  agentReasoning?: string;
  workflowRoute?: string;
  learningImpact?: string;
  processingTimeMs?: number;
  scenario?: string;
  
  vendor: Vendor;
  purchaseOrder?: { poNumber: string };
  exceptions?: Exception[];
  agentActivities?: AgentActivity[];
}

interface InvoiceListProps {
  onSelectInvoice: (invoice: Invoice) => void;
}

// Agent Zero types
interface AgentZeroStatus {
  status: string;
  initialized: boolean;
  activeAgents: number;
  activePlans: number;
  agentStatuses: Record<string, any>;
}

interface AgentZeroStep {
  id: string;
  agentName: string;
  action: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  confidence?: number;
}

interface AgentZeroActivity {
  type: string;
  data: any;
  timestamp: Date;
  icon?: string;
  message?: string;
  category?: string;
}

interface CurrentProcessing {
  invoiceId: string;
  status: string;
  timestamp: Date;
  scenario?: string;
  currentStep?: AgentZeroStep;
  lastCompletedStep?: string;
  batchInfo?: {
    index: number;
    total: number;
  };
}

// API service
const invoiceService = {
  getAll: async (): Promise<Invoice[]> => {
    try {
      const response = await fetch('http://localhost:3001/api/invoices');
      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching invoices:', error);
      // Fallback to mock data if API fails
      return [];
    }
  }
};

export default function InvoiceList({ onSelectInvoice }: InvoiceListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showAgentCard, setShowAgentCard] = useState(false);
  const [showPatternCard, setShowPatternCard] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pipelineExpanded, setPipelineExpanded] = useState(false);

  // Agent Zero state
  const [agentZeroStatus, setAgentZeroStatus] = useState<AgentZeroStatus | null>(null);
  const [agentZeroActivity, setAgentZeroActivity] = useState<AgentZeroActivity[]>([]);
  const [currentProcessing, setCurrentProcessing] = useState<CurrentProcessing | null>(null);
  const [agentZeroExpanded, setAgentZeroExpanded] = useState(false);
  const [agentStatuses, setAgentStatuses] = useState<Record<string, any>>({
    'CoordinatorAgent': { status: 'idle', currentTask: 'Waiting for invoices', confidence: 0.95 },
    'DocumentProcessorAgent': { status: 'idle', currentTask: 'Ready for extraction', confidence: 0.90 },
    'ValidationAgent': { status: 'idle', currentTask: 'Standing by', confidence: 0.93 },
    'WorkflowAgent': { status: 'idle', currentTask: 'Ready to route', confidence: 0.88 }
  });
  const [demoDropdownOpen, setDemoDropdownOpen] = useState(false);
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    loadInvoices();
    setupWebSocket();
    fetchAgentZeroStatus();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const setupWebSocket = () => {
    try {
      wsRef.current = new WebSocket('ws://localhost:3001');

      wsRef.current.onopen = () => {
        console.log('Connected to Agent Zero WebSocket');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 Raw WebSocket message:', message);
          handleAgentZeroMessage(message);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error, event.data);
        }
      };

      wsRef.current.onclose = () => {
        console.log('Agent Zero WebSocket disconnected');
        // Attempt to reconnect after 5 seconds
        setTimeout(setupWebSocket, 5000);
      };

      wsRef.current.onerror = (error) => {
        console.error('Agent Zero WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to setup WebSocket:', error);
    }
  };

  // Format activity messages to be user-friendly
  const formatActivityMessage = (type: string, data: any) => {
    const invoiceNumber = data?.invoiceId ? 
      invoices.find(inv => inv.id === data.invoiceId)?.invoiceNumber || 
      `#${data.invoiceId.slice(-6)}` : 
      (type.includes('invoice') ? 'invoice' : '');
    
    const agentDisplayName = {
      'CoordinatorAgent': 'Coordinator',
      'DocumentProcessorAgent': 'Document Processor', 
      'ValidationAgent': 'Validator',
      'WorkflowAgent': 'Workflow Router'
    };

    switch (type) {
      case 'agent_zero_processing_started':
        return {
          icon: '📋',
          message: `Invoice ${invoiceNumber} processing started`,
          category: 'processing'
        };

      case 'agent_zero_coordinator_started':
        return {
          icon: '🎯',
          message: `Coordinator analyzing invoice ${invoiceNumber}`,
          category: 'planning'
        };

      case 'agent_zero_coordinator_completed':
        const stepCount = data?.result?.stepsCount || 3;
        return {
          icon: '✅',
          message: `Processing plan created for ${invoiceNumber} (${stepCount} steps)`,
          category: 'planning'
        };

      case 'agent_zero_step_started':
        const agentName = agentDisplayName[data?.step?.agentName] || 'Agent';
        const action = data?.step?.action || 'processing';
        const actionMap = {
          'extract_data': 'extracting document data',
          'validate_invoice': 'validating invoice', 
          'route_approval': 'routing for approval'
        };
        const friendlyAction = actionMap[action] || action;
        
        return {
          icon: data?.step?.agentName === 'DocumentProcessorAgent' ? '📄' :
                data?.step?.agentName === 'ValidationAgent' ? '🔍' : '🚀',
          message: `${agentName} ${friendlyAction} for ${invoiceNumber}`,
          category: 'execution'
        };

      case 'agent_zero_step_completed':
        // We need to get the agent from current processing state
        // This will be enhanced when we have the step result data
        const confidence = data?.result?.confidence ? 
          ` (${Math.round(data.result.confidence * 100)}% confidence)` : '';
        
        // Try to determine which agent completed based on result data
        let completedAgentName = 'Agent';
        let completedAction = 'step';
        let completedIcon = '✅';
        
        if (data?.result?.extractedData) {
          completedAgentName = 'Document Processor';
          completedAction = 'data extraction';
          completedIcon = '📄';
        } else if (data?.result?.isValid !== undefined) {
          completedAgentName = 'Validator';
          completedAction = 'validation';
          completedIcon = '🔍';
          if (data.result.issues?.length > 0) {
            completedIcon = '⚠️';
            completedAction = `validation (${data.result.issues.length} issue${data.result.issues.length > 1 ? 's' : ''} found)`;
          }
        } else if (data?.result?.route || data?.result?.workflowType) {
          completedAgentName = 'Workflow Router';
          const route = data.result.route || data.result.workflowType;
          const routeMap = {
            'auto_approve': 'approved for auto-payment',
            'manager_approval': 'routed to manager',
            'executive_approval': 'routed to executive',
            'manual_review': 'flagged for review'
          };
          completedAction = `routing (${routeMap[route] || route})`;
          completedIcon = route === 'auto_approve' ? '💰' : 
                        route === 'manual_review' ? '⚠️' : '🚀';
        }
        
        return {
          icon: completedIcon,
          message: `${completedAgentName} completed ${completedAction} for ${invoiceNumber}${confidence}`,
          category: 'execution'
        };

      case 'agent_zero_processing_completed':
        // Try to get more context about the final outcome
        let completionMessage = `Invoice ${invoiceNumber} processing completed`;
        let completionIcon = '🎉';
        
        // Look for result data in the related invoice
        const processedInvoice = invoices.find(inv => inv.id === data?.invoiceId);
        if (processedInvoice) {
          if (processedInvoice.status === 'approved') {
            completionMessage = `Invoice ${invoiceNumber} approved for payment`;
            completionIcon = '💰';
          } else if (processedInvoice.status === 'requires_review') {
            completionMessage = `Invoice ${invoiceNumber} requires manual review`;
            completionIcon = '⚠️';
          } else if (processedInvoice.status === 'pending_approval') {
            completionMessage = `Invoice ${invoiceNumber} pending approval`;
            completionIcon = '⏳';
          }
        }
        
        return {
          icon: completionIcon,
          message: completionMessage,
          category: 'completion'
        };

      case 'invoice_created':
        const invoiceCount = data?.invoices?.length || 1;
        return {
          icon: '📥',
          message: `${invoiceCount} new demo invoice${invoiceCount > 1 ? 's' : ''} created`,
          category: 'system'
        };

      default:
        // Fallback for unknown types
        const cleanType = type.replace('agent_zero_', '').replace(/_/g, ' ');
        return {
          icon: '📋',
          message: cleanType,
          category: 'system'
        };
    }
  };

  const handleAgentZeroMessage = (message: any) => {
    const formattedActivity = formatActivityMessage(message.type, message.data);
    
    const activity: AgentZeroActivity = {
      type: message.type,
      data: message.data,
      timestamp: new Date(),
      ...formattedActivity // Add formatted message, icon, category
    };

    setAgentZeroActivity(prev => [activity, ...prev.slice(0, 19)]); // Keep last 20 activities

    switch (message.type) {
      case 'agent_zero_status':
        setAgentZeroStatus(message.data);
        break;
      case 'agent_zero_processing_started':
        setCurrentProcessing({
          invoiceId: message.data.invoiceId,
          status: 'started',
          timestamp: new Date()
        });
        break;
      case 'agent_zero_coordinator_started':
        setAgentStatuses(prev => ({
          ...prev,
          'CoordinatorAgent': {
            status: 'working',
            currentTask: 'Creating orchestration plan',
            confidence: 0.95
          }
        }));
        break;
      case 'agent_zero_coordinator_completed':
        setAgentStatuses(prev => ({
          ...prev,
          'CoordinatorAgent': {
            status: 'idle',
            currentTask: 'Plan created',
            confidence: message.data.confidence || 0.95
          }
        }));
        break;
      case 'agent_zero_step_started':
        setCurrentProcessing(prev => prev ? {
          ...prev,
          currentStep: message.data.step,
          status: 'processing'
        } : null);
        
        // Update specific agent status to working
        if (message.data.step && message.data.step.agentName) {
          setAgentStatuses(prev => ({
            ...prev,
            [message.data.step.agentName]: {
              status: 'working',
              currentTask: message.data.step.action,
              confidence: message.data.step.confidence || 0.85
            }
          }));
        }
        break;
        
      case 'agent_zero_step_completed':
        setCurrentProcessing(prev => {
          // Update agent status to completed using the current step info
          if (prev?.currentStep?.agentName) {
            setAgentStatuses(prevStatuses => ({
              ...prevStatuses,
              [prev.currentStep.agentName]: {
                status: 'idle',
                currentTask: 'Completed',
                confidence: message.data.result?.confidence || prev.currentStep.confidence || 0.85
              }
            }));
          }
          
          return prev ? {
            ...prev,
            lastCompletedStep: message.data.stepId,
            status: 'processing'
          } : null;
        });
        break;
      case 'agent_zero_processing_completed':
        setCurrentProcessing(null);
        
        // Show completion state briefly
        setShowCompletion(true);
        setTimeout(() => setShowCompletion(false), 2000);
        
        // Reset agents gradually to avoid jarring UI updates
        setTimeout(() => {
          setAgentStatuses(prev => ({
            ...prev,
            'CoordinatorAgent': { status: 'idle', currentTask: 'Waiting for invoices', confidence: 0.95 },
            'DocumentProcessorAgent': { status: 'idle', currentTask: 'Ready for extraction', confidence: 0.90 },
            'ValidationAgent': { status: 'idle', currentTask: 'Standing by', confidence: 0.93 },
            'WorkflowAgent': { status: 'idle', currentTask: 'Ready to route', confidence: 0.88 }
          }));
        }, 2500);
        
        // Update specific invoice instead of reloading entire list
        if (message.data.invoiceId) {
          setInvoices(prev => prev.map(invoice => 
            invoice.id === message.data.invoiceId 
              ? { ...invoice, agentProcessingCompleted: new Date().toISOString() }
              : invoice
          ));
        }
        
        // Also refresh the invoice list to get latest status from backend
        setTimeout(() => {
          console.log('🔄 Refreshing invoice list after processing completion');
          loadInvoices();
        }, 1000);
        break;
      case 'invoice_created':
        console.log('🆕 Invoice created event received:', message.data);
        // Add new invoice(s) to the list
        if (message.data.invoices) {
          // Batch creation
          console.log('📦 Adding batch of invoices:', message.data.invoices.length);
          setInvoices(prev => [...message.data.invoices, ...prev]);
        } else if (message.data.invoice) {
          // Single invoice creation
          console.log('📝 Adding single invoice:', message.data.invoice.invoiceNumber);
          setInvoices(prev => [message.data.invoice, ...prev]);
        }
        
        // Refresh invoice list to ensure we have latest data
        setTimeout(() => {
          console.log('🔄 Refreshing invoice list after creation');
          loadInvoices();
        }, 500);
        break;
      case 'invoice_processing_started':
        console.log('🎯 INVOICE_PROCESSING_STARTED EVENT:', message.data);
        console.log('📊 Scenario received:', message.data.scenario);
        
        // Update invoice status to show it's being processed
        setInvoices(prev => prev.map(inv => 
          inv.id === message.data.invoiceId 
            ? { ...inv, agentProcessingStarted: message.data.timestamp }
            : inv
        ));
        setCurrentProcessing({
          invoiceId: message.data.invoiceId,
          status: 'processing',
          timestamp: new Date(),
          scenario: message.data.scenario,
          batchInfo: message.data.batchIndex ? {
            index: message.data.batchIndex,
            total: message.data.batchTotal
          } : undefined
        });
        
        // Start the agent activity simulation
        console.log('🚀 About to call simulateAgentActivity with:', message.data.invoiceId, message.data.scenario);
        simulateAgentActivity(message.data.invoiceId, message.data.scenario);
        break;
      case 'invoice_processing_completed':
        // Update invoice with processing results including status
        setInvoices(prev => prev.map(inv => 
          inv.id === message.data.invoiceId 
            ? { 
                ...inv, 
                agentProcessingCompleted: message.data.timestamp,
                agentConfidence: message.data.result?.confidence,
                agentReasoning: message.data.result?.reasoning,
                workflowRoute: message.data.result?.workflowRoute,
                processingTimeMs: message.data.result?.processingTimeMs,
                // Update status based on processing result
                status: message.data.result?.status || 
                        (message.data.result?.workflowRoute === 'auto_approve' ? 'approved' :
                         message.data.result?.workflowRoute === 'manual_review' ? 'requires_review' :
                         message.data.result?.workflowRoute === 'manager_approval' ? 'pending_approval' :
                         inv.status), // Keep existing status if no route specified
                // Update hasIssues based on result
                hasIssues: message.data.result?.hasIssues !== undefined ? 
                          message.data.result.hasIssues : inv.hasIssues
              }
            : inv
        ));
        // Clear current processing if it matches
        setCurrentProcessing(prev => 
          prev?.invoiceId === message.data.invoiceId ? null : prev
        );
        
        // Reset agents to completed state briefly, then back to idle
        console.log('🏁 PROCESSING COMPLETED - Setting agents to completed state');
        setTimeout(() => {
          const completedStatuses = {
            'CoordinatorAgent': { status: 'idle', currentTask: 'Completed', confidence: 0.95 },
            'DocumentProcessorAgent': { status: 'idle', currentTask: 'Completed', confidence: 0.90 },
            'ValidationAgent': { status: 'idle', currentTask: 'Completed', confidence: 0.93 },
            'WorkflowAgent': { status: 'idle', currentTask: 'Completed', confidence: 0.88 }
          };
          console.log('✅ Setting completion statuses:', completedStatuses);
          setAgentStatuses(completedStatuses);
        }, 500);
        
        setTimeout(() => {
          const idleStatuses = {
            'CoordinatorAgent': { status: 'idle', currentTask: 'Waiting for invoices', confidence: 0.95 },
            'DocumentProcessorAgent': { status: 'idle', currentTask: 'Ready for extraction', confidence: 0.90 },
            'ValidationAgent': { status: 'idle', currentTask: 'Standing by', confidence: 0.93 },
            'WorkflowAgent': { status: 'idle', currentTask: 'Ready to route', confidence: 0.88 }
          };
          console.log('💤 Setting back to idle statuses:', idleStatuses);
          setAgentStatuses(idleStatuses);
        }, 3000);
        break;
      case 'invoice_updated':
        // Update specific invoice in the list
        setInvoices(prev => prev.map(inv => 
          inv.id === message.data.invoiceId 
            ? { ...inv, ...message.data.updates }
            : inv
        ));
        break;
    }
  };

  const fetchAgentZeroStatus = async () => {
    // Status will be received via WebSocket, no need for separate API call
    console.log('Agent Zero status will be received via WebSocket');
  };

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const data = await invoiceService.getAll();
      setInvoices(data);
    } catch (error) {
      console.error('Failed to load invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Track completion state for brief success flash
  const [showCompletion, setShowCompletion] = useState(false);

  // Dynamic Agent System Status - memoized to prevent unnecessary recalculations
  const agentSystemStatus = useMemo(() => {
    const workingAgents = Object.values(agentStatuses).filter(s => s?.status === 'working').length;
    const completedAgents = Object.values(agentStatuses).filter(s => s?.currentTask === 'Completed').length;
    const isProcessing = currentProcessing !== null;
    
    // Show completion state briefly
    if (showCompletion) {
      return {
        text: 'Invoice processed',
        style: 'completed',
        animation: 'shiny-green',
        color: 'text-green-500'
      };
    }
    
    // Simplified processing states - just show "Agents processing..." for any active work
    if (isProcessing || workingAgents > 0 || completedAgents > 0) {
      return {
        text: 'Agents processing...',
        style: 'processing',
        animation: 'shiny',
        color: 'text-blue-400'
      };
    } else {
      return {
        text: '4 agents ready...',
        style: 'ready',
        animation: 'none',
        color: 'text-green-500'
      };
    }
  }, [agentStatuses, currentProcessing, showCompletion]);

  // Memoized calculations for exception and approval counts
  const exceptionCount = useMemo(() => {
    return invoices.filter(i => 
      i.status === 'pending_review' || 
      i.status === 'requires_review' ||
      i.status === 'exception' ||
      i.status === 'pending_internal_review' || // Include AI internal queries
      (i.hasIssues && i.status !== 'approved' && i.status !== 'processed')
    ).length;
  }, [invoices]);

  const exceptionsByType = useMemo(() => {
    const exceptions = invoices.filter(i => 
      i.status === 'pending_review' || 
      i.status === 'requires_review' ||
      i.status === 'exception' ||
      i.status === 'pending_internal_review' || // Include AI internal queries
      (i.hasIssues && i.status !== 'approved' && i.status !== 'processed')
    );
    
    // For demo purposes, simulate AI vs Human resolution
    // In real implementation, this would be based on actual resolution data
    const aiHandled = exceptions.filter(inv => {
      // AI typically handles: duplicate detection, format issues, validation errors, internal queries
      return inv.scenario === 'duplicate' || 
             inv.scenario === 'poor_quality' ||
             inv.scenario === 'missing_po' || // AI handles PO queries
             inv.status === 'pending_internal_review' || // AI internal queries
             (inv.agentConfidence && inv.agentConfidence > 0.7);
    }).length;
    
    const humanHandled = exceptions.length - aiHandled;
    
    return {
      total: exceptions.length,
      ai: aiHandled,
      human: humanHandled
    };
  }, [invoices]);

  const approvalCount = useMemo(() => {
    return invoices.filter(i => i.status === 'pending_approval').length;
  }, [invoices]);

  const urgentApprovals = useMemo(() => {
    return invoices.filter(i => {
      if (i.status !== 'pending_approval') return false;
      const dueDate = new Date(i.dueDate);
      const today = new Date();
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilDue <= 3;
    }).length;
  }, [invoices]);

  // Memoized calculations for metrics
  const pendingInvoices = useMemo(() => {
    return invoices.filter(inv => 
      inv.status === 'pending' || 
      (inv.status === 'pending_approval' && !inv.agentProcessingCompleted)
    );
  }, [invoices]);

  const processedInvoices = useMemo(() => {
    return invoices.filter(inv => inv.agentConfidence && inv.agentConfidence > 0);
  }, [invoices]);

  const automationRate = useMemo(() => {
    const automatedInvoices = invoices.filter(inv => 
      inv.agentConfidence && inv.agentConfidence > 0.8 && 
      (inv.workflowRoute === 'auto_approve' || inv.agentConfidence > 0.9)
    );
    return processedInvoices.length > 0 
      ? Math.round((automatedInvoices.length / processedInvoices.length) * 100)
      : 0;
  }, [invoices, processedInvoices]);

  const processedToday = useMemo(() => {
    return invoices.filter(inv => {
      if (!inv.agentProcessingCompleted) return false;
      const today = new Date().toDateString();
      const processed = new Date(inv.agentProcessingCompleted).toDateString();
      return today === processed;
    });
  }, [invoices]);

  const todayValue = useMemo(() => {
    return processedToday.reduce((sum, inv) => sum + inv.amount, 0);
  }, [processedToday]);

  const totalValue = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + inv.amount, 0);
  }, [invoices]);

  const getProcessStatusBadge = (invoice: Invoice) => {
    // Determine the actual process status based on invoice state
    let processStatus = '';
    let statusClass = '';
    
    
    // Check if agent processing appears stuck (started more than 2 minutes ago without completion)
    const processingStartTime = invoice.agentProcessingStarted ? new Date(invoice.agentProcessingStarted).getTime() : 0;
    const isProcessingStuck = processingStartTime > 0 && 
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
    else if (invoice.status === 'approved' || (invoice.approvalStatus === 'approved' && invoice.status !== 'paid')) {
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
    
    // Get tooltip text for detailed explanation
    const getTooltipText = () => {
      switch (processStatus) {
        case 'Processing':
          return 'AI is currently analyzing and processing this invoice';
        case 'Internal Query':
          return 'AI sent query to procurement team about missing PO reference and is awaiting response';
        case 'Exception':
          return 'Invoice has exceptions or issues that need to be resolved before approval';
        case 'In Approval':
          if (invoice.assignedTo === 'manager') {
            return 'Waiting for manager approval';
          } else if (invoice.assignedTo === 'executive-team') {
            return 'Waiting for executive approval due to high value or risk';
          }
          return 'Waiting for approval';
        case 'Ready':
          return 'Invoice approved and ready for payment processing';
        case 'Paid':
          return 'Invoice has been processed and paid';
        default:
          return processStatus;
      }
    };

    return (
      <span 
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${statusClass} cursor-help`}
        title={getTooltipText()}
      >
        {processStatus === 'Processing' && <span className="w-2 h-2 bg-blue-500 rounded-full mr-1.5 animate-pulse"></span>}
        {processStatus === 'Exception' && <span className="text-orange-600 mr-1">⚠</span>}
        {processStatus}
      </span>
    );
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { days: Math.abs(diffDays), status: 'overdue', className: 'text-red-600 font-medium' };
    } else if (diffDays <= 3) {
      return { days: diffDays, status: 'urgent', className: 'text-amber-600 font-medium' };
    } else {
      return { days: diffDays, status: 'normal', className: 'text-gray-600' };
    }
  };

  const simulateAgentActivity = (invoiceId: string, scenario: string) => {
    console.log('🎪 SIMULATE_AGENT_ACTIVITY CALLED:', { invoiceId, scenario });
    console.log('🔍 Current agentStatuses before simulation:', agentStatuses);
    
    // Define different processing steps based on scenario
    const getProcessingSteps = (scenario: string) => {
      console.log('⚙️ Getting processing steps for scenario:', scenario);
      const baseSteps = [
        {
          agent: 'CoordinatorAgent',
          task: `Analyzing ${scenario} invoice`,
          duration: scenario === 'simple' ? 500 : 800,
          confidence: 0.95
        }
      ];

      // Document processing varies by scenario
      if (scenario === 'poor_quality') {
        baseSteps.push({
          agent: 'DocumentProcessorAgent',
          task: 'Enhanced OCR processing',
          duration: 2500,
          confidence: 0.75
        });
      } else if (scenario === 'complex') {
        baseSteps.push({
          agent: 'DocumentProcessorAgent',
          task: 'Multi-method extraction',
          duration: 1800,
          confidence: 0.88
        });
      } else {
        baseSteps.push({
          agent: 'DocumentProcessorAgent',
          task: 'Fast text extraction',
          duration: 1000,
          confidence: 0.94
        });
      }

      // Validation varies by scenario  
      if (scenario === 'duplicate') {
        baseSteps.push({
          agent: 'ValidationAgent',
          task: 'Duplicate detection',
          duration: 1500,
          confidence: 0.85
        });
      } else if (scenario === 'exceptional') {
        baseSteps.push({
          agent: 'ValidationAgent',
          task: 'Enhanced validation',
          duration: 1200,
          confidence: 0.91
        });
      } else {
        baseSteps.push({
          agent: 'ValidationAgent',
          task: 'Standard validation',
          duration: 800,
          confidence: 0.96
        });
      }

      // Workflow routing varies by scenario
      if (scenario === 'exceptional') {
        baseSteps.push({
          agent: 'WorkflowAgent',
          task: 'Executive routing',
          duration: 900,
          confidence: 0.87
        });
      } else if (scenario === 'complex') {
        baseSteps.push({
          agent: 'WorkflowAgent',
          task: 'Manager approval',
          duration: 700,
          confidence: 0.92
        });
      } else {
        baseSteps.push({
          agent: 'WorkflowAgent',
          task: 'Auto-approval',
          duration: 400,
          confidence: 0.98
        });
      }

      return baseSteps;
    };

    const processingSteps = getProcessingSteps(scenario);
    console.log('📋 Generated processing steps:', processingSteps);

    let delay = 0;
    processingSteps.forEach((step, index) => {
      console.log(`⏰ Scheduling step ${index + 1}: ${step.agent} - ${step.task} (delay: ${delay}ms)`);
      
      // Set agent to working state
      setTimeout(() => {
        console.log(`🔄 EXECUTING STEP: ${step.agent} -> ${step.task}`);
        setAgentStatuses(prev => {
          const newStatuses = {
            ...prev,
            [step.agent]: {
              status: 'working',
              currentTask: step.task,
              confidence: step.confidence
            }
          };
          console.log('📊 Setting agentStatuses to:', newStatuses);
          return newStatuses;
        });
      }, delay);

      delay += step.duration;

      // Set agent back to idle after completion
      setTimeout(() => {
        console.log(`✅ COMPLETING STEP: ${step.agent} -> ${index === processingSteps.length - 1 ? 'Completed' : 'Ready'}`);
        setAgentStatuses(prev => {
          const newStatuses = {
            ...prev,
            [step.agent]: {
              status: 'idle',
              currentTask: index === processingSteps.length - 1 ? 'Completed' : 'Ready',
              confidence: step.confidence
            }
          };
          console.log('📊 Setting completion agentStatuses to:', newStatuses);
          return newStatuses;
        });
      }, delay);
    });

    // Reset all agents to idle after processing is complete
    setTimeout(() => {
      console.log('🔄 FINAL RESET: Setting all agents back to idle');
      const finalStatuses = {
        'CoordinatorAgent': { status: 'idle', currentTask: 'Waiting for invoices', confidence: 0.95 },
        'DocumentProcessorAgent': { status: 'idle', currentTask: 'Ready for extraction', confidence: 0.90 },
        'ValidationAgent': { status: 'idle', currentTask: 'Standing by', confidence: 0.93 },
        'WorkflowAgent': { status: 'idle', currentTask: 'Ready to route', confidence: 0.88 }
      };
      console.log('📊 Final agentStatuses:', finalStatuses);
      setAgentStatuses(finalStatuses);
    }, delay + 1000);
  };

  const getAIAnalysis = (invoice: Invoice) => {
    // Use Agent Zero confidence if available, otherwise calculate
    let confidence = invoice.agentConfidence ? Math.round(invoice.agentConfidence * 100) : 95;
    let barColor = 'bg-green-500';
    let variance = '';
    let status = 'Processed';
    let processingTime = '';

    // Check Agent Zero processing status
    if (invoice.agentProcessingStarted && !invoice.agentProcessingCompleted) {
      status = 'Processing...';
      confidence = 50;
      barColor = 'bg-blue-500';
    } else if (invoice.agentProcessingCompleted) {
      status = 'AI Processed';
      if (invoice.processingTimeMs) {
        processingTime = `${(invoice.processingTimeMs / 1000).toFixed(1)}s`;
      }
    }

    // Determine confidence and color based on Agent Zero analysis
    if (invoice.agentConfidence) {
      if (invoice.agentConfidence >= 0.9) {
        barColor = 'bg-green-500';
      } else if (invoice.agentConfidence >= 0.7) {
        barColor = 'bg-amber-500';
      } else {
        barColor = 'bg-red-500';
      }
    } else {
      // Fallback to legacy logic
      if (invoice.hasIssues || invoice.status === 'pending_review') {
        confidence = 75 + Math.random() * 15;
        barColor = 'bg-amber-500';
      }
    }

    if (invoice.variancePercentage) {
      variance = `${invoice.variancePercentage.toFixed(1)}% variance`;
    }

    // Add workflow route info
    let route = invoice.workflowRoute || 'Standard';
    
    return { 
      confidence: Math.round(confidence), 
      bar: `w-[${Math.round(confidence)}%] ${barColor}`,
      variance,
      status,
      processingTime,
      route,
      scenario: invoice.scenario,
      reasoning: invoice.agentReasoning
    };
  };

  if (loading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading invoices...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Invoice Processing</h1>
        <p className="mt-1 text-sm text-gray-600">AI-powered accounts payable with intelligent line-item matching</p>
      </div>

      {/* Agent Recommendations Card */}
      {showAgentCard && (
        <div 
          className="mb-4 relative overflow-hidden animate-fadeIn"
          style={{
            background: '#FFFFFF',
            backgroundImage: 'linear-gradient(135deg, #F3E8FF 0%, #FFFFFF 50%)',
            border: '1px solid #E9D5FF',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)'
          }}
        >
          {/* Purple glow orb */}
          <div 
            className="absolute pointer-events-none"
            style={{
              top: '-50%',
              right: '-10%',
              width: '300px',
              height: '300px',
              background: 'radial-gradient(circle, rgba(147, 51, 234, 0.15) 0%, transparent 70%)',
              filter: 'blur(60px)',
              opacity: 0.5
            }}
          />
          
          {/* Content */}
          <div className="relative flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div 
                  className="flex items-center justify-center"
                  style={{
                    width: '48px',
                    height: '48px',
                    background: 'linear-gradient(135deg, #9333EA 0%, #A855F7 100%)',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(147, 51, 234, 0.3)'
                  }}
                >
                  <Sparkles size={24} color="white" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Agent Recommendations</h3>
                <p className="text-sm text-gray-600">
                  {invoices.filter(i => !i.hasIssues).length} invoices match auto-approval criteria • 95% confidence
                </p>
              </div>
            </div>
            <button 
              className="text-white font-semibold transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: '#3B82F6',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(59, 130, 246, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.15)';
              }}
            >
              Approve All
            </button>
          </div>
        </div>
      )}

      {/* Agent Zero Control Panel */}
      <div 
        className="mb-6 relative overflow-hidden transition-all duration-500 ease-in-out"
        style={{
          background: 'linear-gradient(180deg, #1E293B 0%, #0F172A 100%)',
          borderRadius: '16px',
          padding: agentZeroExpanded ? '20px 24px 24px 24px' : '16px 24px 16px 24px',
          boxShadow: '0 0.5px 2px rgba(0, 0, 0, 0.04), 0 2px 8px rgba(0, 0, 0, 0.04), 0 8px 16px rgba(0, 0, 0, 0.04)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          maxHeight: agentZeroExpanded ? '600px' : '80px',
          transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        {/* Header Section - Only this part is clickable */}
        <div 
          className="flex justify-between items-center cursor-pointer hover:bg-white/5 rounded-lg p-2 -m-2 transition-colors"
          onClick={() => setAgentZeroExpanded(!agentZeroExpanded)}
        >
          <div className="flex items-center gap-4">
            <div 
              className="flex items-center justify-center relative overflow-hidden"
              style={{
                width: '36px',
                height: '36px',
                background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                borderRadius: '10px',
                boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3), 0 4px 12px rgba(59, 130, 246, 0.2), 0 8px 24px rgba(59, 130, 246, 0.1)'
              }}
            >
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 100%)'
                }}
              />
              <Brain size={18} color="white" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Agent Zero Intelligence</h3>
              <div className="text-xs text-slate-300">Multi-agent orchestration system</div>
            </div>
            <div 
              className="inline-flex items-center gap-1.5 text-xs font-medium text-white"
              style={{
                padding: '4px 10px',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(29, 78, 216, 0.3) 100%)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}
            >
              <div 
                className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"
                style={{
                  boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.3)'
                }}
              />
              <span>{agentZeroStatus?.activeAgents || 0} agents</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-lg font-semibold text-white">
                {agentZeroStatus?.activePlans || 0}
              </div>
              <div className="text-xs text-slate-400">Active plans</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-white">
                {agentZeroStatus?.status === 'running' ? '100%' : '0%'}
              </div>
              <div className="text-xs text-slate-400">Uptime</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-white">
                {agentZeroActivity.length}
              </div>
              <div className="text-xs text-slate-400">Activities</div>
            </div>
            <div
              className="ml-4 p-2 rounded-lg transition-all duration-200 text-slate-300"
              style={{
                transform: agentZeroExpanded ? 'rotate(0deg)' : 'rotate(-180deg)',
                transition: 'transform 0.3s ease'
              }}
            >
              <ChevronDown size={16} />
            </div>
          </div>
        </div>
        
        {/* Agent Zero Activity - Fixed Layout Grid */}
        <div 
          className="transition-all duration-500 ease-in-out"
          style={{
            opacity: agentZeroExpanded ? 1 : 0,
            maxHeight: agentZeroExpanded ? '520px' : '0px',
            overflow: 'hidden',
            marginTop: agentZeroExpanded ? '16px' : '0px',
            transform: agentZeroExpanded ? 'translateY(0)' : 'translateY(-10px)'
          }}
        >
          {/* CSS Grid Layout Container */}
          <div 
            className="grid gap-4"
            style={{
              gridTemplateRows: '80px auto minmax(160px, 1fr)',
              gridTemplateAreas: `
                "processing"
                "agents"
                "activity"
              `
            }}
          >
            {/* Processing Status Zone - Fixed 80px height */}
            <div 
              className="relative overflow-hidden rounded-lg border border-slate-700 transition-all duration-300"
              style={{ 
                gridArea: 'processing',
                background: currentProcessing 
                  ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(30, 41, 59, 0.5) 100%)'
                  : 'rgba(30, 41, 59, 0.2)'
              }}
            >
              {/* Processing Active State */}
              <div 
                className="absolute inset-0 p-3 transition-all duration-300"
                style={{
                  opacity: currentProcessing ? 1 : 0,
                  transform: currentProcessing ? 'translateY(0)' : 'translateY(10px)'
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Activity size={16} className="text-blue-400 animate-pulse" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">
                        Processing Invoice #{currentProcessing?.invoiceId?.slice(-8) || ''}
                      </span>
                      {currentProcessing?.scenario && (
                        <span className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded">
                          {currentProcessing.scenario}
                        </span>
                      )}
                      {currentProcessing?.batchInfo && (
                        <span className="px-2 py-0.5 text-xs bg-purple-600 text-white rounded">
                          {currentProcessing.batchInfo.index}/{currentProcessing.batchInfo.total}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {currentProcessing?.status} • {currentProcessing?.timestamp?.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                
                {/* Processing Pipeline - Compact Inline */}
                <div className="ml-7">
                  <div className="flex items-center gap-1">
                    {['Coordinator', 'Extractor', 'Validator', 'Router'].map((name, index) => {
                      const agentName = name === 'Coordinator' ? 'CoordinatorAgent' :
                                      name === 'Extractor' ? 'DocumentProcessorAgent' :
                                      name === 'Validator' ? 'ValidationAgent' : 'WorkflowAgent';
                      const status = agentStatuses[agentName];
                      const isActive = status?.status === 'working';
                      const isCompleted = status?.currentTask === 'Completed';
                      
                      return (
                        <div key={name} className="flex items-center gap-1">
                          <div 
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${
                              isActive 
                                ? 'bg-blue-400 animate-pulse shadow-lg shadow-blue-400/50' 
                                : isCompleted
                                  ? 'bg-green-400 shadow-lg shadow-green-400/50'
                                  : 'bg-slate-600'
                            }`}
                          />
                          <span className={`text-xs font-medium ${isActive ? 'text-blue-300' : isCompleted ? 'text-green-300' : 'text-slate-500'}`}>
                            {name}
                          </span>
                          {index < 3 && (
                            <ChevronRight size={8} className={`mx-1 ${
                              isActive ? 'text-blue-400' : isCompleted ? 'text-green-400' : 'text-slate-600'
                            }`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Idle State */}
              <div 
                className="absolute inset-0 p-3 flex items-center justify-start transition-all duration-300"
                style={{
                  opacity: currentProcessing ? 0 : 1,
                  transform: currentProcessing ? 'translateY(-10px)' : 'translateY(0)'
                }}
              >
                <div className="flex items-center gap-3 text-slate-400">
                  <div className="w-8 h-8 rounded-full bg-slate-700/50 flex items-center justify-center">
                    <Brain size={16} className="text-slate-500" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-300">No Active Processing</div>
                    <div className="text-xs text-slate-500">Agents ready for next invoice</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Agent Status Grid - Compact Design */}
            <div className="grid grid-cols-2 gap-2" style={{ gridArea: 'agents' }}>
              {['CoordinatorAgent', 'DocumentProcessorAgent', 'ValidationAgent', 'WorkflowAgent'].map((agentName) => {
                const status = agentStatuses[agentName];
                const isActive = status?.status === 'working';
                const isCompleted = status?.currentTask === 'Completed';
                const displayName = agentName === 'CoordinatorAgent' ? 'Coordinator' :
                                 agentName === 'DocumentProcessorAgent' ? 'Extractor' :
                                 agentName === 'ValidationAgent' ? 'Validator' : 'Router';
                
                // Debug logging for each agent card render
                console.log(`🎭 AGENT CARD RENDER - ${agentName}:`, {
                  status: status?.status,
                  isActive: isActive,
                  isCompleted: isCompleted,
                  currentTask: status?.currentTask,
                  confidence: status?.confidence,
                  fullStatus: JSON.stringify(status)
                });
                
                return (
                  <div 
                    key={agentName}
                    className={`p-2 rounded-lg border transition-all duration-300 ${
                      isActive 
                        ? 'bg-blue-900/40 border-blue-500/50 shadow-lg shadow-blue-500/20' 
                        : isCompleted
                          ? 'bg-green-900/30 border-green-500/50'
                          : 'bg-slate-800/30 border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div 
                          className={`w-2 h-2 rounded-full transition-all duration-300 flex-shrink-0 ${
                            isActive 
                              ? 'bg-blue-400 animate-pulse shadow-lg shadow-blue-400/50' 
                              : isCompleted
                                ? 'bg-green-400 shadow-lg shadow-green-400/50'
                                : 'bg-slate-500'
                          }`}
                        />
                        <span className="text-xs font-medium text-white truncate">
                          {displayName}
                        </span>
                      </div>
                      {status?.confidence && (
                        <span className={`text-xs font-semibold ${
                          isActive ? 'text-blue-300' : isCompleted ? 'text-green-300' : 'text-slate-400'
                        }`}>
                          {Math.round(status.confidence * 100)}%
                        </span>
                      )}
                    </div>
                    <div className={`text-xs mt-1 truncate transition-colors duration-300 ${
                      isActive ? 'text-blue-300' : isCompleted ? 'text-green-300' : 'text-slate-400'
                    }`}>
                      {status?.currentTask || 'Idle'}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Activity Feed - Flexible height */}
            <div 
              className="rounded-lg border border-slate-700 bg-slate-800/20 p-3"
              style={{ 
                gridArea: 'activity',
                minHeight: '200px',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Activity size={14} className="text-slate-400" />
                <span className="text-xs font-medium text-slate-300">Recent Activity</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2" style={{ maxHeight: '240px' }}>
                {agentZeroActivity.slice(0, 12).map((activity, index) => {
                  const getCategoryColor = (category: string) => {
                    switch (category) {
                      case 'planning': return 'text-purple-400';
                      case 'execution': return 'text-blue-400';
                      case 'completion': return 'text-green-400';
                      case 'system': return 'text-gray-400';
                      default: return 'text-blue-400';
                    }
                  };

                  const getCategoryIcon = (type: string, category: string) => {
                    if (activity.icon) return null; // Use emoji if available
                    
                    if (type.includes('completed')) {
                      return <CheckCircle size={12} className="text-green-400" />;
                    } else if (type.includes('error')) {
                      return <AlertCircle size={12} className="text-red-400" />;
                    } else {
                      return <Activity size={12} className={getCategoryColor(category)} />;
                    }
                  };

                  return (
                    <div 
                      key={index}
                      className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/40"
                    >
                      <div className="flex-shrink-0">
                        {activity.icon ? (
                          <span className="text-xs">{activity.icon}</span>
                        ) : (
                          getCategoryIcon(activity.type, activity.category || 'system')
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-white truncate">
                          {activity.message || activity.type.replace('agent_zero_', '').replace('_', ' ')}
                        </div>
                        <div className="text-xs text-slate-500">
                          {activity.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {agentZeroActivity.length === 0 && (
                  <div className="text-xs text-slate-500 text-center py-4">
                    No recent activity
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* AI Processing Pipeline */}
      <div 
        className="mb-6 relative overflow-hidden transition-all duration-500 ease-in-out cursor-pointer"
        onClick={() => setPipelineExpanded(!pipelineExpanded)}
        style={{
          background: 'linear-gradient(180deg, #FFFFFF 0%, #FAFBFC 100%)',
          borderRadius: '16px',
          padding: pipelineExpanded ? '20px 24px 16px 24px' : '16px 24px 16px 24px',
          boxShadow: '0 0.5px 2px rgba(0, 0, 0, 0.04), 0 2px 8px rgba(0, 0, 0, 0.04), 0 8px 16px rgba(0, 0, 0, 0.04)',
          border: '1px solid rgba(0, 0, 0, 0.04)',
          maxHeight: pipelineExpanded ? '500px' : '80px',
          transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        {/* Header Section */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div 
              className="flex items-center justify-center relative overflow-hidden"
              style={{
                width: '36px',
                height: '36px',
                background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                borderRadius: '10px',
                boxShadow: '0 2px 4px rgba(139, 92, 246, 0.2), 0 4px 12px rgba(139, 92, 246, 0.15), 0 8px 24px rgba(139, 92, 246, 0.1)'
              }}
            >
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 100%)'
                }}
              />
              <Zap size={18} color="white" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">AI Processing Pipeline</h3>
              <div className="text-xs text-gray-500">Real-time invoice automation</div>
            </div>
            
            {/* Agent Status Pills - Right after title */}
            <div className="flex items-center gap-2 ml-4">
              {/* Agent Status (original pill) */}
              <div 
                className="inline-flex items-center gap-2 text-xs font-medium text-gray-600 transition-all duration-200 hover:shadow-sm cursor-default"
                style={{
                  width: '160px',
                  padding: '4px 12px',
                  background: 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)',
                  borderRadius: '16px',
                  border: '1px solid rgba(0, 0, 0, 0.04)'
                }}
                title="Agent Zero System Status"
              >
                {(() => {
                  const systemStatus = agentSystemStatus;
                  const isProcessing = currentProcessing !== null;
                  
                  // Dynamic dot color based on status
                  const getDotColor = () => {
                    if (systemStatus.style === 'completed') return 'bg-green-400';
                    if (systemStatus.style === 'processing') return 'bg-purple-500';
                    if (systemStatus.style === 'ready') return 'bg-green-500';
                    return 'bg-purple-500';
                  };

                  const getDotShadow = () => {
                    if (systemStatus.style === 'completed') return '0 0 0 4px rgba(34, 197, 94, 0.4)';
                    if (systemStatus.style === 'processing') return '0 0 0 3px rgba(168, 85, 247, 0.3)';
                    if (isProcessing) return '0 0 0 3px rgba(168, 85, 247, 0.3)';
                    return '0 0 0 2px rgba(16, 185, 129, 0.1)';
                  };
                  
                  return (
                    <>
                      <div 
                        className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${getDotColor()} ${
                          systemStatus.animation === 'fade-in' ? 'animate-fade-in' :
                          systemStatus.animation === 'shiny' ? 'animate-pulse' : 
                          systemStatus.animation === 'pulse' ? 'animate-pulse' :
                          systemStatus.animation === 'none' ? '' : ''
                        }`}
                        style={{
                          boxShadow: getDotShadow(),
                          animationDuration: systemStatus.animation === 'fade-in' ? '0.8s' :
                                           isProcessing ? '1.5s' : '2s'
                        }}
                      />
                      {systemStatus.animation === 'shiny' ? (
                        <ShinyText className="font-medium" variant="purple">
                          {systemStatus.text}
                        </ShinyText>
                      ) : systemStatus.animation === 'shiny-green' ? (
                        <ShinyText className="font-medium" variant="green">
                          {systemStatus.text}
                        </ShinyText>
                      ) : (
                        <motion.span 
                          className={`transition-colors duration-300 font-medium ${
                            systemStatus.animation === 'fade-in' ? 'text-green-600' :
                            systemStatus.animation === 'pulse' ? 'animate-pulse' :
                            systemStatus.animation === 'none' ? '' : ''
                          }`}
                          initial={systemStatus.animation === 'fade-in' ? { opacity: 0 } : undefined}
                          animate={systemStatus.animation === 'fade-in' ? { opacity: 1 } : undefined}
                          transition={systemStatus.animation === 'fade-in' ? { duration: 0.8, ease: "easeOut" } : undefined}
                        >
                          {systemStatus.text}
                        </motion.span>
                      )}
                    </>
                  );
                })()}
              </div>
              
              {/* Subtle Separator - Only show if there are exceptions or approvals */}
              {!pipelineExpanded && (exceptionCount > 0 || approvalCount > 0) && (
                <div 
                  className="w-px h-4 bg-gray-200"
                  style={{ opacity: 0.6 }}
                />
              )}
              
              {/* Exception & Approval Indicators - Only when collapsed */}
              {!pipelineExpanded && (
                <>
                  {/* Exceptions Indicator */}
                  {exceptionCount > 0 && (
                          <div 
                            className="flex items-center gap-1.5 px-2 py-1 rounded-full cursor-pointer transition-all duration-200 hover:scale-105"
                            style={{
                              background: 'linear-gradient(135deg, #FEF7F7 0%, #FEE2E2 100%)',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              boxShadow: '0 1px 2px rgba(239, 68, 68, 0.08)'
                            }}
                          >
                            <div 
                              className="flex items-center justify-center"
                              style={{
                                width: '14px',
                                height: '14px',
                                background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                                borderRadius: '50%'
                              }}
                            >
                              <AlertCircle size={8} className="text-white" />
                            </div>
                            <span className="text-xs font-medium text-red-700">{exceptionCount} exceptions</span>
                          </div>
                        )}
                        
                        {/* Approvals Indicator */}
                        {approvalCount > 0 && (
                          <div 
                            className="flex items-center gap-1.5 px-2 py-1 rounded-full cursor-pointer transition-all duration-200 hover:scale-105"
                            style={{
                              background: urgentApprovals > 0 
                                ? 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)'
                                : 'linear-gradient(135deg, #FFFBF0 0%, #FEF3C7 100%)',
                              border: urgentApprovals > 0 
                                ? '1px solid rgba(245, 158, 11, 0.3)'
                                : '1px solid rgba(251, 191, 36, 0.2)',
                              boxShadow: '0 1px 2px rgba(245, 158, 11, 0.08)'
                            }}
                          >
                            <div 
                              className="flex items-center justify-center"
                              style={{
                                width: '14px',
                                height: '14px',
                                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                                borderRadius: '50%'
                              }}
                            >
                              <CheckCircle size={8} className="text-white" />
                            </div>
                            <span className="text-xs font-medium text-amber-700">{approvalCount} approvals</span>
                            {urgentApprovals > 0 && (
                              <div 
                                className="w-1 h-1 rounded-full animate-pulse"
                                style={{
                                  background: '#EF4444',
                                  boxShadow: '0 0 2px rgba(239, 68, 68, 0.6)'
                                }}
                              />
                            )}
                          </div>
                        )}
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {/* Metrics - Always visible on the right */}
            <div className="text-right">
              <div className="text-lg font-semibold text-gray-900">
                {currentProcessing !== null ? '1' : pendingInvoices.length}
              </div>
              <div className="text-xs text-gray-400">
                {currentProcessing !== null ? 'Processing' : pendingInvoices.length === 0 ? 'Queue empty' : 'In queue'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-gray-900">{automationRate}%</div>
              <div className="text-xs text-gray-400">Automated</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-gray-900">
                ${todayValue > 0 ? (todayValue / 1000).toFixed(0) : (totalValue / 1000).toFixed(0)}K
              </div>
              <div className="text-xs text-gray-400">
                {todayValue > 0 ? 'Processed today' : 'Pipeline value'}
              </div>
            </div>
            
            <div
              className="ml-4 p-2 rounded-lg transition-all duration-200 text-gray-500"
              style={{
                transform: pipelineExpanded ? 'rotate(0deg)' : 'rotate(-180deg)',
                transition: 'transform 0.3s ease'
              }}
            >
              <ChevronDown size={16} />
            </div>
          </div>
        </div>
        
        {/* Pipeline Flow */}
        <div 
          className="flex items-stretch gap-2 py-1 transition-all duration-500 ease-in-out"
          style={{
            opacity: pipelineExpanded ? 1 : 0,
            transform: pipelineExpanded ? 'translateY(0)' : 'translateY(-20px)',
            marginTop: pipelineExpanded ? '12px' : '0',
            pointerEvents: pipelineExpanded ? 'auto' : 'none'
          }}
        >
          {/* Queue Stage */}
          <div 
            className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 relative flex-1"
            style={{
              background: 'linear-gradient(180deg, #FFFFFF 0%, #F9FAFB 100%)',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              borderRadius: '8px',
              padding: '8px 12px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04), 0 2px 4px rgba(0, 0, 0, 0.02)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.04), 0 8px 16px rgba(0, 0, 0, 0.04), 0 16px 32px rgba(0, 0, 0, 0.02)';
              e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.04), 0 2px 4px rgba(0, 0, 0, 0.02)';
              e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.06)';
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Queue</div>
              <div 
                className="inline-flex items-center gap-1 text-xs font-semibold text-white"
                style={{
                  padding: '1px 6px',
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                  borderRadius: '8px',
                  boxShadow: '0 1px 2px rgba(139, 92, 246, 0.2)'
                }}
              >
                AI
              </div>
            </div>
            <div className="text-lg font-bold text-gray-900">{invoices.filter(i => i.status === 'pending').length}</div>
            <div className="text-xs text-gray-600 font-medium">
              {(() => {
                const pendingCount = invoices.filter(i => i.status === 'pending').length;
                if (pendingCount === 0) return 'Queue empty';
                if (currentProcessing) return 'Processing queue';
                return `${pendingCount} awaiting`;
              })()}
            </div>
            <div className="absolute bottom-1 right-1 text-xs font-medium text-purple-600 opacity-0 hover:opacity-100 transition-opacity flex items-center gap-0.5">
              View <ChevronRight size={8} />
            </div>
          </div>
          
          {/* Flow Line */}
          <div 
            className="relative overflow-hidden flex items-center"
            style={{
              flex: '0 0 24px'
            }}
          >
            <div
              className="w-full"
              style={{
                height: '2px',
                background: 'linear-gradient(90deg, #E5E7EB 0%, #D1D5DB 100%)',
                borderRadius: '1px',
                position: 'relative'
              }}
            >
              <div 
                className="absolute top-0 w-full h-full"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, #8B5CF6 50%, transparent 100%)',
                  animation: 'flowAnimation 3s linear infinite',
                  left: '-100%'
                }}
              />
            </div>
          </div>
          
          {/* Processing Stage */}
          <div 
            className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 relative flex-1"
            style={{
              background: 'linear-gradient(180deg, #F5F3FF 0%, #EDE9FE 100%)',
              border: '1px solid rgba(139, 92, 246, 0.1)',
              borderRadius: '8px',
              padding: '8px 12px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04), 0 2px 4px rgba(0, 0, 0, 0.02)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(139, 92, 246, 0.08), 0 8px 16px rgba(139, 92, 246, 0.06), 0 16px 32px rgba(139, 92, 246, 0.04)';
              e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.04), 0 2px 4px rgba(0, 0, 0, 0.02)';
              e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.1)';
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Processing</div>
              <div 
                className="inline-flex items-center gap-1 text-xs font-semibold text-white"
                style={{
                  padding: '1px 6px',
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                  borderRadius: '8px',
                  boxShadow: '0 1px 2px rgba(139, 92, 246, 0.2)'
                }}
              >
                AI
              </div>
            </div>
            <div className="text-lg font-bold text-gray-900">
              {currentProcessing ? 1 : pendingInvoices.length}
            </div>
            <div className="text-xs text-gray-600 font-medium">
              {(() => {
                const processedInvoices = invoices.filter(inv => inv.processingTimeMs && inv.processingTimeMs > 0);
                if (processedInvoices.length === 0) return currentProcessing ? 'Processing...' : 'Ready';
                
                const avgTime = processedInvoices.reduce((sum, inv) => sum + inv.processingTimeMs, 0) / processedInvoices.length;
                const avgSeconds = Math.round(avgTime / 1000);
                return `~${avgSeconds}s avg`;
              })()}
            </div>
            <div className="absolute bottom-1 right-1 text-xs font-medium text-purple-600 opacity-0 hover:opacity-100 transition-opacity flex items-center gap-0.5">
              Monitor <ChevronRight size={8} />
            </div>
          </div>
          
          {/* Flow Line */}
          <div 
            className="relative overflow-hidden flex items-center"
            style={{
              flex: '0 0 20px'
            }}
          >
            <div
              className="w-full"
              style={{
                height: '2px',
                background: 'linear-gradient(90deg, #E5E7EB 0%, #D1D5DB 100%)',
                borderRadius: '1px',
                position: 'relative'
              }}
            >
              <div 
                className="absolute top-0 w-full h-full"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, #8B5CF6 50%, transparent 100%)',
                  animation: 'flowAnimation 3s linear infinite',
                  left: '-100%'
                }}
              />
            </div>
          </div>

          {/* Exceptions */}
          <div 
            className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 relative flex-1"
            style={{
              background: 'linear-gradient(180deg, #FEF7F7 0%, #FFF5F5 100%)',
              border: '1px solid rgba(239, 68, 68, 0.1)',
              borderRadius: '8px',
              padding: '8px 12px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04), 0 2px 4px rgba(0, 0, 0, 0.02)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(239, 68, 68, 0.06), 0 8px 16px rgba(239, 68, 68, 0.04), 0 16px 32px rgba(239, 68, 68, 0.02)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.04), 0 2px 4px rgba(0, 0, 0, 0.02)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.1)';
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Exceptions</div>
              <div 
                className="inline-flex items-center gap-1 text-xs font-semibold text-white"
                style={{
                  padding: '1px 6px',
                  background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                  borderRadius: '8px',
                  boxShadow: '0 1px 2px rgba(239, 68, 68, 0.2)'
                }}
              >
                AI
              </div>
            </div>
            <div className="text-lg font-bold text-red-600">{exceptionsByType.total}</div>
            <div className="text-xs text-gray-500 font-normal mb-1">Currently with:</div>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="text-red-600">AI: {exceptionsByType.ai}</span>
              <span className="text-red-600">User: {exceptionsByType.human}</span>
            </div>
            <div className="absolute bottom-1 right-1 text-xs font-medium text-purple-600 opacity-0 hover:opacity-100 transition-opacity flex items-center gap-0.5">
              Review <ChevronRight size={8} />
            </div>
          </div>

          {/* Flow Line */}
          <div 
            className="relative overflow-hidden flex items-center"
            style={{
              flex: '0 0 20px'
            }}
          >
            <div
              className="w-full"
              style={{
                height: '2px',
                background: 'linear-gradient(90deg, #E5E7EB 0%, #D1D5DB 100%)',
                borderRadius: '1px',
                position: 'relative'
              }}
            >
              <div 
                className="absolute top-0 w-full h-full"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, #8B5CF6 50%, transparent 100%)',
                  animation: 'flowAnimation 3s linear infinite',
                  left: '-100%'
                }}
              />
            </div>
          </div>
          
          {/* Approval */}
          <div 
            className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 relative flex-1"
            style={{
              background: 'linear-gradient(180deg, #FFFBF0 0%, #FFFDF7 100%)',
              border: '1px solid rgba(251, 191, 36, 0.2)',
              borderRadius: '8px',
              padding: '8px 12px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04), 0 2px 4px rgba(0, 0, 0, 0.02)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(251, 191, 36, 0.06), 0 8px 16px rgba(251, 191, 36, 0.04), 0 16px 32px rgba(251, 191, 36, 0.02)';
              e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.04), 0 2px 4px rgba(0, 0, 0, 0.02)';
              e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.2)';
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Approval</div>
            </div>
            <div className="text-lg font-bold text-amber-600">{invoices.filter(i => i.status === 'pending_approval').length}</div>
            <div className="text-xs text-amber-600 font-medium">
              {(() => {
                const pendingApproval = invoices.filter(i => i.status === 'pending_approval');
                if (pendingApproval.length === 0) return 'None pending';
                
                const urgentCount = pendingApproval.filter(inv => {
                  const dueDate = new Date(inv.dueDate);
                  const today = new Date();
                  const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  return daysUntilDue <= 3;
                }).length;
                
                return urgentCount > 0 ? `${urgentCount} urgent` : 'Standard priority';
              })()}
            </div>
            <div className="absolute bottom-1 right-1 text-xs font-medium text-purple-600 opacity-0 hover:opacity-100 transition-opacity flex items-center gap-0.5">
              Approve <ChevronRight size={8} />
            </div>
          </div>

          {/* Flow Line */}
          <div 
            className="relative overflow-hidden flex items-center"
            style={{
              flex: '0 0 20px'
            }}
          >
            <div
              className="w-full"
              style={{
                height: '2px',
                background: 'linear-gradient(90deg, #E5E7EB 0%, #D1D5DB 100%)',
                borderRadius: '1px',
                position: 'relative'
              }}
            >
              <div 
                className="absolute top-0 w-full h-full"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, #8B5CF6 50%, transparent 100%)',
                  animation: 'flowAnimation 3s linear infinite',
                  left: '-100%'
                }}
              />
            </div>
          </div>
          
          {/* Payment Ready */}
          <div 
            className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 relative flex-1"
            style={{
              background: 'linear-gradient(180deg, #F0FDF4 0%, #DCFCE7 100%)',
              border: '1px solid rgba(34, 197, 94, 0.1)',
              borderRadius: '8px',
              padding: '8px 12px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04), 0 2px 4px rgba(0, 0, 0, 0.02)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(34, 197, 94, 0.06), 0 8px 16px rgba(34, 197, 94, 0.04), 0 16px 32px rgba(34, 197, 94, 0.02)';
              e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.04), 0 2px 4px rgba(0, 0, 0, 0.02)';
              e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.1)';
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Payment Ready</div>
            </div>
            <div className="text-lg font-bold text-green-600">{invoices.filter(i => i.status === 'approved' || i.status === 'processed').length}</div>
            <div className="text-xs text-gray-600 font-medium">${(invoices.filter(i => i.status === 'approved' || i.status === 'processed').reduce((sum, inv) => sum + inv.amount, 0) / 1000).toFixed(0)}K total</div>
            <div className="absolute bottom-1 right-1 text-xs font-medium text-purple-600 opacity-0 hover:opacity-100 transition-opacity flex items-center gap-0.5">
              Schedule <ChevronRight size={8} />
            </div>
          </div>
        </div>
        
        {/* Flow Animation Keyframes */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes flowAnimation {
              0% { left: -100%; }
              100% { left: 100%; }
            }
            @keyframes alertBounce {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.1); }
            }
          `
        }} />
      </div>

      {/* Invoice Table Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Date</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">PO Number</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Days to Due</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Comments</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">AI Analysis</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoices.map((invoice, index) => {
                const aiAnalysis = getAIAnalysis(invoice);
                const daysUntilDue = getDaysUntilDue(invoice.dueDate);
                return (
                  <tr 
                    key={invoice.id} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => {
                      if (index === 1) setShowPatternCard(true);
                      onSelectInvoice(invoice);
                    }}
                  >
                    <td className="py-3 px-4">
                      <div className="text-xs font-medium text-gray-900">{invoice.invoiceNumber}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                          <svg className="w-2.5 h-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-gray-900 truncate">{invoice.vendor.name}</div>
                          <div className="text-xs text-gray-500 truncate">{invoice.vendor.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs font-semibold text-gray-900 text-right">{formatCurrency(invoice.amount)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs text-gray-600">{formatDate(invoice.invoiceDate)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs text-gray-600">{formatDate(invoice.dueDate)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs text-gray-600 truncate">
                        {invoice.purchaseOrder?.poNumber || 'N/A'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {getProcessStatusBadge(invoice)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs truncate">
                        {invoice.status === 'pending_internal_review' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                            AI Agent
                          </span>
                        ) : (
                          <span className="text-gray-600">
                            {invoice.assignedTo || 'Unassigned'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className={`text-xs ${daysUntilDue.className}`}>
                        {daysUntilDue.status === 'overdue' ? `${daysUntilDue.days}d overdue` :
                         daysUntilDue.status === 'urgent' ? `${daysUntilDue.days}d` :
                         `${daysUntilDue.days}d`}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs text-gray-600 max-w-24 truncate">
                        {invoice.notes || ''}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1">
                          <div className="w-12 bg-gray-200 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${aiAnalysis.bar}`} style={{ width: `${aiAnalysis.confidence}%` }}></div>
                          </div>
                          <span className="text-xs font-medium text-gray-700">{aiAnalysis.confidence}%</span>
                        </div>
                        <div className="flex items-center space-x-1 text-xs">
                          {aiAnalysis.scenario && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-blue-100 text-blue-800">
                              {aiAnalysis.scenario}
                            </span>
                          )}
                          {aiAnalysis.processingTime && (
                            <span className="text-green-600">⚡ {aiAnalysis.processingTime}</span>
                          )}
                        </div>
                        {aiAnalysis.variance && (
                          <span className="text-xs text-amber-600">{aiAnalysis.variance}</span>
                        )}
                        {aiAnalysis.reasoning && (
                          <div className="text-xs text-gray-500 truncate max-w-32" title={aiAnalysis.reasoning}>
                            💭 {aiAnalysis.reasoning}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty state */}
      {invoices.length === 0 && !loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
          <p className="text-gray-500">Make sure your backend server is running on port 3001.</p>
        </div>
      )}

      {/* Pattern Detection Card */}
      {showPatternCard && (
        <div className="fixed bottom-4 right-4 w-96 bg-white rounded-xl shadow-lg border border-gray-200 p-6 animate-fadeIn">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">Pattern Detected</h4>
              <p className="mt-1 text-sm text-gray-600">
                Similar invoices with variances are typically approved. Should I auto-approve similar patterns?
              </p>
              <div className="mt-4 flex space-x-3">
                <button 
                  onClick={() => setShowPatternCard(false)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Yes, learn this
                </button>
                <button 
                  onClick={() => setShowPatternCard(false)}
                  className="px-4 py-2 text-gray-700 text-sm hover:text-gray-900 transition-colors"
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Demo Controls Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="relative">
          {/* Dropdown Menu */}
          {demoDropdownOpen && (
            <div 
              className="absolute bottom-full right-0 mb-4 w-64 bg-slate-800 rounded-lg shadow-2xl border border-slate-700 overflow-hidden animate-in slide-in-from-bottom-2"
              style={{
                background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
              }}
            >
              <div className="p-3 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-yellow-400" />
                  <span className="text-sm font-semibold text-white">Demo Controls</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Agent Zero demonstration tools</p>
              </div>
              
              <div className="p-2 space-y-1">
                <button
                  className="w-full px-3 py-2 text-left text-sm text-white hover:bg-slate-700/50 rounded-lg transition-colors flex items-center gap-3"
                  onClick={async () => {
                    setDemoDropdownOpen(false);
                    try {
                      const response = await fetch('http://localhost:3001/api/demo/create-realistic-scenarios', { method: 'POST' });
                      const result = await response.json();
                      console.log('Demo scenarios created:', result);
                    } catch (error) {
                      console.error('Failed to create demo scenarios:', error);
                    }
                  }}
                >
                  <span className="text-lg">🎬</span>
                  <div>
                    <div className="font-medium">Create Demo Scenarios</div>
                    <div className="text-xs text-slate-400">Generate realistic test invoices</div>
                  </div>
                </button>

                <button
                  className="w-full px-3 py-2 text-left text-sm text-white hover:bg-slate-700/50 rounded-lg transition-colors flex items-center gap-3"
                  onClick={async () => {
                    setDemoDropdownOpen(false);
                    try {
                      const response = await fetch('http://localhost:3001/api/demo/trigger-learning', { method: 'POST' });
                      const result = await response.json();
                      console.log('Learning demo started:', result);
                    } catch (error) {
                      console.error('Failed to trigger learning demo:', error);
                    }
                  }}
                >
                  <span className="text-lg">🧠</span>
                  <div>
                    <div className="font-medium">Learning Demo</div>
                    <div className="text-xs text-slate-400">Show adaptive learning in action</div>
                  </div>
                </button>

                <button
                  className="w-full px-3 py-2 text-left text-sm text-white hover:bg-slate-700/50 rounded-lg transition-colors flex items-center gap-3"
                  onClick={() => {
                    setDemoDropdownOpen(false);
                    console.log('🧪 MANUAL TEST: Triggering agent simulation');
                    simulateAgentActivity('test-123', 'simple');
                  }}
                >
                  <span className="text-lg">🧪</span>
                  <div>
                    <div className="font-medium">Test Agent Animation</div>
                    <div className="text-xs text-slate-400">Direct agent simulation test</div>
                  </div>
                </button>

                <button
                  className="w-full px-3 py-2 text-left text-sm text-white hover:bg-slate-700/50 rounded-lg transition-colors flex items-center gap-3"
                  onClick={async () => {
                    setDemoDropdownOpen(false);
                    try {
                      const response = await fetch('http://localhost:3001/api/demo/create-batch/5', { 
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ scenarios: ['simple', 'complex', 'exceptional'] })
                      });
                      const result = await response.json();
                      console.log('Batch created:', result);
                    } catch (error) {
                      console.error('Failed to create batch:', error);
                    }
                  }}
                >
                  <span className="text-lg">⚡</span>
                  <div>
                    <div className="font-medium">Quick Batch</div>
                    <div className="text-xs text-slate-400">Process 5 invoices quickly</div>
                  </div>
                </button>

                <button
                  className="w-full px-3 py-2 text-left text-sm text-white hover:bg-slate-700/50 rounded-lg transition-colors flex items-center gap-3"
                  onClick={() => {
                    setDemoDropdownOpen(false);
                    setAnalyticsModalOpen(true);
                  }}
                >
                  <span className="text-lg">📊</span>
                  <div>
                    <div className="font-medium">Demo Analytics</div>
                    <div className="text-xs text-slate-400">View processing insights</div>
                  </div>
                </button>

                <div className="border-t border-slate-700 my-1"></div>

                <button
                  className="w-full px-3 py-2 text-left text-sm text-white hover:bg-slate-700/50 rounded-lg transition-colors flex items-center gap-3"
                  onClick={async () => {
                    setDemoDropdownOpen(false);
                    try {
                      const response = await fetch('http://localhost:3001/api/demo/restart-agent-zero', { method: 'POST' });
                      const result = await response.json();
                      console.log('Agent Zero restarted:', result);
                    } catch (error) {
                      console.error('Failed to restart Agent Zero:', error);
                    }
                  }}
                >
                  <span className="text-lg">🔄</span>
                  <div>
                    <div className="font-medium">Restart Agent Zero</div>
                    <div className="text-xs text-slate-400">Reset the AI system</div>
                  </div>
                </button>

                <button
                  className="w-full px-3 py-2 text-left text-sm text-white hover:bg-slate-700/50 rounded-lg transition-colors flex items-center gap-3"
                  onClick={async () => {
                    setDemoDropdownOpen(false);
                    if (confirm('Reset all demo data? This will clear all invoices.')) {
                      try {
                        const response = await fetch('http://localhost:3001/api/demo/reset-data', { method: 'DELETE' });
                        const result = await response.json();
                        console.log('Data reset:', result);
                        window.location.reload();
                      } catch (error) {
                        console.error('Failed to reset data:', error);
                      }
                    }
                  }}
                >
                  <span className="text-lg">🧹</span>
                  <div>
                    <div className="font-medium">Reset Data</div>
                    <div className="text-xs text-slate-400">Clear all demo invoices</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Floating Action Button */}
          <button
            onClick={() => setDemoDropdownOpen(!demoDropdownOpen)}
            className="flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-300 hover:scale-110 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
              boxShadow: '0 10px 20px rgba(99, 102, 241, 0.3), 0 6px 6px rgba(99, 102, 241, 0.2)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 15px 30px rgba(99, 102, 241, 0.4), 0 10px 15px rgba(99, 102, 241, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 10px 20px rgba(99, 102, 241, 0.3), 0 6px 6px rgba(99, 102, 241, 0.2)';
            }}
          >
            <div 
              className="transition-transform duration-300"
              style={{ transform: demoDropdownOpen ? 'rotate(45deg)' : 'rotate(0deg)' }}
            >
              <Sparkles size={24} className="text-white" />
            </div>
          </button>
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {demoDropdownOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setDemoDropdownOpen(false)}
        />
      )}

      {/* Analytics Modal Overlay */}
      {analyticsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
          <div className="absolute inset-4 bg-white rounded-xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                  <BarChart3 size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Demo Analytics</h2>
                  <p className="text-sm text-gray-600">Agent Zero performance insights</p>
                </div>
              </div>
              <button
                onClick={() => setAnalyticsModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
              >
                <X size={16} className="text-gray-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="h-[calc(100%-5rem)] overflow-auto">
              <DemoAnalyticsDashboard />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}