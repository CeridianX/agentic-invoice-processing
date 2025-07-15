export interface EmailContent {
  subject: string;
  body: string;
  htmlBody?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  actionItems?: string[];
  attachments?: string[];
}

export interface EmailMessage {
  id: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  content: EmailContent;
  timestamp: Date;
  status: 'draft' | 'sent' | 'delivered' | 'read' | 'responded';
  conversationId?: string;
  relatedInvoiceId?: string;
  relatedScenario?: string;
}

export interface EmailConversation {
  id: string;
  subject: string;
  participants: string[];
  messages: EmailMessage[];
  status: 'active' | 'resolved' | 'escalated' | 'timeout';
  relatedInvoiceId: string;
  scenario: CommunicationScenario;
  createdAt: Date;
  lastActivity: Date;
  expectedResponseBy?: Date;
  escalationDate?: Date;
  currentStep: number; // Track conversation progress (0=initial, 1=first_response, 2=follow_up, 3=resolution)
  maxSteps: number; // Total steps in conversation flow
  isInteractive: boolean; // Whether this conversation uses interactive mode
}

export type CommunicationScenario = 
  | 'missing_po'
  | 'duplicate_invoice'
  | 'amount_variance'
  | 'vendor_verification'
  | 'approval_request'
  | 'follow_up'
  | 'escalation';

export interface CommunicationContext {
  scenario: CommunicationScenario;
  invoiceId: string;
  invoiceNumber: string;
  vendor: {
    name: string;
    id: string;
    trustLevel: string;
  };
  amount: number;
  issueDetails: {
    description: string;
    severity: 'low' | 'medium' | 'high';
    actionRequired: string[];
  };
  recipientInfo: {
    type: 'internal_procurement' | 'external_vendor' | 'manager' | 'executive';
    email: string;
    name?: string;
    department?: string;
  };
  urgency: 'routine' | 'normal' | 'urgent' | 'critical';
  previousCommunications?: EmailMessage[];
  deadline?: Date;
}

export interface CommunicationTemplate {
  id: string;
  scenario: CommunicationScenario;
  recipientType: string;
  subject: string;
  bodyTemplate: string;
  tone: 'formal' | 'professional' | 'friendly' | 'urgent';
  includeActionItems: boolean;
  followUpDays?: number;
  escalationDays?: number;
}

export interface AIGenerationRequest {
  context: CommunicationContext;
  template?: CommunicationTemplate;
  customInstructions?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIGenerationResult {
  content: EmailContent;
  confidence: number;
  reasoning: string;
  suggestedFollowUp?: {
    days: number;
    reason: string;
  };
  suggestedEscalation?: {
    days: number;
    escalateTo: string;
    reason: string;
  };
}

export interface CommunicationMetrics {
  totalCommunications: number;
  byScenario: Record<CommunicationScenario, number>;
  responseRates: {
    within24Hours: number;
    within48Hours: number;
    within7Days: number;
    noResponse: number;
  };
  averageResponseTime: number; // in hours
  escalationRate: number;
  resolutionRate: number;
  aiConfidenceAverage: number;
}

export interface EmailServiceConfig {
  enabled: boolean;
  mockMode: boolean;
  responseDelay: {
    min: number; // seconds
    max: number; // seconds
  };
  simulateResponses: boolean;
  autoResponse: {
    enabled: boolean;
    scenarios: CommunicationScenario[];
    successRate: number; // 0-1
  };
}