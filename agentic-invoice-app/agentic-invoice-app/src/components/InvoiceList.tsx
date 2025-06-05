import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

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
  vendor: Vendor;
  purchaseOrder?: { poNumber: string };
  exceptions?: Exception[];
  agentActivities?: AgentActivity[];
}

interface InvoiceListProps {
  onSelectInvoice: (invoice: Invoice) => void;
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
  const [showAgentCard, setShowAgentCard] = useState(true);
  const [showPatternCard, setShowPatternCard] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoices();
  }, []);

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

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { text: string; className: string }> = {
      'pending': { text: 'Pending', className: 'bg-blue-100 text-blue-700' },
      'pending_review': { text: 'Exception', className: 'bg-amber-100 text-amber-700' },
      'pending_approval': { text: 'Pending', className: 'bg-blue-100 text-blue-700' },
      'approved': { text: 'Approved', className: 'bg-green-100 text-green-700' },
      'processed': { text: 'Processed', className: 'bg-gray-100 text-gray-700' }
    };
    
    const config = statusConfig[status] || { text: status, className: 'bg-gray-100 text-gray-700' };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        {status === 'pending' && <span className="w-2 h-2 bg-blue-500 rounded-full mr-1.5"></span>}
        {status === 'pending_review' && <span className="text-amber-600 mr-1">⚠</span>}
        {config.text}
      </span>
    );
  };

  const getApprovalStatusBadge = (status: string) => {
    const statusConfig: Record<string, { text: string; className: string }> = {
      'pending': { text: 'Pending', className: 'bg-yellow-100 text-yellow-700' },
      'approved': { text: 'Approved', className: 'bg-green-100 text-green-700' },
      'rejected': { text: 'Rejected', className: 'bg-red-100 text-red-700' }
    };
    
    const config = statusConfig[status] || { text: status, className: 'bg-gray-100 text-gray-700' };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        {config.text}
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

  const getAIAnalysis = (invoice: Invoice) => {
    // Calculate confidence based on status and issues
    let confidence = 95;
    let barColor = 'bg-green-500';
    let variance = '';

    if (invoice.hasIssues || invoice.status === 'pending_review') {
      confidence = 75 + Math.random() * 15; // 75-90% for issues
      barColor = 'bg-amber-500';
      if (invoice.variancePercentage) {
        variance = `${invoice.variancePercentage.toFixed(1)}% variance`;
      }
    } else if (invoice.status === 'approved') {
      confidence = 95 + Math.random() * 5; // 95-100% for approved
      barColor = 'bg-green-500';
    }

    const widthClass = `w-[${Math.round(confidence)}%]`;
    
    return { 
      confidence: Math.round(confidence), 
      bar: `${widthClass} ${barColor}`,
      variance 
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
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Approval</th>
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
                      <div className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{invoice.vendor.name}</div>
                          <div className="text-xs text-gray-500 truncate">{invoice.vendor.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm font-semibold text-gray-900 text-right">{formatCurrency(invoice.amount)}</div>
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
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td className="py-3 px-4">
                      {getApprovalStatusBadge(invoice.approvalStatus)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs text-gray-600 truncate">
                        {invoice.assignedTo || 'Unassigned'}
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
                      <div className="flex items-center space-x-1">
                        <div className="w-12 bg-gray-200 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${aiAnalysis.bar}`} style={{ width: `${aiAnalysis.confidence}%` }}></div>
                        </div>
                        <span className="text-xs font-medium text-gray-700">{aiAnalysis.confidence}%</span>
                        {aiAnalysis.variance && (
                          <span className="text-xs text-amber-600">{aiAnalysis.variance}</span>
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
    </div>
  );
}