export interface Vendor {
  id: string;
  name: string;
  category: string;
  trustLevel: string;
  averageProcessingTime: number;
  paymentTerms: string;
  taxId?: string;
  preferredPaymentMethod: string;
  typicalVariancePattern?: string;
  _count?: {
    invoices: number;
    purchaseOrders: number;
  };
}

export interface Invoice {
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
  purchaseOrder?: PurchaseOrder;
  lineItems?: InvoiceLineItem[];
  exceptions?: Exception[];
  agentActivities?: AgentActivity[];
}

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  lineNumber: number;
  itemCode?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  taxRate: number;
  taxAmount: number;
  glAccountCode?: string;
  department?: string;
  costCenter?: string;
  poLineItemId?: string;
  matchStatus: string;
  varianceAmount?: number;
  variancePercentage?: number;
  poLineItem?: POLineItem;
  matchingActivities?: MatchingActivity[];
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  totalAmount: number;
  status: string;
  createdDate: string;
  approvalDate?: string;
  requester: string;
  department: string;
  vendor?: Vendor;
  lineItems?: POLineItem[];
}

export interface POLineItem {
  id: string;
  purchaseOrderId: string;
  lineNumber: number;
  itemCode?: string;
  description: string;
  quantityOrdered: number;
  quantityReceived: number;
  quantityInvoiced: number;
  unitPrice: number;
  totalAmount: number;
  glAccountCode?: string;
  department?: string;
  costCenter?: string;
  expectedDeliveryDate?: string;
  budgetCategory?: string;
}

export interface AgentActivity {
  id: string;
  timestamp: string;
  activityType: string;
  description: string;
  invoiceId?: string;
  confidenceLevel?: number;
  affectedLineItems?: string;
  invoice?: {
    invoiceNumber: string;
    vendor: {
      name: string;
    };
  };
}

export interface Exception {
  id: string;
  invoiceId: string;
  lineItemId?: string;
  type: string;
  severity: string;
  description: string;
  suggestedAction?: string;
  status: string;
  agentConfidence?: number;
}

export interface MatchingActivity {
  id: string;
  invoiceLineItemId: string;
  poLineItemId: string;
  matchType: string;
  confidenceScore: number;
  matchedBy: string;
  matchedAt: string;
  matchNotes?: string;
}

export interface AgentSuggestion {
  type: string;
  title: string;
  description: string;
  invoices: Invoice[];
  confidence: number;
}

export interface DashboardStats {
  invoicesByStatus: Array<{
    status: string;
    _count: { _all: number };
    _sum: { amount: number };
  }>;
  totalMetrics: {
    _count: { _all: number };
    _sum: { amount: number };
    _avg: { amount: number; variancePercentage: number };
  };
  openExceptions: number;
  timeSaved: number;
  recentActivity: number;
  vendorPerformance: Array<{
    name: string;
    trustLevel: string;
    invoiceCount: number;
    issueRate: number;
    averageVariance: number;
  }>;
  matchingStats: Array<{
    matchStatus: string;
    _count: { _all: number };
  }>;
}