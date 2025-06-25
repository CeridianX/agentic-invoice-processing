import { useState } from 'react';
import InvoiceList from './components/InvoiceList';
import InvoiceDetail from './components/InvoiceDetail';
import AgentStatusBar from './components/AgentStatusBar';
import DemoAnalyticsDashboard from './components/DemoAnalyticsDashboard';
import { BarChart3, List, ArrowLeft } from 'lucide-react';

// Define minimal types needed for App
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
  exceptions?: Exception[];
  agentActivities?: AgentActivity[];
}

type ViewMode = 'invoices' | 'analytics';

function App() {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('invoices');

  return (
    <div className="min-h-screen bg-gray-50">
      <AgentStatusBar />
      
      {/* Navigation Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              {selectedInvoice ? (
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft size={16} />
                  <span>Back to {viewMode === 'invoices' ? 'Invoices' : 'Analytics'}</span>
                </button>
              ) : (
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('invoices')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'invoices'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <List size={16} />
                    Invoice Processing
                  </button>
                  <button
                    onClick={() => setViewMode('analytics')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'analytics'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <BarChart3 size={16} />
                    Demo Analytics
                  </button>
                </div>
              )}
            </div>
            
            {!selectedInvoice && (
              <div className="text-sm text-gray-500">
                {viewMode === 'invoices' ? 'AI-powered invoice processing' : 'Agent Zero performance insights'}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="pb-8">
        {selectedInvoice ? (
          <InvoiceDetail 
            invoice={selectedInvoice} 
            onBack={() => setSelectedInvoice(null)} 
          />
        ) : viewMode === 'invoices' ? (
          <InvoiceList onSelectInvoice={setSelectedInvoice} />
        ) : (
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <DemoAnalyticsDashboard />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;