import { useState } from 'react';
import InvoiceList from './components/InvoiceList';
import InvoiceDetail from './components/InvoiceDetail';
import AgentStatusBar from './components/AgentStatusBar';

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
      <div className="pt-16">
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