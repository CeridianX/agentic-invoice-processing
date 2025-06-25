import { PrismaClient } from '@prisma/client';

export interface LearningExperience {
  id: string;
  type: 'approval_outcome' | 'validation_accuracy' | 'processing_efficiency' | 'rule_effectiveness' | 'user_feedback';
  context: any;
  outcome: any;
  feedback?: any;
  timestamp: Date;
  confidence: number;
}

export interface PatternInsight {
  pattern: string;
  confidence: number;
  frequency: number;
  effectiveness: number;
  recommendedAction: string;
}

export interface AdaptationRecommendation {
  area: string;
  current: any;
  recommended: any;
  reasoning: string;
  confidence: number;
  expectedImprovement: number;
}

export class AdaptiveLearningSystem {
  private prisma: PrismaClient;
  private experiences: LearningExperience[] = [];
  private patterns: Map<string, PatternInsight> = new Map();

  constructor() {
    this.prisma = new PrismaClient();
  }

  public async recordExperience(experience: Omit<LearningExperience, 'id' | 'timestamp'>): Promise<void> {
    const fullExperience: LearningExperience = {
      ...experience,
      id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    this.experiences.push(fullExperience);

    // Store in database
    try {
      await this.prisma.agentActivity.create({
        data: {
          activityType: 'learning_experience',
          description: `Learning from ${experience.type}`,
          confidenceLevel: experience.confidence,
          metadata: {
            experienceType: experience.type,
            context: experience.context,
            outcome: experience.outcome,
            feedback: experience.feedback
          }
        }
      });
    } catch (error) {
      console.error('Failed to store learning experience:', error);
    }

    // Analyze and update patterns
    await this.analyzeExperience(fullExperience);
  }

  private async analyzeExperience(experience: LearningExperience): Promise<void> {
    switch (experience.type) {
      case 'approval_outcome':
        await this.analyzeApprovalOutcome(experience);
        break;
      case 'validation_accuracy':
        await this.analyzeValidationAccuracy(experience);
        break;
      case 'processing_efficiency':
        await this.analyzeProcessingEfficiency(experience);
        break;
      case 'rule_effectiveness':
        await this.analyzeRuleEffectiveness(experience);
        break;
      case 'user_feedback':
        await this.analyzeUserFeedback(experience);
        break;
    }
  }

  private async analyzeApprovalOutcome(experience: LearningExperience): Promise<void> {
    const { context, outcome } = experience;
    
    // Learn vendor approval patterns
    if (context.vendor && outcome.approved !== undefined) {
      const pattern = `vendor_${context.vendor.id}_approval_${context.amount_range}`;
      this.updatePattern(pattern, {
        pattern: `Vendor ${context.vendor.name} invoices in range ${context.amount_range}`,
        confidence: outcome.approved ? 0.1 : -0.1,
        frequency: 1,
        effectiveness: outcome.approved ? 1 : 0,
        recommendedAction: outcome.approved ? 'auto_approve' : 'require_approval'
      });
    }

    // Learn amount-based patterns
    if (context.amount && outcome.processingTime) {
      const amountRange = this.categorizeAmount(context.amount);
      const pattern = `amount_${amountRange}_processing`;
      this.updatePattern(pattern, {
        pattern: `${amountRange} amount invoices processing`,
        confidence: outcome.processingTime < 3600 ? 0.1 : -0.05, // Good if under 1 hour
        frequency: 1,
        effectiveness: outcome.processingTime < 3600 ? 1 : 0.5,
        recommendedAction: outcome.processingTime < 3600 ? 'continue_current' : 'optimize_workflow'
      });
    }
  }

  private async analyzeValidationAccuracy(experience: LearningExperience): Promise<void> {
    const { context, outcome } = experience;
    
    // Learn from validation accuracy by document type
    if (context.documentType && outcome.accuracy !== undefined) {
      const pattern = `validation_${context.documentType}_accuracy`;
      this.updatePattern(pattern, {
        pattern: `Validation accuracy for ${context.documentType} documents`,
        confidence: outcome.accuracy > 0.9 ? 0.1 : -0.1,
        frequency: 1,
        effectiveness: outcome.accuracy,
        recommendedAction: outcome.accuracy > 0.9 ? 'maintain_method' : 'improve_extraction'
      });
    }

    // Learn from extraction method effectiveness
    if (context.extractionMethod && outcome.confidence !== undefined) {
      const pattern = `extraction_${context.extractionMethod}_${context.vendor?.category}`;
      this.updatePattern(pattern, {
        pattern: `${context.extractionMethod} extraction for ${context.vendor?.category} vendors`,
        confidence: outcome.confidence > 0.85 ? 0.1 : -0.05,
        frequency: 1,
        effectiveness: outcome.confidence,
        recommendedAction: outcome.confidence > 0.85 ? 'prefer_method' : 'try_alternative'
      });
    }
  }

  private async analyzeProcessingEfficiency(experience: LearningExperience): Promise<void> {
    const { context, outcome } = experience;
    
    // Learn workflow efficiency patterns
    if (context.workflowType && outcome.completionTime) {
      const pattern = `workflow_${context.workflowType}_efficiency`;
      const isEfficient = outcome.completionTime < context.expectedTime;
      
      this.updatePattern(pattern, {
        pattern: `${context.workflowType} workflow efficiency`,
        confidence: isEfficient ? 0.1 : -0.05,
        frequency: 1,
        effectiveness: isEfficient ? 1 : outcome.completionTime / context.expectedTime,
        recommendedAction: isEfficient ? 'maintain_workflow' : 'optimize_steps'
      });
    }
  }

  private async analyzeRuleEffectiveness(experience: LearningExperience): Promise<void> {
    const { context, outcome } = experience;
    
    if (context.ruleId && outcome.effectiveness !== undefined) {
      const pattern = `rule_${context.ruleId}_effectiveness`;
      this.updatePattern(pattern, {
        pattern: `Business rule ${context.ruleId} effectiveness`,
        confidence: outcome.effectiveness > 0.8 ? 0.1 : -0.1,
        frequency: 1,
        effectiveness: outcome.effectiveness,
        recommendedAction: outcome.effectiveness > 0.8 ? 'keep_rule' : 'revise_rule'
      });
    }
  }

  private async analyzeUserFeedback(experience: LearningExperience): Promise<void> {
    const { context, feedback } = experience;
    
    if (feedback && feedback.rating !== undefined) {
      const pattern = `user_satisfaction_${context.feature}`;
      this.updatePattern(pattern, {
        pattern: `User satisfaction with ${context.feature}`,
        confidence: feedback.rating > 3 ? 0.1 : -0.1,
        frequency: 1,
        effectiveness: feedback.rating / 5,
        recommendedAction: feedback.rating > 3 ? 'maintain_feature' : 'improve_feature'
      });
    }
  }

  private updatePattern(patternKey: string, update: Partial<PatternInsight>): void {
    const existing = this.patterns.get(patternKey);
    
    if (existing) {
      // Update existing pattern with weighted average
      const newFrequency = existing.frequency + (update.frequency || 0);
      const newConfidence = (existing.confidence * existing.frequency + (update.confidence || 0)) / newFrequency;
      const newEffectiveness = (existing.effectiveness * existing.frequency + (update.effectiveness || 0)) / newFrequency;
      
      this.patterns.set(patternKey, {
        ...existing,
        confidence: newConfidence,
        frequency: newFrequency,
        effectiveness: newEffectiveness,
        recommendedAction: update.recommendedAction || existing.recommendedAction
      });
    } else {
      // Create new pattern
      this.patterns.set(patternKey, {
        pattern: update.pattern || patternKey,
        confidence: update.confidence || 0,
        frequency: update.frequency || 1,
        effectiveness: update.effectiveness || 0,
        recommendedAction: update.recommendedAction || 'monitor'
      });
    }
  }

  private categorizeAmount(amount: number): string {
    if (amount < 500) return 'small';
    if (amount < 2000) return 'medium';
    if (amount < 10000) return 'large';
    return 'very_large';
  }

  public async generateAdaptations(): Promise<AdaptationRecommendation[]> {
    const recommendations: AdaptationRecommendation[] = [];
    
    // Analyze patterns for adaptation opportunities
    for (const [key, pattern] of this.patterns) {
      if (pattern.frequency >= 5 && pattern.confidence > 0.7) {
        if (pattern.recommendedAction === 'optimize_workflow') {
          recommendations.push({
            area: 'workflow_optimization',
            current: 'Standard workflow timing',
            recommended: 'Optimized workflow with reduced steps',
            reasoning: `Pattern shows ${pattern.pattern} can be improved`,
            confidence: pattern.confidence,
            expectedImprovement: pattern.effectiveness * 0.2
          });
        }
        
        if (pattern.recommendedAction === 'improve_extraction') {
          recommendations.push({
            area: 'document_processing',
            current: 'Current extraction method',
            recommended: 'Enhanced extraction with OCR fallback',
            reasoning: `Pattern shows ${pattern.pattern} needs improvement`,
            confidence: pattern.confidence,
            expectedImprovement: (1 - pattern.effectiveness) * 0.3
          });
        }
        
        if (pattern.recommendedAction === 'revise_rule') {
          recommendations.push({
            area: 'business_rules',
            current: 'Current rule configuration',
            recommended: 'Adjusted rule parameters',
            reasoning: `Pattern shows ${pattern.pattern} could be more effective`,
            confidence: pattern.confidence,
            expectedImprovement: (1 - pattern.effectiveness) * 0.25
          });
        }
      }
    }

    return recommendations;
  }

  public async getInsights(): Promise<{
    totalExperiences: number;
    patterns: PatternInsight[];
    adaptations: AdaptationRecommendation[];
    recentLearnings: string[];
  }> {
    const adaptations = await this.generateAdaptations();
    const patterns = Array.from(this.patterns.values())
      .filter(p => p.frequency >= 3)
      .sort((a, b) => b.confidence - a.confidence);

    const recentLearnings = this.experiences
      .slice(-10)
      .map(exp => `Learned from ${exp.type}: ${this.summarizeExperience(exp)}`)
      .reverse();

    return {
      totalExperiences: this.experiences.length,
      patterns,
      adaptations,
      recentLearnings
    };
  }

  private summarizeExperience(experience: LearningExperience): string {
    switch (experience.type) {
      case 'approval_outcome':
        return `${experience.outcome.approved ? 'Successful' : 'Delayed'} approval for $${experience.context.amount} invoice`;
      case 'validation_accuracy':
        return `${Math.round(experience.outcome.accuracy * 100)}% accuracy in ${experience.context.documentType} validation`;
      case 'processing_efficiency':
        return `${experience.context.workflowType} workflow completed in ${experience.outcome.completionTime}ms`;
      case 'rule_effectiveness':
        return `Rule ${experience.context.ruleId} showed ${Math.round(experience.outcome.effectiveness * 100)}% effectiveness`;
      case 'user_feedback':
        return `User rated ${experience.context.feature} as ${experience.feedback?.rating}/5`;
      default:
        return 'General learning experience';
    }
  }

  public async applyAdaptation(adaptationId: string): Promise<boolean> {
    // This would implement the actual adaptation logic
    // For now, just record that an adaptation was applied
    await this.recordExperience({
      type: 'processing_efficiency',
      context: { adaptationId, applied: true },
      outcome: { success: true },
      confidence: 0.8
    });
    
    return true;
  }

  public async getPredictiveInsights(context: any): Promise<{
    recommendedWorkflow: string;
    confidence: number;
    reasoning: string;
  }> {
    // Use learned patterns to make predictions
    const vendorPattern = this.patterns.get(`vendor_${context.vendor?.id}_approval_${this.categorizeAmount(context.amount)}`);
    const amountPattern = this.patterns.get(`amount_${this.categorizeAmount(context.amount)}_processing`);
    
    let recommendedWorkflow = 'standard';
    let confidence = 0.5;
    let reasoning = 'No specific patterns found, using default workflow';
    
    if (vendorPattern && vendorPattern.confidence > 0.7) {
      recommendedWorkflow = vendorPattern.recommendedAction;
      confidence = vendorPattern.confidence;
      reasoning = `Based on ${vendorPattern.frequency} similar cases with this vendor`;
    } else if (amountPattern && amountPattern.confidence > 0.6) {
      recommendedWorkflow = amountPattern.recommendedAction;
      confidence = amountPattern.confidence;
      reasoning = `Based on ${amountPattern.frequency} similar amount invoices`;
    }
    
    return {
      recommendedWorkflow,
      confidence,
      reasoning
    };
  }

  public async shutdown(): Promise<void> {
    await this.prisma.$disconnect();
  }
}