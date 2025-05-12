// LLMClient.ts - Generic interface for LLM backends in PocketFlow

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMOptions {
  model?: string;
  maxTokens?: number;
  [key: string]: any;
}

export interface LLMClient {
  generate(messages: LLMMessage[], options?: LLMOptions): Promise<string>;
} 