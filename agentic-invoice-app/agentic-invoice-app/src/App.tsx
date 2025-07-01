import { useState } from 'react';
import InvoiceList from './components/InvoiceList';
import InvoiceDetail from './components/InvoiceDetail';
import POList from './components/POList';
import AgentStatusBar from './components/AgentStatusBar';
import { ArrowLeft, FileText, Receipt } from 'lucide-react';

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

interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  totalAmount: number;
  status: string;
  createdDate: string;
  approvalDate?: string;
  requester: string;
  department: string;
  vendor: Vendor;
}

type ViewMode = 'invoices' | 'purchase-orders';

function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('invoices');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  const handleViewChange = (view: ViewMode) => {
    setCurrentView(view);
    setSelectedInvoice(null);
    setSelectedPO(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AgentStatusBar />
      
      {/* Main Content with proper top spacing */}
      <div className="pt-16 pb-8">
        {/* Navigation Tabs */}
        {!selectedInvoice && !selectedPO && (
          <div className="border-b border-gray-200 mb-6">
            <div className="max-w-7xl mx-auto pl-4 sm:pl-6 lg:pl-8">
              <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                <button
                  onClick={() => handleViewChange('invoices')}
                  className={`${
                    currentView === 'invoices'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } group inline-flex items-center py-3 px-1 border-b-2 font-medium text-sm transition-colors`}
                >
                  <Receipt className={`${
                    currentView === 'invoices' ? 'text-purple-500' : 'text-gray-400 group-hover:text-gray-500'
                  } -ml-0.5 mr-1.5 h-4 w-4`} />
                  Invoices
                </button>
                <button
                  onClick={() => handleViewChange('purchase-orders')}
                  className={`${
                    currentView === 'purchase-orders'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } group inline-flex items-center py-3 px-1 border-b-2 font-medium text-sm transition-colors`}
                >
                  <FileText className={`${
                    currentView === 'purchase-orders' ? 'text-purple-500' : 'text-gray-400 group-hover:text-gray-500'
                  } -ml-0.5 mr-1.5 h-4 w-4`} />
                  Purchase Orders
                </button>
              </nav>
            </div>
          </div>
        )}

        {/* Back Navigation */}
        {(selectedInvoice || selectedPO) && (
          <div className="px-4 sm:px-6 lg:px-8 pb-2">
            <button
              onClick={() => {
                setSelectedInvoice(null);
                setSelectedPO(null);
              }}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Back to {currentView === 'invoices' ? 'Invoices' : 'Purchase Orders'}</span>
            </button>
          </div>
        )}

        {/* Content Area */}
        {selectedInvoice ? (
          <InvoiceDetail 
            invoice={selectedInvoice} 
            onBack={() => setSelectedInvoice(null)} 
          />
        ) : selectedPO ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Purchase Order Details</h2>
              <p className="text-gray-600">PO Detail view coming soon...</p>
              <p className="text-sm text-gray-500 mt-2">Selected PO: {selectedPO.poNumber}</p>
            </div>
          </div>
        ) : currentView === 'invoices' ? (
          <InvoiceList onSelectInvoice={setSelectedInvoice} />
        ) : (
          <POList onSelectPO={setSelectedPO} />
        )}
      </div>
    </div>
  );
}

export default App;