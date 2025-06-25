import { Router } from 'express';
import { BusinessRuleEngine } from '../agent-zero/rules/BusinessRuleEngine';
import { BusinessRule } from '../agent-zero/types';

const router = Router();
const ruleEngine = new BusinessRuleEngine();

// Get all business rules
router.get('/', async (req, res) => {
  try {
    const rules = ruleEngine.getAllRules();
    res.json(rules);
  } catch (error) {
    console.error('Error fetching business rules:', error);
    res.status(500).json({ error: 'Failed to fetch business rules' });
  }
});

// Get active business rules only
router.get('/active', async (req, res) => {
  try {
    const rules = ruleEngine.getActiveRules();
    res.json(rules);
  } catch (error) {
    console.error('Error fetching active business rules:', error);
    res.status(500).json({ error: 'Failed to fetch active business rules' });
  }
});

// Get a specific business rule
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const rule = ruleEngine.getRule(id);
    
    if (!rule) {
      return res.status(404).json({ error: 'Business rule not found' });
    }
    
    res.json(rule);
  } catch (error) {
    console.error('Error fetching business rule:', error);
    res.status(500).json({ error: 'Failed to fetch business rule' });
  }
});

// Create a new business rule from natural language
router.post('/', async (req, res) => {
  try {
    const { naturalLanguageRule, name, description } = req.body;
    
    if (!naturalLanguageRule) {
      return res.status(400).json({ error: 'Natural language rule is required' });
    }
    
    const rule = ruleEngine.createRuleFromNaturalLanguage(
      naturalLanguageRule,
      name,
      description
    );
    
    ruleEngine.addRule(rule);
    
    res.status(201).json({
      success: true,
      rule,
      message: 'Business rule created successfully'
    });
  } catch (error) {
    console.error('Error creating business rule:', error);
    res.status(500).json({ error: 'Failed to create business rule' });
  }
});

// Update a business rule
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // If natural language rule is updated, re-parse it
    if (updates.naturalLanguageRule) {
      const parsed = ruleEngine.parseNaturalLanguageRule(updates.naturalLanguageRule);
      updates.conditions = parsed.conditions;
      updates.actions = parsed.actions;
    }
    
    ruleEngine.updateRule(id, updates);
    
    const updatedRule = ruleEngine.getRule(id);
    
    res.json({
      success: true,
      rule: updatedRule,
      message: 'Business rule updated successfully'
    });
  } catch (error) {
    console.error('Error updating business rule:', error);
    
    if (error.message === 'Rule not found') {
      return res.status(404).json({ error: 'Business rule not found' });
    }
    
    res.status(500).json({ error: 'Failed to update business rule' });
  }
});

// Delete a business rule
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    ruleEngine.deleteRule(id);
    
    res.json({
      success: true,
      message: 'Business rule deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting business rule:', error);
    res.status(500).json({ error: 'Failed to delete business rule' });
  }
});

// Parse natural language rule (test endpoint)
router.post('/parse', async (req, res) => {
  try {
    const { naturalLanguageRule } = req.body;
    
    if (!naturalLanguageRule) {
      return res.status(400).json({ error: 'Natural language rule is required' });
    }
    
    const parsed = ruleEngine.parseNaturalLanguageRule(naturalLanguageRule);
    
    res.json({
      success: true,
      parsed,
      message: 'Natural language rule parsed successfully'
    });
  } catch (error) {
    console.error('Error parsing natural language rule:', error);
    res.status(500).json({ error: 'Failed to parse natural language rule' });
  }
});

// Test a rule against sample data
router.post('/test', async (req, res) => {
  try {
    const { naturalLanguageRule, testContext } = req.body;
    
    if (!naturalLanguageRule || !testContext) {
      return res.status(400).json({ 
        error: 'Natural language rule and test context are required' 
      });
    }
    
    const testResult = ruleEngine.testRule(naturalLanguageRule, testContext);
    
    res.json({
      success: true,
      testResult,
      message: 'Rule test completed successfully'
    });
  } catch (error) {
    console.error('Error testing rule:', error);
    res.status(500).json({ error: 'Failed to test rule' });
  }
});

// Explain a business rule in detail
router.get('/:id/explain', async (req, res) => {
  try {
    const { id } = req.params;
    
    const explanation = ruleEngine.explainRule(id);
    
    if (explanation === 'Rule not found') {
      return res.status(404).json({ error: 'Business rule not found' });
    }
    
    res.json({
      success: true,
      explanation,
      message: 'Rule explanation generated successfully'
    });
  } catch (error) {
    console.error('Error explaining rule:', error);
    res.status(500).json({ error: 'Failed to explain rule' });
  }
});

// Evaluate rules against a given context
router.post('/evaluate', async (req, res) => {
  try {
    const { context } = req.body;
    
    if (!context || typeof context.amount !== 'number') {
      return res.status(400).json({ 
        error: 'Valid context with amount is required' 
      });
    }
    
    const evaluation = ruleEngine.evaluateRules(context);
    
    res.json({
      success: true,
      evaluation,
      message: 'Rules evaluated successfully'
    });
  } catch (error) {
    console.error('Error evaluating rules:', error);
    res.status(500).json({ error: 'Failed to evaluate rules' });
  }
});

// Get rule suggestions based on common patterns
router.get('/suggestions/common', async (req, res) => {
  try {
    const commonRules = [
      {
        category: 'Approval Limits',
        rules: [
          'If invoice amount is less than $500, approve automatically',
          'If invoice amount is between $500 and $2000, require manager approval',
          'If invoice amount exceeds $2000, require executive approval'
        ]
      },
      {
        category: 'Vendor Management',
        rules: [
          'If vendor is new, require additional verification',
          'If vendor trust level is low, require manager approval regardless of amount',
          'If vendor has payment issues history, flag for manual review'
        ]
      },
      {
        category: 'Risk Management',
        rules: [
          'If similar invoice exists within 30 days, flag for duplicate review',
          'If invoice is marked urgent, expedite through fast-track approval',
          'If end of fiscal period, allow 20% higher auto-approval limits'
        ]
      },
      {
        category: 'Compliance',
        rules: [
          'If vendor is on restricted list, reject automatically',
          'If invoice lacks proper documentation, require verification',
          'If payment terms exceed 60 days, require CFO approval'
        ]
      }
    ];
    
    res.json({
      success: true,
      suggestions: commonRules,
      message: 'Common rule suggestions retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching rule suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch rule suggestions' });
  }
});

export default router;