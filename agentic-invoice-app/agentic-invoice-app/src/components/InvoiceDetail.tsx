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