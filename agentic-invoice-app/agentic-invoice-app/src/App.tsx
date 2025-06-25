import { useState } from 'react';
import InvoiceList from './components/InvoiceList';
import InvoiceDetail from './components/InvoiceDetail';
import AgentStatusBar from './components/AgentStatusBar';
import { ArrowLeft } from 'lucide-react';

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

function App() {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <AgentStatusBar />
      
      {/* Main Content with proper top spacing */}
      <div className="pt-16 pb-8">
        {/* Back Navigation for Invoice Detail */}
        {selectedInvoice && (
          <div className="px-4 sm:px-6 lg:px-8 pb-2">
            <button
              onClick={() => setSelectedInvoice(null)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Back to Invoices</span>
            </button>
          </div>
        )}
        {selectedInvoice ? (
          <InvoiceDetail 
            invoice={selectedInvoice} 
            onBack={() => setSelectedInvoice(null)} 
          />
        ) : (
          <InvoiceList onSelectInvoice={setSelectedInvoice} />
        )}
      </div>
    </div>
  );
}

export default App;