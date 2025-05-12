import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction): void;
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void; 