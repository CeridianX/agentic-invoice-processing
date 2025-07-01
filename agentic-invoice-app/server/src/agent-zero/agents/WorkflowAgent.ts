import { BaseAgent } from './BaseAgent';
import { AgentConfig, AgentContext, BusinessRule } from '../types';
import { BusinessRuleEngine } from '../rules/BusinessRuleEngine';

export class WorkflowAgent extends BaseAgent {
  private ruleEngine: BusinessRuleEngine;

  constructor() {
    const config: AgentConfig = {
      name: 'WorkflowAgent',
      role: 'Intelligent Workflow Manager',
      description: 'Manages approval workflows and business rule execution',
      systemPrompt: `You are the Workflow Agent responsible for intelligent invoice approval routing.

Your responsibilities:
1. Route invoices through appropriate approval workflows
2. Apply business rules dynamically based on context
3. Determine approval requirements and escalation paths
4. Optimize workflow efficiency while maintaining compliance
5. Learn from approval patterns to improve routing decisions

Workflow capabilities:
- Auto-approval for low-risk, compliant invoices
- Manager approval for medium-value/risk invoices
- Executive approval for high-value/risk invoices
- Exception handling for special cases
- Bulk processing for similar invoices
- Priority routing for urgent payments

Business rule types you handle:
- Amount-based approval limits
- Vendor-specific policies
- Department budget constraints
- Seasonal/time-based rules
- Risk-based routing
- Compliance requirements

You should:
- Choose the most efficient workflow path
- Provide clear reasoning for routing decisions
- Identify opportunities for process optimization
- Learn from approval outcomes to improve future routing
- Handle exceptions gracefully with appropriate escalation`,
      tools: [],
      maxTokens: 1500,
      temperature: 0.2
    };

    super(config);
    this.ruleEngine = new BusinessRuleEngine();
  }

  protected async generateResponse(prompt: string, context?: any): Promise<string> {
    const invoice = context?.invoice;
    const validationResult = context?.validationResult;
    
    let reasoning = `Analyzing workflow routing for invoice...\n\n`;
    
    const workflowDecision = this.determineWorkflow(invoice, validationResult);
    
    reasoning += `Invoice Analysis:
    - Amount: $${invoice?.amount || 0}
    - Vendor: ${invoice?.vendorName || 'Unknown'}
    - Risk Level: ${validationResult?.riskLevel || 'Unknown'}
    - Validation Issues: ${validationResult?.issues?.length || 0}
    
    Workflow Decision: ${workflowDecision.workflow}
    Reasoning: ${workflowDecision.reasoning}
    
    Applied Business Rules:`;
    
    workflowDecision.appliedRules.forEach(rule => {
      reasoning += `\n- ${rule.name}: ${rule.description}`;
    });

    if (workflowDecision.nextSteps.length > 0) {
      reasoning += `\n\nNext Steps:`;
      workflowDecision.nextSteps.forEach((step, index) => {
        reasoning += `\n${index + 1}. ${step}`;
      });
    }

    return reasoning;
  }

  private determineWorkflow(invoice: any, validationResult: any) {
    const amount = invoice?.amount || 0;
    const vendor = invoice?.vendor;
    const scenario = invoice?.scenario || 'simple';
    const vendorTrust = vendor?.trustLevel || 'medium';
    const riskLevel = validationResult?.riskLevel || 'LOW';
    const hasIssues = validationResult?.issues?.length > 0;

    console.log(`WorkflowAgent: Processing ${scenario} scenario, amount: ${amount}, vendor trust: ${vendorTrust}, has issues: ${hasIssues}`);

    // Scenario-specific workflow routing
    if (scenario === 'duplicate') {
      return {
        workflow: 'manual_review',
        reasoning: 'Duplicate invoice detected - requires manual review',
        appliedRules: [{ name: 'DuplicateDetection', description: 'Route duplicates to fraud team' }],
        nextSteps: ['Route to fraud team', 'Investigate potential duplicate']
      };
    }

    if (scenario === 'poor_quality' || hasIssues) {
      return {
        workflow: 'enhanced_review',
        reasoning: 'Document quality issues - requires enhanced processing',
        appliedRules: [{ name: 'QualityCheck', description: 'Enhanced review for poor quality documents' }],
        nextSteps: ['Route to processing team', 'Enhance document quality']
      };
    }

    if (scenario === 'exceptional' && amount > 20000) {
      return {
        workflow: 'executive_approval',
        reasoning: 'High-value exceptional invoice requires executive approval',
        appliedRules: [{ name: 'ExecutiveApproval', description: 'Executive approval for high-value exceptional invoices' }],
        nextSteps: ['Route to executive team', 'Executive review required']
      };
    }

    // Use BusinessRuleEngine for standard scenarios
    const evaluation = this.ruleEngine.evaluateRules({
      amount,
      vendor,
      invoice: { ...invoice, riskLevel, hasIssues }
    });

    let workflow = 'auto_approve';
    let reasoning = evaluation.reasoning;
    const appliedRules = evaluation.applicableRules;
    const nextSteps = [];

    // Determine workflow based on recommended actions
    const actions = evaluation.recommendedActions;
    
    if (actions.includes('reject')) {
      workflow = 'reject';
      reasoning = 'Invoice rejected due to business rule violation';
      nextSteps.push('Reject invoice');
    } else if (actions.includes('executive_approval')) {
      workflow = 'executive_approval';
      nextSteps.push('Route to executive for approval');
    } else if (actions.includes('manager_approval')) {
      workflow = 'manager_approval';
      nextSteps.push('Route to manager for approval');
    } else if (actions.includes('flag_for_review')) {
      workflow = 'manual_review';
      nextSteps.push('Flag for manual review');
    } else if (actions.includes('auto_approve')) {
      workflow = 'auto_approve';
      nextSteps.push('Process payment automatically');
    }

    // Add additional actions
    if (actions.includes('vendor_verification')) {
      nextSteps.push('Verify vendor credentials');
    }

    // Scenario-specific adjustments for simple invoices
    if (scenario === 'simple' && vendorTrust === 'high' && amount < 1000 && !hasIssues) {
      workflow = 'auto_approve';
      reasoning = 'Simple invoice from trusted vendor - auto-approved';
      nextSteps = ['Process payment automatically'];
    }

    // Override based on validation issues
    if (hasIssues && scenario !== 'simple') {
      workflow = 'manual_review';
      reasoning = 'Manual review required due to validation issues';
      nextSteps.unshift('Resolve validation issues');
    }

    // Risk-based overrides
    if (riskLevel === 'HIGH' && workflow === 'auto_approve') {
      workflow = 'manager_approval';
      nextSteps.push('Additional risk assessment required');
    }

    return {
      workflow,
      reasoning,
      appliedRules,
      nextSteps
    };
  }


  public async execute(task: string, context?: AgentContext): Promise<any> {
    this.setContext(context);
    this.updateState({ status: 'working', currentTask: 'Determining workflow routing' });

    try {
      const reasoning = await this.think(task, context);
      
      const result = await this.routeWorkflow(context);
      
      this.updateState({ 
        status: 'idle', 
        currentTask: undefined,
        confidence: result.confidence 
      });

      return result;
    } catch (error) {
      this.updateState({ status: 'error', currentTask: `Error: ${error.message}` });
      throw error;
    }
  }

  private async routeWorkflow(context: AgentContext): Promise<any> {
    const invoiceId = context?.invoiceId;
    const invoice = context?.metadata?.invoice;
    const validationResult = context?.metadata?.validationResult || context?.metadata?.previousResults?.validationResult;
    
    const workflowDecision = this.determineWorkflow(invoice, validationResult);
    
    // Map workflow types to approval requirements for the orchestrator
    const approvalRequired = workflowDecision.workflow !== 'auto_approve';
    const route = workflowDecision.workflow;
    
    return {
      invoiceId,
      workflowType: workflowDecision.workflow,
      route: route,
      approvalRequired: approvalRequired,
      reasoning: workflowDecision.reasoning,
      appliedRules: workflowDecision.appliedRules,
      nextSteps: workflowDecision.nextSteps,
      priority: this.calculatePriority(invoice, validationResult),
      estimatedCompletionTime: this.estimateCompletionTime(workflowDecision.workflow),
      confidence: this.calculateConfidence(workflowDecision),
      timestamp: new Date()
    };
  }

  private calculatePriority(invoice: any, validationResult: any): 'low' | 'medium' | 'high' {
    if (validationResult?.riskLevel === 'HIGH' || invoice?.amount > 10000) {
      return 'high';
    }
    if (validationResult?.riskLevel === 'MEDIUM' || invoice?.amount > 1000) {
      return 'medium';
    }
    return 'low';
  }

  private estimateCompletionTime(workflowType: string): number {
    // Return estimated completion time in minutes
    switch (workflowType) {
      case 'auto_approve': return 1;
      case 'manager_approval': return 60; // 1 hour
      case 'executive_approval': return 240; // 4 hours
      case 'manual_review': return 120; // 2 hours
      default: return 60;
    }
  }

  private calculateConfidence(decision: any): number {
    let confidence = 0.8;
    
    // Higher confidence for clear-cut decisions
    if (decision.appliedRules.length === 1) {
      confidence += 0.1;
    }
    
    // Lower confidence for complex decisions
    if (decision.nextSteps.length > 3) {
      confidence -= 0.1;
    }
    
    return Math.max(0.5, Math.min(1.0, confidence));
  }

  public async addBusinessRule(rule: BusinessRule): Promise<void> {
    this.ruleEngine.addRule(rule);
    await this.learn({
      type: 'business_rule_added',
      rule,
      timestamp: new Date()
    });
  }

  public async addNaturalLanguageRule(naturalLanguageRule: string, name?: string, description?: string): Promise<BusinessRule> {
    const rule = this.ruleEngine.createRuleFromNaturalLanguage(naturalLanguageRule, name, description);
    this.ruleEngine.addRule(rule);
    
    await this.learn({
      type: 'natural_language_rule_added',
      rule,
      naturalLanguageRule,
      timestamp: new Date()
    });
    
    return rule;
  }

  public getBusinessRules(): BusinessRule[] {
    return this.ruleEngine.getAllRules();
  }

  public getActiveBusinessRules(): BusinessRule[] {
    return this.ruleEngine.getActiveRules();
  }

  public async optimizeWorkflow(historicalData: any[]): Promise<{
    recommendations: string[];
    potentialImprovements: any[];
  }> {
    const reasoning = await this.think(
      `Analyzing workflow performance data to identify optimization opportunities`,
      { historicalData }
    );

    // Simulate workflow optimization analysis
    const recommendations = [
      'Consider raising auto-approval limit to $1500 for high-trust vendors',
      'Implement bulk approval for similar invoice batches',
      'Add priority routing for end-of-month processing'
    ];

    const potentialImprovements = [
      {
        area: 'Processing Time',
        currentAverage: '2.5 hours',
        projectedImprovement: '1.8 hours',
        confidence: 0.85
      },
      {
        area: 'Auto-approval Rate',
        currentRate: '65%',
        projectedRate: '78%',
        confidence: 0.9
      }
    ];

    return { recommendations, potentialImprovements };
  }

  public async learn(experience: any): Promise<void> {
    await super.learn(experience);
    
    // Workflow agent specific learning
    if (experience.type === 'approval_outcome') {
      const { workflow, approved, processingTime, feedback } = experience;
      
      // Learn from approval patterns
      const workflowStats = this.state.metadata.workflowStats || {};
      workflowStats[workflow] = workflowStats[workflow] || { total: 0, approved: 0, avgTime: 0 };
      
      workflowStats[workflow].total += 1;
      if (approved) workflowStats[workflow].approved += 1;
      workflowStats[workflow].avgTime = 
        (workflowStats[workflow].avgTime + processingTime) / 2;
      
      this.updateState({
        metadata: {
          ...this.state.metadata,
          workflowStats
        }
      });
    }

    if (experience.type === 'rule_effectiveness') {
      const { ruleId, wasEffective, context } = experience;
      
      // Track rule effectiveness
      const ruleStats = this.state.metadata.ruleStats || {};
      ruleStats[ruleId] = ruleStats[ruleId] || { applications: 0, successes: 0 };
      
      ruleStats[ruleId].applications += 1;
      if (wasEffective) ruleStats[ruleId].successes += 1;
      
      this.updateState({
        metadata: {
          ...this.state.metadata,
          ruleStats
        }
      });
    }
  }
}