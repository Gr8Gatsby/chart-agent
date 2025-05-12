import { AgentCard } from './types';

/**
 * Validate an agent card object against minimal required fields.
 * Extend this to match the full A2A spec as needed.
 */
export function validateAgentCard(card: any): card is AgentCard {
  if (
    typeof card !== 'object' ||
    typeof card.id !== 'string' ||
    typeof card.name !== 'string' ||
    typeof card.endpoint !== 'string' ||
    !Array.isArray(card.capabilities)
  ) {
    return false;
  }
  // Validate endpoint is a valid URL
  try {
    new URL(card.endpoint);
  } catch {
    return false;
  }
  return true;
}

/**
 * Fetch an agent card from a remote URL (e.g., /.well-known/agent.json)
 */
export async function fetchAgentCard(url: string): Promise<AgentCard> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch agent card from ${url}: ${res.status}`);
  }
  const card = await res.json();
  if (!validateAgentCard(card)) {
    throw new Error('Invalid agent card format');
  }
  return card;
} 