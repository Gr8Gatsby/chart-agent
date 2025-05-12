import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentRegistry } from '../src/registry';
import type { AgentCard } from '../src/types';

describe('Agent Registry', () => {
  const mockAgentCard: AgentCard = {
    id: 'test-agent',
    name: 'Test Agent',
    endpoint: 'https://test.example.com/a2a',
    capabilities: ['test-capability'],
    description: 'A test agent for core registry testing'
  };

  let registry: AgentRegistry;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = new AgentRegistry();
  });

  describe('register', () => {
    it('should register a valid agent', () => {
      registry.register(mockAgentCard);
      const agent = registry.getById(mockAgentCard.id);
      expect(agent).toEqual(mockAgentCard);
    });

    it('should not register an agent with missing required fields', () => {
      const invalidCard = { ...mockAgentCard };
      delete (invalidCard as any).endpoint;
      
      const result = registry.register(invalidCard);
      expect(result).toBe(false);
      expect(registry.getById(mockAgentCard.id)).toBeUndefined();
    });

    it('should not register an agent with invalid endpoint', () => {
      const invalidCard = { ...mockAgentCard, endpoint: 'not-a-url' };
      
      const result = registry.register(invalidCard);
      expect(result).toBe(false);
      expect(registry.getById(mockAgentCard.id)).toBeUndefined();
    });
  });

  describe('getById', () => {
    it('should return registered agent by ID', () => {
      registry.register(mockAgentCard);
      const agent = registry.getById(mockAgentCard.id);
      expect(agent).toEqual(mockAgentCard);
    });

    it('should return undefined for non-existent agent', () => {
      const agent = registry.getById('non-existent');
      expect(agent).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return all registered agents', () => {
      const agent2 = { ...mockAgentCard, id: 'agent-2' };
      registry.register(mockAgentCard);
      registry.register(agent2);

      const agents = registry.getAll();
      expect(agents).toHaveLength(2);
      expect(agents).toContainEqual(mockAgentCard);
      expect(agents).toContainEqual(agent2);
    });

    it('should return empty array when no agents registered', () => {
      const agents = registry.getAll();
      expect(agents).toHaveLength(0);
    });
  });

  describe('findByCapability', () => {
    it('should return agents with matching capability', () => {
      const agent2 = { ...mockAgentCard, id: 'agent-2', capabilities: ['chat'] };
      registry.register(mockAgentCard);
      registry.register(agent2);

      const agents = registry.findByCapability('test-capability');
      expect(agents).toHaveLength(1);
      expect(agents[0]).toEqual(mockAgentCard);
    });

    it('should return empty array when no matching agents', () => {
      registry.register(mockAgentCard);
      const agents = registry.findByCapability('non-existent');
      expect(agents).toHaveLength(0);
    });
  });
}); 