import { useState, useEffect } from 'react';
import { invoiceService } from './services/api';
import type { Invoice } from './types';

export default function SimpleApp() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [agentStatus, setAgentStatus] = useState('Monitoring invoice queue...');

  useEffect(() => {
    loadInvoices();
    
    // Simulate agent activity
    const interval = setInterval(() => {
      const activities = [
        'Processing invoice queue...',
        'Analyzing vendor patterns...',
        'Matching line items...',
        'Detecting exceptions...',
        'Updating confidence scores...'
      ];
      setAgentStatus(activities[Math.floor(Math.random() * activities.length)]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const loadInvoices = async () => {
    try {
      const data = await invoiceService.getAll();
      setInvoices(data);
    } catch (error) {
      console.error('Failed to load invoices:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#059669';
      case 'pending_review': return '#d97706';
      case 'pending_approval': return '#2563eb';
      default: return '#6b7280';
    }
  };

  if (selectedInvoice) {
    return (
      <div className="min-h-screen">
        {/* Agent Status Bar */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b shadow-sm agent-status-bar">
          <div className="container flex items-center justify-between" style={{ height: '56px' }}>
            <div className="flex items-center space-x-2">
              <div className="text-blue-600 animate-pulse">🤖</div>
              <span className="font-medium text-sm">AI Agent</span>
              <span className="badge badge-secondary">processing</span>
            </div>
            <div className="text-sm text-gray-600">{agentStatus}</div>
          </div>
        </div>

        {/* Invoice Detail */}
        <div className="pt-14 p-6">
          <div className="container">
            <div className="mb-6">
              <button 
                className="btn btn-secondary"
                onClick={() => setSelectedInvoice(null)}
              >
                ← Back to List
              </button>
            </div>
            
            <div className="card p-6">
              <h1 className="text-2xl font-bold mb-4">{selectedInvoice.invoiceNumber}</h1>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                <div>
                  <h3 className="font-medium mb-2">Vendor Details</h3>
                  <div className="card p-4">
                    <p className="font-medium">{selectedInvoice.vendor.name}</p>
                    <p className="text-sm text-gray-600">{selectedInvoice.vendor.category}</p>
                    <div className="mt-2">
                      <span className="badge badge-secondary">Trust: {selectedInvoice.vendor.trustLevel}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Invoice Summary</h3>
                  <div className="card p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Amount:</span>
                        <span className="font-medium">{formatCurrency(selectedInvoice.amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Status:</span>
                        <span 
                          className="badge" 
                          style={{ backgroundColor: getStatusColor(selectedInvoice.status) + '20', color: getStatusColor(selectedInvoice.status) }}
                        >
                          {selectedInvoice.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      {selectedInvoice.variancePercentage && selectedInvoice.variancePercentage > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Variance:</span>
                          <span className="text-yellow-600 font-medium">
                            {selectedInvoice.variancePercentage.toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Agent Analysis</h3>
                  <div className="card p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <span>✨</span>
                      <span className="text-sm">AI processing complete</span>
                    </div>
                    {selectedInvoice.hasIssues ? (
                      <div className="badge badge-warning">⚠️ Issues detected</div>
                    ) : (
                      <div className="badge badge-success">✅ Ready for approval</div>
                    )}
                  </div>
                </div>
              </div>
              
              {selectedInvoice.hasIssues && (
                <div className="mt-6 p-4 bg-yellow-50" style={{ borderRadius: '8px', border: '1px solid #fbbf24' }}>
                  <h4 className="font-medium text-yellow-800">⚠️ Exception Detected</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Invoice variance exceeds normal parameters for this vendor. Requires manual review.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Agent Status Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b shadow-sm agent-status-bar">
        <div className="container flex items-center justify-between" style={{ height: '56px' }}>
          <div className="flex items-center space-x-2">
            <div className="text-blue-600 animate-pulse">🤖</div>
            <span className="font-medium text-sm">AI Agent</span>
            <span className="badge badge-success">active</span>
          </div>
          <div className="text-sm text-gray-600">{agentStatus}</div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Queue: {invoices.length}</span>
            <div className="text-blue-600">🔔</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-14 p-6">
        <div className="container">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Xelix Agentic Invoice Processing</h1>
            <p className="text-gray-600 mt-2">
              AI-powered accounts payable with intelligent line-item matching
            </p>
          </div>

          {/* Agent Suggestions */}
          <div className="suggestion-banner mb-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span>✨</span>
                  <h3 className="font-medium">Agent Recommendations</h3>
                  <span className="confidence-badge badge">95% confident</span>
                </div>
                <p className="text-sm text-gray-600">
                  {invoices.filter(inv => !inv.hasIssues && inv.status === 'pending_approval').length} invoices match auto-approval criteria
                </p>
              </div>
              <button className="btn btn-primary">
                Approve All
              </button>
            </div>
          </div>

          {/* Invoice List */}
          <div className="card">
            <div className="p-6 border-b">
              <h2 className="font-medium">Invoices ({invoices.length})</h2>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Vendor</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Due Date</th>
                    <th>AI Insights</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.slice(0, 15).map((invoice) => (
                    <tr 
                      key={invoice.id} 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedInvoice(invoice)}
                    >
                      <td>
                        <div className="flex items-center space-x-2">
                          <span>📄</span>
                          <span className="font-medium">{invoice.invoiceNumber}</span>
                        </div>
                      </td>
                      <td>
                        <div>
                          <div className="font-medium">{invoice.vendor.name}</div>
                          <div className="text-sm text-gray-600">{invoice.vendor.category}</div>
                        </div>
                      </td>
                      <td>
                        <div>
                          <div className="font-medium">{formatCurrency(invoice.amount)}</div>
                          {invoice.variancePercentage && invoice.variancePercentage > 0 && (
                            <div className="text-sm text-yellow-600">
                              {invoice.variancePercentage.toFixed(1)}% variance
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <span 
                          className="badge" 
                          style={{ backgroundColor: getStatusColor(invoice.status) + '20', color: getStatusColor(invoice.status) }}
                        >
                          {invoice.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="text-sm">
                        {new Date(invoice.dueDate).toLocaleDateString()}
                      </td>
                      <td>
                        <div className="flex items-center space-x-2">
                          {invoice.hasIssues ? (
                            <span className="badge badge-warning">⚠️ Issues</span>
                          ) : (
                            <span className="badge badge-success">✅ Good</span>
                          )}
                          <span className="confidence-badge badge text-xs">
                            {Math.round(Math.random() * 20 + 80)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}