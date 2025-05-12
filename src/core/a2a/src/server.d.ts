import { Request, Response } from 'express';
import { Task, Message } from './types';

export function handleSendTask(req: Request, res: Response): Promise<void>;
export function handleSendSubscribe(req: Request, res: Response): Promise<void>;
export function handleGetTask(req: Request, res: Response): Promise<void>;
export function handleSendMessage(req: Request, res: Response): Promise<void>;
export function handleCancelTask(req: Request, res: Response): Promise<void>;
export function handleGetArtifacts(req: Request, res: Response): Promise<void>;
export function handleListTasks(req: Request, res: Response): Promise<void>; 