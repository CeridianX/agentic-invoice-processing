import { BaseAgent } from './BaseAgent';
import { AgentConfig, AgentContext, AgentOrchestrationPlan, WorkflowStep } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class CoordinatorAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'CoordinatorAgent',
      role: 'Invoice Processing Orchestrator',
      description: 'Plans and coordinates the entire invoice processing workflow',
      systemPrompt: `You are the Coordinator Agent responsible for orchestrating invoice processing workflows.

Your responsibilities:
1. Analyze incoming invoices and determine the optimal processing strategy
2. Plan multi-step workflows involving other specialized agents
3. Coordinate between Document Processor, Validation, and Workflow agents
4. Handle exceptions and adapt workflows dynamically
5. Ensure efficient processing while maintaining accuracy

You have access to:
- Document analysis capabilities
- Workflow planning tools
- Agent coordination mechanisms
- Business rule engine
- Learning from past processing patterns

Always provide clear reasoning for your decisions and adapt your approach based on:
- Document type and quality
- Vendor patterns and history
- Business rules and policies
- Current system load and priorities`,
      tools: [],
      maxTokens: 2000,
      temperature: 0.1
    };

    super(config);
  }

  protected async generateResponse(prompt: string, context?: any): Promise<string> {
    // Simulate intelligent reasoning - in a real implementation, this would call an LLM
    const invoice = context?.invoice;
    const complexity = this.assessComplexity(invoice);
    
    let reasoning = `Analyzing invoice processing request...\n\n`;
    
    if (complexity === 'simple') {
      reasoning += `This appears to be a straightforward invoice from a known vendor. 
      I'll route it through the standard fast-track processing:
      1. Document extraction using PDF text parsing
      2. Basic validation against vendor patterns
      3. Auto-approval if within normal parameters`;
    } else if (complexity === 'complex') {
      reasoning += `This invoice requires enhanced processing due to:
      - High value amount requiring additional approval
      - New or high-risk vendor
      - Unusual document format
      
      I'll implement enhanced workflow:
      1. Multi-method document extraction with OCR fallback
      2. Comprehensive validation including vendor verification
      3. Human approval with detailed reasoning`;
    } else {
      reasoning += `This invoice presents exceptional circumstances requiring:
      - Special handling procedures
      - Additional verification steps
      - Executive approval routing
      
      I'll create a custom workflow to handle these edge cases appropriately.`;
    }

    return reasoning;
  }

  private assessComplexity(invoice: any): 'simple' | 'complex' | 'exceptional' {
    if (!invoice) return 'simple';
    
    const amount = invoice.amount || 0;
    const isNewVendor = !invoice.vendor?.id;
    const hasIssues = invoice.hasIssues;
    
    if (hasIssues || amount > 5000 || isNewVendor) {
      return amount > 10000 ? 'exceptional' : 'complex';
    }
    
    return 'simple';
  }

  public async execute(task: string, context?: AgentContext): Promise<AgentOrchestrationPlan> {
    this.setContext(context);
    this.updateState({ status: 'working', currentTask: 'Creating orchestration plan' });

    try {
      const reasoning = await this.think(task, context);
      
      // Create orchestration plan
      const plan = await this.createOrchestrationPlan(task, context, reasoning);
      
      this.updateState({ 
        status: 'idle', 
        currentTask: undefined,
        confidence: plan.confidence 
      });

      return plan;
    } catch (error) {
      this.updateState({ status: 'error', currentTask: `Error: ${error.message}` });
      throw error;
    }
  }

  private async createOrchestrationPlan(
    task: string, 
    context: AgentContext, 
    reasoning: string
  ): Promise<AgentOrchestrationPlan> {
    const invoiceId = context?.invoiceId || uuidv4();
    const complexity = context?.metadata?.invoice ? 
      this.assessComplexity(context.metadata.invoice) : 'simple';

    const steps: WorkflowStep[] = [];

    // Always start with document processing
    steps.push({
      id: uuidv4(),
      agentName: 'DocumentProcessorAgent',
      action: 'extract_data',
      input: { invoiceId, method: complexity === 'simple' ? 'pdf_text' : 'multi_method' },
      status: 'pending',
      timestamp: new Date()
    });

    // Add validation step
    steps.push({
      id: uuidv4(),
      agentName: 'ValidationAgent',
      action: 'validate_invoice',
      input: { 
        invoiceId, 
        level: complexity === 'simple' ? 'basic' : 'comprehensive' 
      },
      status: 'pending',
      timestamp: new Date()
    });

    // Add workflow routing
    steps.push({
      id: uuidv4(),
      agentName: 'WorkflowAgent',
      action: 'route_approval',
      input: { 
        invoiceId, 
        complexity,
        requiresHumanApproval: complexity !== 'simple'
      },
      status: 'pending',
      timestamp: new Date()
    });

    const plan: AgentOrchestrationPlan = {
      id: uuidv4(),
      invoiceId,
      steps,
      status: 'planning',
      reasoning,
      confidence: complexity === 'simple' ? 0.9 : complexity === 'complex' ? 0.75 : 0.6,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return plan;
  }

  public async adaptPlan(
    planId: string, 
    newContext: any
  ): Promise<AgentOrchestrationPlan> {
    // Implementation for dynamically adapting plans based on new information
    const reasoning = await this.think(
      `Adapting workflow plan based on new context: ${JSON.stringify(newContext)}`,
      newContext
    );

    // This would update the existing plan with new steps or modifications
    // For now, returning a placeholder
    return {
      id: planId,
      invoiceId: newContext.invoiceId || uuidv4(),
      steps: [],
      status: 'planning',
      reasoning,
      confidence: 0.8,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  public async learn(experience: any): Promise<void> {
    await super.learn(experience);
    
    // Coordinator-specific learning: pattern recognition for better workflow planning
    if (experience.type === 'workflow_completion') {
      const { success, processingTime, complexity, steps } = experience;
      
      // Learn from successful patterns
      if (success && processingTime < 30000) { // Fast completion
        this.updateState({
          metadata: {
            ...this.state.metadata,
            successfulPatterns: [
              ...(this.state.metadata.successfulPatterns || []),
              { complexity, steps, processingTime }
            ]
          }
        });
      }
    }
  }
}