import { AgentCard, AgentCapability } from './types';
import { validateAgentCard } from './agentCard';

/**
 * In-memory registry for agent cards.
 * Extend for persistent storage as needed.
 */
export class AgentRegistry {
  private agents: Map<string, AgentCard> = new Map();

  /**
   * Register a new agent card (or update if id already exists).
   */
  register(card: AgentCard): boolean {
    if (!validateAgentCard(card)) {
      return false;
    }
    this.agents.set(card.id, card);
    return true;
  }

  /**
   * Find all agents with a given capability.
   */
  findByCapability(capability: AgentCapability): AgentCard[] {
    return Array.from(this.agents.values()).filter(card =>
      card.capabilities.includes(capability)
    );
  }

  /**
   * Get all registered agent cards.
   */
  getAll(): AgentCard[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get an agent card by id.
   */
  getById(id: string): AgentCard | undefined {
    return this.agents.get(id);
  }
} 