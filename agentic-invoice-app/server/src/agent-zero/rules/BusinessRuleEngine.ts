import { BusinessRule } from '../types';

export class BusinessRuleEngine {
  private rules: BusinessRule[] = [];

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    this.rules = [
      {
        id: 'rule-001',
        name: 'Small Amount Auto-Approval',
        description: 'Auto-approve invoices under $1000 from trusted vendors',
        naturalLanguageRule: 'If invoice amount is less than $1000 and vendor trust level is high, approve automatically',
        conditions: {
          maxAmount: 1000,
          minTrustLevel: 'high'
        },
        actions: ['auto_approve'],
        priority: 1,
        active: true
      },
      {
        id: 'rule-002',
        name: 'Manager Approval Required',
        description: 'Require manager approval for medium-value invoices',
        naturalLanguageRule: 'If invoice amount is between $1000 and $5000, require manager approval',
        conditions: {
          minAmount: 1000,
          maxAmount: 5000
        },
        actions: ['manager_approval'],
        priority: 2,
        active: true
      },
      {
        id: 'rule-003',
        name: 'Executive Approval Required',
        description: 'Require executive approval for high-value invoices',
        naturalLanguageRule: 'If invoice amount exceeds $5000, require executive approval',
        conditions: {
          minAmount: 5000
        },
        actions: ['executive_approval'],
        priority: 3,
        active: true
      },
      {
        id: 'rule-004',
        name: 'New Vendor Verification',
        description: 'Additional verification for new vendors',
        naturalLanguageRule: 'If vendor is new or unverified, require additional verification regardless of amount',
        conditions: {
          vendorStatus: 'new'
        },
        actions: ['vendor_verification', 'manager_approval'],
        priority: 4,
        active: true
      },
      {
        id: 'rule-005',
        name: 'Duplicate Detection',
        description: 'Flag potential duplicate invoices',
        naturalLanguageRule: 'If similar invoice exists within 30 days from same vendor, flag for review',
        conditions: {
          duplicateCheckDays: 30
        },
        actions: ['flag_for_review'],
        priority: 5,
        active: true
      }
    ];
  }

  public parseNaturalLanguageRule(naturalLanguageRule: string): {
    conditions: Record<string, any>;
    actions: string[];
    confidence: number;
  } {
    const conditions: Record<string, any> = {};
    const actions: string[] = [];
    let confidence = 0.7;

    const rule = naturalLanguageRule.toLowerCase();

    // Parse amount conditions
    const amountLessMatch = rule.match(/amount is less than \$?([0-9,]+)/);
    if (amountLessMatch) {
      conditions.maxAmount = parseInt(amountLessMatch[1].replace(',', ''));
      confidence += 0.1;
    }

    const amountMoreMatch = rule.match(/amount (?:exceeds|is (?:more|greater) than) \$?([0-9,]+)/);
    if (amountMoreMatch) {
      conditions.minAmount = parseInt(amountMoreMatch[1].replace(',', ''));
      confidence += 0.1;
    }

    const amountBetweenMatch = rule.match(/amount is between \$?([0-9,]+) and \$?([0-9,]+)/);
    if (amountBetweenMatch) {
      conditions.minAmount = parseInt(amountBetweenMatch[1].replace(',', ''));
      conditions.maxAmount = parseInt(amountBetweenMatch[2].replace(',', ''));
      confidence += 0.15;
    }

    // Parse vendor conditions
    if (rule.includes('vendor is new') || rule.includes('new vendor')) {
      conditions.vendorStatus = 'new';
      confidence += 0.1;
    }

    if (rule.includes('trusted vendor') || rule.includes('trust level is high')) {
      conditions.minTrustLevel = 'high';
      confidence += 0.1;
    }

    if (rule.includes('vendor trust level is low') || rule.includes('untrusted vendor')) {
      conditions.maxTrustLevel = 'low';
      confidence += 0.1;
    }

    // Parse time-based conditions
    const daysMatch = rule.match(/within (\d+) days/);
    if (daysMatch) {
      conditions.duplicateCheckDays = parseInt(daysMatch[1]);
      confidence += 0.05;
    }

    // Parse actions
    if (rule.includes('approve automatically') || rule.includes('auto-approve') || rule.includes('auto approve')) {
      actions.push('auto_approve');
      confidence += 0.1;
    }

    if (rule.includes('manager approval') || rule.includes('require manager')) {
      actions.push('manager_approval');
      confidence += 0.1;
    }

    if (rule.includes('executive approval') || rule.includes('require executive')) {
      actions.push('executive_approval');
      confidence += 0.1;
    }

    if (rule.includes('verification') || rule.includes('verify')) {
      actions.push('vendor_verification');
      confidence += 0.08;
    }

    if (rule.includes('flag for review') || rule.includes('manual review') || rule.includes('flag')) {
      actions.push('flag_for_review');
      confidence += 0.08;
    }

    if (rule.includes('reject') || rule.includes('deny')) {
      actions.push('reject');
      confidence += 0.1;
    }

    // Default action if none specified
    if (actions.length === 0) {
      actions.push('manual_review');
      confidence = Math.max(confidence - 0.2, 0.3);
    }

    return {
      conditions,
      actions,
      confidence: Math.min(confidence, 1.0)
    };
  }

  public createRuleFromNaturalLanguage(
    naturalLanguageRule: string,
    name?: string,
    description?: string
  ): BusinessRule {
    const parsed = this.parseNaturalLanguageRule(naturalLanguageRule);
    
    const rule: BusinessRule = {
      id: `rule-${Date.now()}`,
      name: name || this.generateRuleName(naturalLanguageRule),
      description: description || naturalLanguageRule,
      naturalLanguageRule,
      conditions: parsed.conditions,
      actions: parsed.actions,
      priority: this.calculatePriority(parsed.conditions, parsed.actions),
      active: true
    };

    return rule;
  }

  private generateRuleName(naturalLanguageRule: string): string {
    const rule = naturalLanguageRule.toLowerCase();
    
    if (rule.includes('auto') && rule.includes('approve')) {
      return 'Auto-Approval Rule';
    }
    if (rule.includes('manager')) {
      return 'Manager Approval Rule';
    }
    if (rule.includes('executive')) {
      return 'Executive Approval Rule';
    }
    if (rule.includes('vendor') && rule.includes('new')) {
      return 'New Vendor Rule';
    }
    if (rule.includes('duplicate')) {
      return 'Duplicate Detection Rule';
    }
    if (rule.includes('amount')) {
      return 'Amount-Based Rule';
    }
    
    return 'Custom Business Rule';
  }

  private calculatePriority(conditions: any, actions: string[]): number {
    let priority = 5; // Default priority

    // Higher priority for safety-related rules
    if (actions.includes('reject') || actions.includes('flag_for_review')) {
      priority = 1;
    } else if (actions.includes('executive_approval')) {
      priority = 2;
    } else if (actions.includes('manager_approval')) {
      priority = 3;
    } else if (actions.includes('auto_approve')) {
      priority = 4;
    }

    // Adjust based on conditions
    if (conditions.minAmount && conditions.minAmount > 10000) {
      priority = Math.min(priority, 2);
    }
    if (conditions.vendorStatus === 'new') {
      priority = Math.min(priority, 3);
    }

    return priority;
  }

  public addRule(rule: BusinessRule): void {
    // Validate rule before adding
    if (this.validateRule(rule)) {
      this.rules.push(rule);
      this.sortRulesByPriority();
    } else {
      throw new Error('Invalid business rule');
    }
  }

  public updateRule(ruleId: string, updates: Partial<BusinessRule>): void {
    const ruleIndex = this.rules.findIndex(r => r.id === ruleId);
    if (ruleIndex !== -1) {
      this.rules[ruleIndex] = { ...this.rules[ruleIndex], ...updates };
      this.sortRulesByPriority();
    } else {
      throw new Error('Rule not found');
    }
  }

  public deleteRule(ruleId: string): void {
    this.rules = this.rules.filter(r => r.id !== ruleId);
  }

  public getRule(ruleId: string): BusinessRule | undefined {
    return this.rules.find(r => r.id === ruleId);
  }

  public getAllRules(): BusinessRule[] {
    return [...this.rules];
  }

  public getActiveRules(): BusinessRule[] {
    return this.rules.filter(r => r.active);
  }

  public evaluateRules(context: {
    amount: number;
    vendor: any;
    invoice: any;
  }): {
    applicableRules: BusinessRule[];
    recommendedActions: string[];
    reasoning: string;
  } {
    const applicableRules = this.getActiveRules().filter(rule => 
      this.evaluateRuleConditions(rule, context)
    );

    const recommendedActions = this.consolidateActions(applicableRules);
    const reasoning = this.generateReasoning(applicableRules, context);

    return {
      applicableRules,
      recommendedActions,
      reasoning
    };
  }

  private evaluateRuleConditions(rule: BusinessRule, context: any): boolean {
    const conditions = rule.conditions;

    // Amount-based conditions
    if (conditions.minAmount !== undefined && context.amount < conditions.minAmount) {
      return false;
    }
    if (conditions.maxAmount !== undefined && context.amount > conditions.maxAmount) {
      return false;
    }

    // Vendor-based conditions - check if vendor meets minimum trust level
    if (conditions.minTrustLevel) {
      const trustLevels = { 'low': 1, 'medium': 2, 'high': 3 };
      const requiredLevel = trustLevels[conditions.minTrustLevel as keyof typeof trustLevels] || 0;
      const vendorLevel = trustLevels[context.vendor?.trustLevel as keyof typeof trustLevels] || 0;
      
      if (vendorLevel < requiredLevel) {
        return false;
      }
    }
    if (conditions.vendorStatus) {
      if (conditions.vendorStatus === 'new') {
        // Check if vendor is actually new (low processing history or recent creation)
        const isNewVendor = context.vendor?.trustLevel === 'low' || 
                           context.vendor?.averageProcessingTime === undefined ||
                           context.vendor?.averageProcessingTime < 3;
        if (!isNewVendor) {
          return false; // Rule requires new vendor but this isn't new
        }
      }
    }

    return true;
  }

  private consolidateActions(rules: BusinessRule[]): string[] {
    const allActions = rules.flatMap(rule => rule.actions);
    const uniqueActions = [...new Set(allActions)];

    // Prioritize actions (most restrictive first)
    const actionPriority = {
      'reject': 1,
      'executive_approval': 2,
      'manager_approval': 3,
      'vendor_verification': 4,
      'flag_for_review': 5,
      'auto_approve': 6
    };

    return uniqueActions.sort((a, b) => 
      (actionPriority[a] || 99) - (actionPriority[b] || 99)
    );
  }

  private generateReasoning(rules: BusinessRule[], context: any): string {
    if (rules.length === 0) {
      return 'No applicable business rules found. Using default processing workflow.';
    }

    let reasoning = `Applied ${rules.length} business rule(s):\n`;
    
    rules.forEach((rule, index) => {
      reasoning += `${index + 1}. ${rule.name}: ${rule.description}\n`;
    });

    reasoning += `\nContext: Invoice amount $${context.amount}`;
    if (context.vendor) {
      reasoning += `, Vendor: ${context.vendor.name} (trust: ${context.vendor.trustLevel || 'unknown'})`;
    }

    return reasoning;
  }

  private validateRule(rule: BusinessRule): boolean {
    // Basic validation
    if (!rule.id || !rule.name || !rule.naturalLanguageRule) {
      return false;
    }

    if (!rule.actions || rule.actions.length === 0) {
      return false;
    }

    // Validate actions are known
    const validActions = [
      'auto_approve', 'manager_approval', 'executive_approval',
      'vendor_verification', 'flag_for_review', 'reject', 'manual_review'
    ];

    return rule.actions.every(action => validActions.includes(action));
  }

  private sortRulesByPriority(): void {
    this.rules.sort((a, b) => a.priority - b.priority);
  }

  public testRule(naturalLanguageRule: string, testContext: any): {
    parsed: any;
    wouldApply: boolean;
    recommendedActions: string[];
    confidence: number;
  } {
    const parsed = this.parseNaturalLanguageRule(naturalLanguageRule);
    const tempRule = this.createRuleFromNaturalLanguage(naturalLanguageRule);
    
    const wouldApply = this.evaluateRuleConditions(tempRule, testContext);
    
    return {
      parsed,
      wouldApply,
      recommendedActions: wouldApply ? parsed.actions : [],
      confidence: parsed.confidence
    };
  }

  public explainRule(ruleId: string): string {
    const rule = this.getRule(ruleId);
    if (!rule) {
      return 'Rule not found';
    }

    let explanation = `Rule: ${rule.name}\n`;
    explanation += `Description: ${rule.description}\n`;
    explanation += `Natural Language: "${rule.naturalLanguageRule}"\n\n`;
    
    explanation += 'Conditions:\n';
    Object.entries(rule.conditions).forEach(([key, value]) => {
      explanation += `- ${key}: ${value}\n`;
    });
    
    explanation += '\nActions:\n';
    rule.actions.forEach(action => {
      explanation += `- ${action}\n`;
    });
    
    explanation += `\nPriority: ${rule.priority} (1=highest, 5=lowest)\n`;
    explanation += `Status: ${rule.active ? 'Active' : 'Inactive'}`;

    return explanation;
  }
}