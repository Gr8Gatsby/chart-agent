import { describe, it, expect, vi } from 'vitest';
import { validateAgentCard, fetchAgentCard } from '../src/agentCard';
import type { AgentCard } from '../src/types';

// Mock the global fetch function
vi.stubGlobal('fetch', vi.fn());

describe('Agent Card', () => {
  const validAgentCard: AgentCard = {
    id: 'agent-1',
    name: 'Test Agent',
    description: 'A test agent',
    endpoint: 'https://agent.example.com',
    capabilities: ['task', 'chat'],
    skills: ['text-generation'],
    contact: 'test@example.com',
  };

  describe('validateAgentCard', () => {
    it('should validate a correct agent card', () => {
      const result = validateAgentCard(validAgentCard);
      expect(result).toBe(true);
    });

    it('should reject an agent card with missing required fields', () => {
      const invalidCard = { ...validAgentCard };
      delete (invalidCard as any).endpoint;
      
      const result = validateAgentCard(invalidCard);
      expect(result).toBe(false);
    });

    it('should reject an agent card with invalid endpoint', () => {
      const invalidCard = { ...validAgentCard, endpoint: 'not-a-url' };
      
      const result = validateAgentCard(invalidCard);
      expect(result).toBe(false);
    });
  });

  describe('fetchAgentCard', () => {
    it('should fetch and validate an agent card', async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(validAgentCard),
      });

      const card = await fetchAgentCard('https://agent.example.com');
      expect(card).toEqual(validAgentCard);
    });

    it('should handle fetch errors', async () => {
      (fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(fetchAgentCard('https://agent.example.com')).rejects.toThrow();
    });

    it('should handle invalid response data', async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ invalid: 'data' }),
      });

      await expect(fetchAgentCard('https://agent.example.com')).rejects.toThrow();
    });
  });
}); 