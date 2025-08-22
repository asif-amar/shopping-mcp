import { Request, Response, NextFunction } from 'express';
import { testConnection } from '../database/connection';
import logger from '../utils/logger';

export const requireDatabase = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await testConnection();
    next();
  } catch (error) {
    logger.error(`Database connection failed in middleware: ${error instanceof Error ? error.message : String(error)}`);
    res.status(503).json({
      error: 'Database service unavailable',
      message: 'Unable to connect to database. Please try again later.'
    });
  }
};

export const attachSessionId = (req: Request, res: Response, next: NextFunction) => {
  // Extract session ID from headers or generate one
  const sessionId = req.headers['x-session-id'] as string || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Attach to request for use in routes
  (req as any).sessionId = sessionId;
  
  // Add session ID to response headers
  res.setHeader('x-session-id', sessionId);
  
  next();
};