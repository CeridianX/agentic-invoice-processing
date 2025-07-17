import { useState, useEffect } from 'react';
import InvoiceList from './components/InvoiceList';
import InvoiceDetail from './components/InvoiceDetail';
import POList from './components/POList';
import Navigation from './components/Navigation';
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

  // Handle browser back/forward button
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state) {
        const { view, invoice, poId } = event.state;
        setCurrentView(view || 'invoices');
        setSelectedInvoice(invoice || null);
        setSelectedPO(poId ? { id: poId } as PurchaseOrder : null);
      } else {
        // No state means we're at the initial page
        setCurrentView('invoices');
        setSelectedInvoice(null);
        setSelectedPO(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleViewChange = (view: ViewMode) => {
    setCurrentView(view);
    setSelectedInvoice(null);
    setSelectedPO(null);
    // Push state to history
    window.history.pushState({ view }, '', `#${view}`);
  };

  const handleInvoiceSelect = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    // Push state to history
    window.history.pushState(
      { view: currentView, invoice: invoice },
      '',
      `#${currentView}/invoice/${invoice.id}`
    );
  };

  const handleBackToList = () => {
    setSelectedInvoice(null);
    setSelectedPO(null);
    // Go back in history instead of pushing new state
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Navigation Sidebar */}
      <Navigation />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-14">
              {/* Back button for detail views */}
              {(selectedInvoice || selectedPO) && (
                <button
                  onClick={handleBackToList}
                  className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </button>
              )}
              
              {/* Navigation Pills - Left Aligned */}
              {!selectedInvoice && !selectedPO && (
                <nav className="flex-1 flex justify-start" aria-label="Tabs">
                  <div className="flex space-x-2 bg-gray-50 rounded-full px-1 py-1">
                  <button
                    onClick={() => handleViewChange('invoices')}
                    className={`${
                      currentView === 'invoices'
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    } inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors`}
                  >
                    <Receipt className={`${
                      currentView === 'invoices' ? 'text-purple-600' : 'text-gray-500'
                    } -ml-0.5 mr-1.5 h-4 w-4`} />
                    Invoices
                  </button>
                  <button
                    onClick={() => handleViewChange('purchase-orders')}
                    className={`${
                      currentView === 'purchase-orders'
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    } inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors`}
                  >
                    <FileText className={`${
                      currentView === 'purchase-orders' ? 'text-purple-600' : 'text-gray-500'
                    } -ml-0.5 mr-1.5 h-4 w-4`} />
                    Purchase Orders
                  </button>
                  </div>
                </nav>
              )}
              
              <div className="flex items-center">
                {/* Placeholder for right side content if needed */}
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 pb-8">
          {/* Content Area */}
          {selectedInvoice ? (
            <InvoiceDetail 
              invoice={selectedInvoice} 
              onBack={handleBackToList} 
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
            <InvoiceList onSelectInvoice={handleInvoiceSelect} />
          ) : (
            <POList onSelectPO={setSelectedPO} />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;