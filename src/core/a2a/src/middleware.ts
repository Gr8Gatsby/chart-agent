import { Request, Response, NextFunction } from 'express';

/**
 * Request logger middleware.
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.path}`);
  next();
};

/**
 * Centralized error handler middleware.
 */
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  
  // Handle validation errors (check for details property)
  if ((err as any).details || err.name === 'ValidationError' || err.message.includes('validation')) {
    res.status(400).json({ 
      error: err.message,
      ...((err as any).details && { details: (err as any).details })
    });
    return;
  }
  
  // Handle errors with status code
  if ((err as any).status === 400) {
    res.status(400).json({ error: err.message });
    return;
  }
  
  // Handle other known errors
  if (err.name === 'KnownError') {
    res.status(400).json({ error: err.message });
    return;
  }
  
  // Default to 500 for unknown errors
  res.status(500).json({ error: 'Internal server error' });
}; 