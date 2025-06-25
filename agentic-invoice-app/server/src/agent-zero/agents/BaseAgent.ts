import { v4 as uuidv4 } from 'uuid';
import { 
  AgentConfig, 
  AgentState, 
  AgentMessage, 
  AgentContext, 
  AgentTool 
} from '../types';

export abstract class BaseAgent {
  protected config: AgentConfig;
  protected state: AgentState;
  protected messageHistory: AgentMessage[] = [];
  protected context: AgentContext | null = null;

  constructor(config: AgentConfig) {
    this.config = config;
    this.state = {
      id: uuidv4(),
      status: 'idle',
      lastActivity: new Date(),
      metadata: {}
    };
  }

  getName(): string {
    return this.config.name;
  }

  getRole(): string {
    return this.config.role;
  }

  getState(): AgentState {
    return { ...this.state };
  }

  getTools(): AgentTool[] {
    return this.config.tools;
  }

  setContext(context: AgentContext): void {
    this.context = context;
    this.updateState({ metadata: { ...this.state.metadata, context } });
  }

  protected updateState(updates: Partial<AgentState>): void {
    this.state = {
      ...this.state,
      ...updates,
      lastActivity: new Date()
    };
  }

  protected addMessage(message: Omit<AgentMessage, 'id' | 'timestamp'>): void {
    const fullMessage: AgentMessage = {
      ...message,
      id: uuidv4(),
      timestamp: new Date()
    };
    this.messageHistory.push(fullMessage);
  }

  protected async executeTool(toolName: string, params: any): Promise<any> {
    const tool = this.config.tools.find(t => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }

    this.addMessage({
      type: 'tool_use',
      content: `Using tool: ${toolName}`,
      metadata: { toolName, params }
    });

    try {
      const result = await tool.execute(params);
      
      this.addMessage({
        type: 'tool_result',
        content: `Tool ${toolName} completed`,
        metadata: { toolName, result }
      });

      return result;
    } catch (error) {
      this.addMessage({
        type: 'tool_result',
        content: `Tool ${toolName} failed: ${error}`,
        metadata: { toolName, error: error.message }
      });
      throw error;
    }
  }

  protected createSystemMessage(content: string): AgentMessage {
    return {
      id: uuidv4(),
      type: 'system',
      content,
      timestamp: new Date()
    };
  }

  protected async think(prompt: string, context?: any): Promise<string> {
    this.updateState({ status: 'thinking', currentTask: 'Processing request' });
    
    // This would integrate with your preferred LLM
    // For now, using a placeholder that can be extended
    const reasoning = await this.generateResponse(prompt, context);
    
    this.addMessage({
      type: 'assistant',
      content: reasoning,
      metadata: { context }
    });

    return reasoning;
  }

  protected abstract generateResponse(prompt: string, context?: any): Promise<string>;

  public abstract execute(task: string, context?: AgentContext): Promise<any>;

  // Method to be called when agent should learn from experience
  public async learn(experience: any): Promise<void> {
    // Base implementation - can be overridden by specific agents
    this.updateState({ 
      metadata: { 
        ...this.state.metadata, 
        learnings: [...(this.state.metadata.learnings || []), experience] 
      } 
    });
  }

  // Method to get agent's current reasoning
  public async getReasoning(): Promise<string> {
    const recentMessages = this.messageHistory.slice(-5);
    return recentMessages
      .filter(m => m.type === 'assistant')
      .map(m => m.content)
      .join('\n');
  }

  // Method to reset agent state
  public reset(): void {
    this.messageHistory = [];
    this.context = null;
    this.state = {
      id: uuidv4(),
      status: 'idle',
      lastActivity: new Date(),
      metadata: {}
    };
  }
}