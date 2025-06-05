import type { Invoice, AgentSuggestion } from '../types';

// Mock data
const mockInvoices: Invoice[] = [
  {
    id: '1',
    vendorId: '1',
    invoiceNumber: 'INV-001',
    amount: 9719.78,
    status: 'pending',
    receivedDate: '2024-06-01',
    dueDate: '2024-06-30',
    invoiceDate: '2024-06-01',
    paymentTerms: 'Net 30',
    hasIssues: false,
    currency: 'USD',
    vendor: {
      id: '1',
      name: 'TechCorp Solutions',
      category: 'IT Hardware',
      trustLevel: 'high',
      averageProcessingTime: 2,
      paymentTerms: 'Net 30',
      preferredPaymentMethod: 'ACH'
    },
    agentActivities: [{
      id: '1',
      timestamp: '2024-06-05',
      activityType: 'analysis',
      description: 'Automated matching completed',
      confidenceLevel: 0.98
    }]
  },
  {
    id: '2',
    vendorId: '1',
    invoiceNumber: 'INV-002',
    amount: 8066.60,
    status: 'pending_review',
    receivedDate: '2024-06-02',
    dueDate: '2024-07-02',
    invoiceDate: '2024-06-02',
    paymentTerms: 'Net 30',
    hasIssues: true,
    variancePercentage: 6.2,
    currency: 'USD',
    vendor: {
      id: '1',
      name: 'TechCorp Solutions',
      category: 'IT Hardware',
      trustLevel: 'high',
      averageProcessingTime: 2,
      paymentTerms: 'Net 30',
      preferredPaymentMethod: 'ACH'
    },
    exceptions: [{
      id: '1',
      invoiceId: '2',
      type: 'variance',
      severity: 'medium',
      description: 'Amount variance detected',
      status: 'open'
    }],
    agentActivities: [{
      id: '2',
      timestamp: '2024-06-05',
      activityType: 'analysis',
      description: 'Variance detected, requires review',
      confidenceLevel: 0.84
    }]
  },
  {
    id: '3',
    vendorId: '2',
    invoiceNumber: 'INV-003',
    amount: 3708.24,
    status: 'pending_review',
    receivedDate: '2024-06-03',
    dueDate: '2024-07-03',
    invoiceDate: '2024-06-03',
    paymentTerms: 'Net 30',
    hasIssues: true,
    currency: 'USD',
    vendor: {
      id: '2',
      name: 'Cloud Services Inc',
      category: 'IT Services',
      trustLevel: 'medium',
      averageProcessingTime: 3,
      paymentTerms: 'Net 30',
      preferredPaymentMethod: 'Check'
    },
    exceptions: [{
      id: '2',
      invoiceId: '3',
      type: 'duplicate',
      severity: 'high',
      description: 'Potential duplicate invoice',
      status: 'open'
    }],
    agentActivities: [{
      id: '3',
      timestamp: '2024-06-05',
      activityType: 'analysis',
      description: 'Duplicate check completed',
      confidenceLevel: 0.91
    }]
  }
];

const mockSuggestions: AgentSuggestion[] = [
  {
    type: 'auto_approval',
    title: 'Agent Recommendations',
    description: '20 invoices match auto-approval criteria • 95% confidence',
    confidence: 0.95,
    invoices: mockInvoices.slice(0, 2)
  }
];

// Mock API service
export const invoiceService = {
  getAll: async () => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    return mockInvoices;
  },

  getById: async (id: string) => {
    await new Promise(resolve => setTimeout(resolve, 100));
    const invoice = mockInvoices.find(inv => inv.id === id);
    if (!invoice) throw new Error('Invoice not found');
    return invoice;
  },

  updateStatus: async (id: string, status: string) => {
    await new Promise(resolve => setTimeout(resolve, 100));
    const invoice = mockInvoices.find(inv => inv.id === id);
    if (invoice) {
      invoice.status = status;
    }
    return invoice;
  },

  bulkApprove: async (invoiceIds: string[]) => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return { success: true };
  },

  createMatch: async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return { success: true };
  },

  getSuggestions: async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return { suggestions: [] };
  }
};

export const agentService = {
  getSuggestions: async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return mockSuggestions;
  }
};