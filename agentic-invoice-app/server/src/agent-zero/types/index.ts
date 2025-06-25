export interface AgentMessage {
  id: string;
  type: 'system' | 'user' | 'assistant' | 'tool_use' | 'tool_result';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface AgentTool {
  name: string;
  description: string;
  execute: (params: any) => Promise<any>;
  schema?: Record<string, any>;
}

export interface AgentContext {
  invoiceId?: string;
  sessionId: string;
  userId?: string;
  metadata: Record<string, any>;
}

export interface AgentConfig {
  name: string;
  role: string;
  description: string;
  systemPrompt: string;
  tools: AgentTool[];
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface AgentState {
  id: string;
  status: 'idle' | 'thinking' | 'working' | 'waiting' | 'error';
  currentTask?: string;
  confidence?: number;
  lastActivity: Date;
  metadata: Record<string, any>;
}

export interface WorkflowStep {
  id: string;
  agentName: string;
  action: string;
  input: any;
  output?: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  confidence?: number;
  reasoning?: string;
  timestamp: Date;
}

export interface AgentOrchestrationPlan {
  id: string;
  invoiceId: string;
  steps: WorkflowStep[];
  status: 'planning' | 'executing' | 'completed' | 'failed';
  reasoning: string;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MCPServerConfig {
  name: string;
  description: string;
  tools: string[];
  endpoint?: string;
  capabilities: string[];
}

export interface InvoiceProcessingResult {
  invoiceId: string;
  extractedData: Record<string, any>;
  validation: {
    isValid: boolean;
    issues: string[];
    confidence: number;
  };
  workflow: {
    recommendedActions: string[];
    approvalRequired: boolean;
    priority: 'low' | 'medium' | 'high';
  };
  agentInsights: {
    patterns: string[];
    recommendations: string[];
    learnings: string[];
  };
}

export interface BusinessRule {
  id: string;
  name: string;
  description: string;
  naturalLanguageRule: string;
  conditions: Record<string, any>;
  actions: string[];
  priority: number;
  active: boolean;
}