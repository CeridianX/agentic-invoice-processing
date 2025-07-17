import { AgentZeroService } from '../agent-zero/AgentZeroService';

export class AgentZeroManager {
  private static initializationPromise: Promise<AgentZeroService> | null = null;
  private static instance: AgentZeroService | null = null;

  /**
   * Get or create the Agent Zero instance with proper initialization
   * This ensures only one instance exists and initialization happens only once
   */
  public static async getOrCreateInstance(): Promise<AgentZeroService> {
    // If we already have an initialized instance, return it
    if (this.instance && this.instance.isInitialized()) {
      return this.instance;
    }

    // If initialization is already in progress, wait for it
    if (this.initializationPromise) {
      console.log('🔄 Agent Zero initialization already in progress, waiting...');
      return this.initializationPromise;
    }

    // Start initialization
    this.initializationPromise = this.initializeAgentZero();
    
    try {
      this.instance = await this.initializationPromise;
      return this.instance;
    } catch (error) {
      // Reset promise on failure so next call can retry
      this.initializationPromise = null;
      throw error;
    }
  }

  /**
   * Get the current instance without initialization (may return null)
   */
  public static getCurrentInstance(): AgentZeroService | null {
    return this.instance;
  }

  /**
   * Check if Agent Zero is ready
   */
  public static isReady(): boolean {
    return this.instance !== null && this.instance.isInitialized();
  }

  /**
   * Initialize Agent Zero service
   */
  private static async initializeAgentZero(): Promise<AgentZeroService> {
    console.log('🚀 Starting Agent Zero initialization...');
    
    try {
      // Check if global instance already exists
      const globalInstance = (global as any).agentZeroInstance;
      if (globalInstance && globalInstance.isInitialized()) {
        console.log('✅ Using existing global Agent Zero instance');
        return globalInstance;
      }

      // Create new instance
      const agentZero = AgentZeroService.getInstance();
      await agentZero.initialize();
      
      // Store in global for cross-module access
      (global as any).agentZeroInstance = agentZero;
      
      console.log('✅ Agent Zero initialization completed successfully');
      return agentZero;
    } catch (error) {
      console.error('❌ Agent Zero initialization failed:', error);
      throw error;
    }
  }

  /**
   * Reset the instance (useful for testing or reinitialization)
   */
  public static reset(): void {
    this.instance = null;
    this.initializationPromise = null;
    (global as any).agentZeroInstance = null;
  }
}