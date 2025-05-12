import { LLMClient, LLMMessage, LLMOptions } from './LLMClient';

export class OpenAIClient implements LLMClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY!;
    if (!this.apiKey) throw new Error('OPENAI_API_KEY not set');
  }

  async generate(messages: LLMMessage[], options: LLMOptions = {}): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model || 'gpt-4o',
        messages,
        max_tokens: options.maxTokens || 1024,
        ...options
      })
    });
    const data = await response.json() as any;
    if (!response.ok) throw new Error(data.error?.message || 'OpenAI API error');
    return data.choices[0].message.content;
  }
} 