import { useState, useEffect } from 'react';

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

export default function InvoiceDetail({ invoice, onBack }: InvoiceDetailProps) {
  const [fullInvoice, setFullInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    const loadFullInvoice = async () => {
      try {
        const response = await fetch(`http://localhost:3001/api/invoices/${invoice.id}`);
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
  }, [invoice.id]);

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

  const currentInvoice = fullInvoice || invoice;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
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
            <h1 className="text-3xl font-bold text-gray-900">Invoice {currentInvoice.invoiceNumber}</h1>
            <p className="mt-2 text-lg text-gray-600">{currentInvoice.vendor.name}</p>
          </div>
          <div className="flex space-x-3">
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              Reject
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Approve
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Summary */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Invoice Date</p>
                <p className="text-base font-medium">{formatDate(currentInvoice.invoiceDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Due Date</p>
                <p className="text-base font-medium">{formatDate(currentInvoice.dueDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Amount</p>
                <p className="text-2xl font-semibold text-gray-900">{formatCurrency(currentInvoice.amount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    currentInvoice.status === 'approved' ? 'bg-green-100 text-green-700' :
                    currentInvoice.status === 'pending_review' ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {currentInvoice.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items */}
          {currentInvoice.lineItems && currentInvoice.lineItems.length > 0 && (
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
                    {currentInvoice.lineItems.map((item) => (
                      <tr key={item.id}>
                        <td className="py-3 text-sm text-gray-900">{item.description}</td>
                        <td className="py-3 text-sm text-gray-900 text-right">{item.quantity}</td>
                        <td className="py-3 text-sm text-gray-900 text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="py-3 text-sm font-medium text-gray-900 text-right">{formatCurrency(item.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200">
                      <td colSpan={3} className="py-3 text-sm font-medium text-gray-900">Total</td>
                      <td className="py-3 text-lg font-semibold text-gray-900 text-right">{formatCurrency(currentInvoice.amount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Vendor Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Vendor Information</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="text-base font-medium">{currentInvoice.vendor.name}</p>
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

          {/* AI Analysis */}
          {currentInvoice.agentActivities && currentInvoice.agentActivities.length > 0 && (
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
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
                      <div className="flex-1 bg-blue-100 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
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

          {/* AI Communication - for missing PO scenarios */}
          {currentInvoice.status === 'pending_internal_review' && currentInvoice.scenario === 'missing_po' && (
            <div className="bg-purple-50 rounded-xl border border-purple-200 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">AI Communication</h2>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Awaiting Response
                </span>
              </div>
              
              <div className="space-y-4">
                {/* AI Analysis */}
                <div className="bg-white rounded-lg p-4 border border-purple-100">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">AI Detection</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {currentInvoice.agentReasoning || 'Missing PO reference detected during validation'}
                      </p>
                      <div className="mt-2 flex items-center space-x-2">
                        <div className="flex-1 bg-purple-100 rounded-full h-1.5">
                          <div 
                            className="bg-purple-500 h-1.5 rounded-full" 
                            style={{ width: `${Math.round((currentInvoice.agentConfidence || 0.85) * 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium text-gray-600">
                          {Math.round((currentInvoice.agentConfidence || 0.85) * 100)}% confidence
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Query to Procurement */}
                <div className="bg-white rounded-lg p-4 border border-purple-100">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">AI → Procurement Team</p>
                        <span className="text-xs text-gray-500">
                          {formatDate(currentInvoice.agentProcessingStarted || currentInvoice.receivedDate)}
                        </span>
                      </div>
                      <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200">
                        <p className="text-sm text-gray-800 font-medium">Subject: PO Reference Validation Required</p>
                        <p className="text-sm text-gray-700 mt-2">
                          Hi Procurement Team,<br/><br/>
                          I'm processing invoice <strong>{currentInvoice.invoiceNumber}</strong> from <strong>{currentInvoice.vendor.name}</strong> 
                          for <strong>{formatCurrency(currentInvoice.amount)}</strong>.<br/><br/>
                          The invoice references PO "PO-2024-7839" which I cannot find in our system. Could you please:
                        </p>
                        <ul className="text-sm text-gray-700 mt-2 ml-4 list-disc">
                          <li>Verify if this PO number is correct</li>
                          <li>Provide the correct PO if there was a typo</li>
                          <li>Confirm if this purchase was authorized without a PO</li>
                        </ul>
                        <p className="text-sm text-gray-700 mt-2">
                          I'll hold the invoice for review until clarification is received.<br/><br/>
                          Best regards,<br/>
                          <strong>AI Invoice Processing System</strong>
                        </p>
                      </div>
                      <div className="mt-2 flex items-center space-x-2 text-xs text-gray-500">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span>Sent to: procurement.team@company.com</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Update */}
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Current Status</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        Awaiting response from procurement team. Invoice processing will resume once PO clarification is received.
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Expected response by: {formatDate(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString())}
                      </p>
                    </div>
                  </div>
                </div>
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
    </div>
  );
}