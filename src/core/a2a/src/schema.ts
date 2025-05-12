import { z } from 'zod';

// Part schemas
export const TextPartSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
});

export const FilePartSchema = z.object({
  type: z.literal('file'),
  filename: z.string(),
  contentType: z.string(),
  data: z.string(), // base64
});

export const DataPartSchema = z.object({
  type: z.literal('data'),
  mimeType: z.string(),
  data: z.unknown(),
});

export const PartSchema = z.discriminatedUnion('type', [TextPartSchema, FilePartSchema, DataPartSchema]);

// Message schema
export const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'agent']),
  parts: z.array(PartSchema),
});

// Artifact schema
export const ArtifactSchema = z.object({
  id: z.string(),
  type: z.string(),
  url: z.string().optional(),
  data: z.unknown().optional(),
});

// Task schema
export const TaskSchema = z.object({
  id: z.string(),
  status: z.enum(['submitted', 'working', 'input-required', 'completed', 'failed', 'canceled']),
  createdAt: z.string(),
  updatedAt: z.string(),
  input: MessageSchema,
  output: MessageSchema.optional(),
  artifacts: z.array(ArtifactSchema).optional(),
});

// AgentCard schema
export const AgentCardSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  endpoint: z.string(),
  capabilities: z.array(z.string()),
  skills: z.array(z.string()).optional(),
  contact: z.string().optional(),
  authentication: z.object({
    type: z.string(),
  }).catchall(z.unknown()).optional(),
}).catchall(z.unknown());

// Validation helpers
export function validateAgentCard(card: unknown) {
  return AgentCardSchema.safeParse(card);
}
export function validateTask(task: unknown) {
  return TaskSchema.safeParse(task);
}
export function validateMessage(msg: unknown) {
  return MessageSchema.safeParse(msg);
}
export function validatePart(part: unknown) {
  return PartSchema.safeParse(part);
}
export function validateArtifact(artifact: unknown) {
  return ArtifactSchema.safeParse(artifact);
} 