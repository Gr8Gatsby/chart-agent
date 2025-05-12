import { Artifact } from './types';
import { v4 as uuidv4 } from 'uuid';

// In-memory artifact store: Map from taskId to array of artifacts
const artifactsStore = new Map<string, Artifact[]>();

/**
 * Add an artifact to a task.
 */
export async function addArtifact(taskId: string, artifact: Omit<Artifact, 'id'> & { type: string }): Promise<Artifact> {
  if (!artifact.type) throw new Error('Artifact must have a type');
  const id = uuidv4();
  const fullArtifact: Artifact = { ...artifact, id };
  const arr = artifactsStore.get(taskId) || [];
  arr.push(fullArtifact);
  artifactsStore.set(taskId, arr);
  return fullArtifact;
}

/**
 * Get all artifacts for a task.
 */
export async function getArtifactsForTask(taskId: string): Promise<Artifact[]> {
  return artifactsStore.get(taskId) || [];
}

/**
 * Get a specific artifact by ID for a task.
 */
export async function getArtifactById(taskId: string, artifactId: string): Promise<Artifact | undefined> {
  const arr = artifactsStore.get(taskId) || [];
  return arr.find(a => a.id === artifactId);
} 