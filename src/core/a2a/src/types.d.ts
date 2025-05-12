export type AgentCapability = string;
export type AgentSkill = string;

export interface AgentCard {
  id: string;
  name: string;
  description?: string;
  endpoint: string;
  capabilities: AgentCapability[];
  skills?: AgentSkill[];
  contact?: string;
  authentication?: {
    type: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export type TaskStatus = 'submitted' | 'working' | 'input-required' | 'completed' | 'failed' | 'canceled';

export interface Task {
  id: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  input: Message;
  output?: Message;
  artifacts?: Artifact[];
  [key: string]: any;
}

export interface Message {
  id: string;
  role: 'user' | 'agent';
  parts: Part[];
  [key: string]: any;
}

export type Part = TextPart | FilePart | DataPart;

export interface TextPart {
  type: 'text';
  text: string;
}

export interface FilePart {
  type: 'file';
  filename: string;
  contentType: string;
  data: string; // base64-encoded
}

export interface DataPart {
  type: 'data';
  mimeType: string;
  data: any;
}

export interface Artifact {
  id: string;
  type: string;
  url?: string;
  data?: any;
  [key: string]: any;
} 